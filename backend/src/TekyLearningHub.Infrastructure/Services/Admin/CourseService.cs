using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Domain.Constants;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Infrastructure.Services.Admin;

/// <summary>
/// Quản lý khóa học, bài học và học liệu dành cho role admin.
/// Mọi thao tác xoá đều là soft delete để giữ lịch sử lớp học, bài tập và điểm số.
/// </summary>
public class CourseService(IApplicationDbContext db) : ICourseService
{
    private static readonly string[] MaterialTypes = ["Slide", "Document", "AssemblyGuide", "Video"];

    public async Task<CoursePageDto> ListAsync(string? status, string? keyword, int skip, int take,
        CancellationToken cancellationToken)
    {
        var query = db.Courses.AsNoTracking();

        var normalizedStatus = CourseStatuses.Normalize(status);
        if (normalizedStatus is not null) query = query.Where(c => c.Status == normalizedStatus);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var term = keyword.Trim();
            query = query.Where(c => c.Name.Contains(term) || c.CourseCode.Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(c => c.CourseCode)
            .Skip(Math.Max(0, skip))
            .Take(Math.Clamp(take <= 0 ? 50 : take, 1, 200))
            .Select(c => new CourseSummaryDto(
                c.CourseId, c.CourseCode, c.Name, c.LevelCode, c.Status,
                c.Lessons.Count(l => !l.IsDeleted),
                c.Classes.Count,
                c.CreatedAt))
            .ToListAsync(cancellationToken);

        return new CoursePageDto(total, items);
    }

    public async Task<CourseDetailDto?> GetAsync(int courseId, CancellationToken cancellationToken)
    {
        var course = await db.Courses.AsNoTracking()
            .Include(c => c.Lessons.Where(l => !l.IsDeleted).OrderBy(l => l.OrderNo))
                .ThenInclude(l => l.LessonMaterials.OrderBy(m => m.SortOrder))
            .AsSplitQuery()
            .SingleOrDefaultAsync(c => c.CourseId == courseId, cancellationToken);
        if (course is null) return null;

        var classCount = await db.Courses.AsNoTracking()
            .Where(c => c.CourseId == courseId)
            .Select(c => c.Classes.Count)
            .SingleAsync(cancellationToken);

        return MapDetail(course, classCount);
    }

    public async Task<CourseOperationResult<CourseDetailDto>> CreateAsync(CourseUpsertRequest request, int actorUserId,
        string? ipAddress, CancellationToken cancellationToken)
    {
        var code = request.CourseCode.Trim();
        var name = request.Name.Trim();
        if (code.Length is < 3 or > 20) return CourseOperationResult<CourseDetailDto>.Fail("Mã khóa học phải có từ 3 đến 20 ký tự.");
        if (name.Length is 0 or > 200) return CourseOperationResult<CourseDetailDto>.Fail("Tên khóa học không được để trống.");

        var status = CourseStatuses.Normalize(request.Status) ?? CourseStatuses.Draft;
        if (request.Status is not null && CourseStatuses.Normalize(request.Status) is null)
            return CourseOperationResult<CourseDetailDto>.Fail("Trạng thái khóa học không hợp lệ.");

        var course = new Course
        {
            CourseCode = code,
            Name = name,
            Description = request.Description?.Trim(),
            LevelCode = request.LevelCode?.Trim(),
            Status = status,
            CreatedBy = actorUserId,
            CreatedAt = DateTime.UtcNow
        };

        db.Courses.Add(course);

        var saved = await SaveAsync(cancellationToken);
        if (!saved.Succeeded) return CourseOperationResult<CourseDetailDto>.Fail(saved.Error ?? "Không lưu được thay đổi.", saved.StatusCode);

        // Khóa chính chỉ có ID sau khi lưu, nên ghi audit log ở lượt save kế tiếp.
        AddAudit(actorUserId, "COURSE_CREATED", "Course", course.CourseId.ToString(), null, Describe(course), ipAddress);
        await CommitAuditAsync(cancellationToken);

        var detail = await GetAsync(course.CourseId, cancellationToken);
        return detail is null
            ? CourseOperationResult<CourseDetailDto>.Fail("Không thể tải khóa học vừa tạo.", 503)
            : CourseOperationResult<CourseDetailDto>.Success(detail);
    }

    public async Task<CourseOperationResult<CourseDetailDto>> UpdateAsync(int courseId, CourseUpsertRequest request,
        int actorUserId, string? ipAddress, CancellationToken cancellationToken)
    {
        var course = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == courseId, cancellationToken);
        if (course is null) return CourseOperationResult<CourseDetailDto>.Fail("Không tìm thấy khóa học.", 404);

        var code = request.CourseCode.Trim();
        var name = request.Name.Trim();
        if (code.Length is < 3 or > 20) return CourseOperationResult<CourseDetailDto>.Fail("Mã khóa học phải có từ 3 đến 20 ký tự.");
        if (name.Length is 0 or > 200) return CourseOperationResult<CourseDetailDto>.Fail("Tên khóa học không được để trống.");

        var oldValue = Describe(course);

        course.CourseCode = code;
        course.Name = name;
        course.Description = request.Description?.Trim();
        course.LevelCode = request.LevelCode?.Trim();

        // Trạng thái có thể được đổi kèm trong lúc sửa, nhưng vẫn phải đi qua quy tắc nghiệp vụ.
        var requestedStatus = CourseStatuses.Normalize(request.Status);
        if (request.Status is not null && requestedStatus is null)
            return CourseOperationResult<CourseDetailDto>.Fail("Trạng thái khóa học không hợp lệ.");

        if (requestedStatus is not null && requestedStatus != course.Status)
        {
            if (requestedStatus == CourseStatuses.Published)
            {
                var hasLessons = await db.Lessons.AnyAsync(l => l.CourseId == courseId && !l.IsDeleted, cancellationToken);
                if (!hasLessons)
                    return CourseOperationResult<CourseDetailDto>.Fail("Khóa học cần ít nhất một bài học trước khi xuất bản.", 409);
            }

            var previousStatus = course.Status;
            course.Status = requestedStatus;
            AddAudit(actorUserId, "COURSE_STATUS_CHANGED", "Course", courseId.ToString(), previousStatus, requestedStatus, ipAddress);
        }

        AddAudit(actorUserId, "COURSE_UPDATED", "Course", courseId.ToString(), oldValue, Describe(course), ipAddress);

        var saved = await SaveAsync(cancellationToken);
        if (!saved.Succeeded) return CourseOperationResult<CourseDetailDto>.Fail(saved.Error ?? "Không lưu được thay đổi.", saved.StatusCode);

        var detail = await GetAsync(courseId, cancellationToken);
        return detail is null
            ? CourseOperationResult<CourseDetailDto>.Fail("Không thể tải khóa học vừa cập nhật.", 503)
            : CourseOperationResult<CourseDetailDto>.Success(detail);
    }

    public async Task<CourseOperationResult<CourseDetailDto>> ChangeStatusAsync(int courseId, string status,
        int actorUserId, string? ipAddress, CancellationToken cancellationToken)
    {
        var normalized = CourseStatuses.Normalize(status);
        if (normalized is null)
            return CourseOperationResult<CourseDetailDto>.Fail("Trạng thái khóa học không hợp lệ.");

        var course = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == courseId, cancellationToken);
        if (course is null) return CourseOperationResult<CourseDetailDto>.Fail("Không tìm thấy khóa học.", 404);

        if (normalized == CourseStatuses.Published)
        {
            var hasLessons = await db.Lessons.AnyAsync(l => l.CourseId == courseId && !l.IsDeleted, cancellationToken);
            if (!hasLessons)
                return CourseOperationResult<CourseDetailDto>.Fail("Khóa học cần ít nhất một bài học trước khi xuất bản.", 409);
        }

        var oldStatus = course.Status;
        if (oldStatus == normalized)
        {
            var unchanged = await GetAsync(courseId, cancellationToken);
            return unchanged is null
                ? CourseOperationResult<CourseDetailDto>.Fail("Không tìm thấy khóa học.", 404)
                : CourseOperationResult<CourseDetailDto>.Success(unchanged);
        }

        course.Status = normalized;
        AddAudit(actorUserId, "COURSE_STATUS_CHANGED", "Course", courseId.ToString(), oldStatus, normalized, ipAddress);

        var saved = await SaveAsync(cancellationToken);
        if (!saved.Succeeded) return CourseOperationResult<CourseDetailDto>.Fail(saved.Error ?? "Không lưu được thay đổi.", saved.StatusCode);

        var detail = await GetAsync(courseId, cancellationToken);
        return detail is null
            ? CourseOperationResult<CourseDetailDto>.Fail("Không thể tải khóa học vừa cập nhật.", 503)
            : CourseOperationResult<CourseDetailDto>.Success(detail);
    }

    public async Task<CourseOperationResult<CourseDetailDto>> ArchiveAsync(int courseId, int actorUserId,
        string? ipAddress, CancellationToken cancellationToken)
    {
        var course = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == courseId, cancellationToken);
        if (course is null) return CourseOperationResult<CourseDetailDto>.Fail("Không tìm thấy khóa học.", 404);

        var oldStatus = course.Status;
        course.Status = CourseStatuses.Archived;

        var lessons = await db.Lessons.Where(l => l.CourseId == courseId && !l.IsDeleted).ToListAsync(cancellationToken);
        foreach (var lesson in lessons) lesson.IsDeleted = true;

        AddAudit(actorUserId, "COURSE_ARCHIVED", "Course", courseId.ToString(), oldStatus, CourseStatuses.Archived, ipAddress);

        var saved = await SaveAsync(cancellationToken);
        if (!saved.Succeeded) return CourseOperationResult<CourseDetailDto>.Fail(saved.Error ?? "Không lưu được thay đổi.", saved.StatusCode);

        var detail = await GetAsync(courseId, cancellationToken);
        return detail is null
            ? CourseOperationResult<CourseDetailDto>.Fail("Không thể tải khóa học vừa lưu trữ.", 503)
            : CourseOperationResult<CourseDetailDto>.Success(detail);
    }

    public async Task<CourseOperationResult<LessonDto>> UpsertLessonAsync(int courseId, int? lessonId,
        LessonUpsertRequest request, int actorUserId, string? ipAddress, CancellationToken cancellationToken)
    {
        var course = await db.Courses.SingleOrDefaultAsync(c => c.CourseId == courseId, cancellationToken);
        if (course is null) return CourseOperationResult<LessonDto>.Fail("Không tìm thấy khóa học.", 404);

        var title = request.Title.Trim();
        if (title.Length is 0 or > 200)
            return CourseOperationResult<LessonDto>.Fail("Tiêu đề bài học phải có từ 1 đến 200 ký tự.");

        var materials = request.Materials ?? [];
        foreach (var material in materials)
        {
            if (!MaterialTypes.Contains(material.MaterialType, StringComparer.OrdinalIgnoreCase))
                return CourseOperationResult<LessonDto>.Fail("Loại học liệu không hợp lệ. Chỉ nhận Slide, Document, AssemblyGuide hoặc Video.");
            if (string.IsNullOrWhiteSpace(material.Title))
                return CourseOperationResult<LessonDto>.Fail("Tên học liệu không được để trống.");
            if (string.IsNullOrWhiteSpace(material.FileUrl))
                return CourseOperationResult<LessonDto>.Fail("Đường dẫn học liệu không được để trống.");
        }

        Lesson lesson;
        string action;
        if (lessonId is null)
        {
            lesson = new Lesson
            {
                CourseId = courseId,
                Title = title,
                Content = request.Content?.Trim(),
                OrderNo = request.OrderNo,
                IsDeleted = false
            };
            db.Lessons.Add(lesson);
            action = "LESSON_CREATED";
        }
        else
        {
            var existing = await db.Lessons.SingleOrDefaultAsync(l => l.LessonId == lessonId && l.CourseId == courseId,
                cancellationToken);
            if (existing is null) return CourseOperationResult<LessonDto>.Fail("Không tìm thấy bài học.", 404);
            lesson = existing;

            lesson.Title = title;
            lesson.Content = request.Content?.Trim();
            lesson.OrderNo = request.OrderNo;
            lesson.IsDeleted = false;
            action = "LESSON_UPDATED";
        }

        var materialError = await SyncMaterialsAsync(lesson, materials, cancellationToken);
        if (materialError is not null) return CourseOperationResult<LessonDto>.Fail(materialError);

        var saved = await SaveAsync(cancellationToken);
        if (!saved.Succeeded)
            return CourseOperationResult<LessonDto>.Fail(saved.Error ?? "Không lưu được bài học.", saved.StatusCode);

        // Khóa chính chỉ có ID sau khi lưu, nên ghi audit log ở lượt save kế tiếp.
        AddAudit(actorUserId, action, "Lesson", lesson.LessonId.ToString(), null, title, ipAddress);
        await CommitAuditAsync(cancellationToken);

        var stored = await db.Lessons.AsNoTracking()
            .Include(l => l.LessonMaterials.OrderBy(m => m.SortOrder))
            .SingleAsync(l => l.LessonId == lesson.LessonId, cancellationToken);
        return CourseOperationResult<LessonDto>.Success(MapLesson(stored));
    }

    public async Task<CourseOperationResult<bool>> DeleteLessonAsync(int courseId, int lessonId, int actorUserId,
        string? ipAddress, CancellationToken cancellationToken)
    {
        var lesson = await db.Lessons.SingleOrDefaultAsync(l => l.LessonId == lessonId && l.CourseId == courseId,
            cancellationToken);
        if (lesson is null) return CourseOperationResult<bool>.Fail("Không tìm thấy bài học.", 404);
        if (lesson.IsDeleted) return CourseOperationResult<bool>.Success(true);

        lesson.IsDeleted = true;
        AddAudit(actorUserId, "LESSON_DELETED", "Lesson", lessonId.ToString(), lesson.Title, null, ipAddress);

        var saved = await SaveAsync(cancellationToken);
        return saved.Succeeded
            ? CourseOperationResult<bool>.Success(true)
            : CourseOperationResult<bool>.Fail(saved.Error ?? "Không lưu được thay đổi.", saved.StatusCode);
    }

    public async Task<CourseOperationResult<bool>> DeleteMaterialAsync(int courseId, int lessonId, int materialId,
        int actorUserId, string? ipAddress, CancellationToken cancellationToken)
    {
        var material = await db.LessonMaterials
            .SingleOrDefaultAsync(m => m.MaterialId == materialId && m.Lesson.LessonId == lessonId && m.Lesson.CourseId == courseId,
                cancellationToken);
        if (material is null) return CourseOperationResult<bool>.Fail("Không tìm thấy học liệu.", 404);

        db.LessonMaterials.Remove(material);
        AddAudit(actorUserId, "MATERIAL_DELETED", "LessonMaterial", materialId.ToString(), material.Title, null, ipAddress);

        var saved = await SaveAsync(cancellationToken);
        return saved.Succeeded
            ? CourseOperationResult<bool>.Success(true)
            : CourseOperationResult<bool>.Fail(saved.Error ?? "Không lưu được thay đổi.", saved.StatusCode);
    }

    /// <summary>
    /// Đồng bộ học liệu của bài học: thêm mới, cập nhật và xoá vật lý các bản ghi không còn trong danh sách.
    /// Trả về thông điệp lỗi nếu dữ liệu không hợp lệ.
    /// </summary>
    private async Task<string?> SyncMaterialsAsync(Lesson lesson, IReadOnlyList<LessonMaterialUpsertRequest> materials,
        CancellationToken cancellationToken)
    {
        var existing = await db.LessonMaterials
            .Where(m => m.LessonId == lesson.LessonId)
            .ToListAsync(cancellationToken);

        var keep = new HashSet<int>();
        foreach (var item in materials)
        {
            LessonMaterial? target = null;
            if (item.MaterialId is int materialId)
            {
                target = existing.FirstOrDefault(m => m.MaterialId == materialId);
                if (target is null)
                    return "Học liệu không thuộc bài học này.";
            }

            if (target is null)
            {
                // Gán navigation property để EF sinh INSERT Lessons trước INSERT LessonMaterials.
                target = new LessonMaterial { Lesson = lesson };
                db.LessonMaterials.Add(target);
            }

            target.MaterialType = item.MaterialType;
            target.Title = item.Title.Trim();
            target.FileUrl = item.FileUrl.Trim();
            target.IsDownloadable = item.IsDownloadable;
            target.SortOrder = item.SortOrder;
            keep.Add(target.MaterialId);
        }

        foreach (var stale in existing.Where(m => !keep.Contains(m.MaterialId)))
            db.LessonMaterials.Remove(stale);

        return null;
    }

    /// <summary>
    /// Lưu các bản ghi audit đã thêm vào change tracker.
    /// </summary>
    private async Task CommitAuditAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            // Audit log không được làm thất bại thao tác nghiệp vụ đã thành công.
        }
    }

    private async Task<CourseOperationResult<bool>> SaveAsync(CancellationToken cancellationToken)    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return CourseOperationResult<bool>.Success(true);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return CourseOperationResult<bool>.Fail("Mã khóa học đã tồn tại.", 409);
        }
    }

    private void AddAudit(int actorUserId, string action, string entityType, string? entityId, string? oldValue,
        string? newValue, string? ipAddress)
    {
        db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = actorUserId,
            ActorType = AuditActorTypes.User,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValue = Truncate(oldValue),
            NewValue = Truncate(newValue),
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        });
    }

    private static string? Truncate(string? value) =>
        value is not null && value.Length > 400 ? value[..400] : value;

    private static string Describe(Course course) =>
        $"{course.CourseCode}|{course.Name}|{course.Status}";

    private static LessonDto MapLesson(Lesson lesson) => new(
        lesson.LessonId,
        lesson.OrderNo,
        lesson.Title,
        lesson.Content,
        lesson.LessonMaterials
            .OrderBy(m => m.SortOrder)
            .Select(m => new LessonMaterialDto(m.MaterialId, m.MaterialType, m.Title, m.FileUrl, m.IsDownloadable, m.SortOrder))
            .ToList());

    private static CourseDetailDto MapDetail(Course course, int classCount) => new(
        course.CourseId,
        course.CourseCode,
        course.Name,
        course.Description,
        course.LevelCode,
        course.Status,
        classCount,
        course.CreatedAt,
        course.Lessons
            .Where(l => !l.IsDeleted)
            .OrderBy(l => l.OrderNo)
            .Select(MapLesson)
            .ToList());
}
