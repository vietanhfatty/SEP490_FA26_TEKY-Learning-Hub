using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Domain.Constants;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Admin;

public sealed class CourseRepository(ApplicationDbContext db) : ICourseRepository
{
    public async Task<CoursePageDto> List(string? status, string? keyword, int skip, int take, bool isGlobal, int[] departmentIds, CancellationToken cancellationToken)
    {
        var query = db.Courses.AsNoTracking();
        if (!isGlobal) query = query.Where(course => course.DepartmentId.HasValue && departmentIds.Contains(course.DepartmentId.Value));

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
                c.CreatedAt, c.DepartmentId))
            .ToListAsync(cancellationToken);

        return new CoursePageDto(total, items);
    }
    public Task<Course?> FindCourse(int id, CancellationToken ct) => db.Courses.Include(c => c.Classes).Include(c => c.Lessons.Where(l => !l.IsDeleted)).ThenInclude(l => l.LessonMaterials).AsSplitQuery().SingleOrDefaultAsync(c => c.CourseId == id, ct);
    public async Task<bool> IsApproved(int courseId, CancellationToken ct) =>
        await db.Database.SqlQuery<int>($"""
            SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.CourseApprovals
                WHERE CourseId={courseId} AND ReviewStatus=N'Approved') THEN 1 ELSE 0 END AS int) Value
            """).SingleAsync(ct) == 1;
    public Task<bool> DepartmentExists(int id, CancellationToken ct) => db.Departments.AnyAsync(department => department.DepartmentId == id && department.IsActive, ct);
    public Task<CourseDepartmentDto[]> Departments(bool isGlobal, int[] departmentIds, CancellationToken ct) => db.Departments.AsNoTracking()
        .Where(department => department.IsActive && (isGlobal || departmentIds.Contains(department.DepartmentId)))
        .OrderBy(department => department.Name).Select(department => new CourseDepartmentDto(department.DepartmentId, department.Name)).ToArrayAsync(ct);
    public Task<Lesson?> FindLesson(int courseId, int lessonId, CancellationToken ct) => db.Lessons.SingleOrDefaultAsync(l => l.CourseId == courseId && l.LessonId == lessonId, ct);
    public Task<Lesson> LoadLesson(int id, CancellationToken ct) => db.Lessons.Include(l => l.LessonMaterials).SingleAsync(l => l.LessonId == id, ct);
    public Task<List<Lesson>> Lessons(int id, CancellationToken ct) => db.Lessons.Where(l => l.CourseId == id && !l.IsDeleted).ToListAsync(ct);
    public Task<bool> HasLessons(int id, CancellationToken ct) => db.Lessons.AnyAsync(l => l.CourseId == id && !l.IsDeleted, ct);
    public Task<LessonMaterial?> FindMaterial(int courseId, int lessonId, int materialId, CancellationToken ct) => db.LessonMaterials.SingleOrDefaultAsync(m => m.MaterialId == materialId && m.Lesson.LessonId == lessonId && m.Lesson.CourseId == courseId, ct);
    public Task<List<LessonMaterial>> Materials(int lessonId, CancellationToken ct) => db.LessonMaterials.Where(m => m.LessonId == lessonId).ToListAsync(ct);
    public void AddCourse(Course entity) => db.Courses.Add(entity);
    public void AddLesson(Lesson entity) => db.Lessons.Add(entity);
    public void AddMaterial(LessonMaterial entity) => db.LessonMaterials.Add(entity);
    public void RemoveMaterial(LessonMaterial entity) => db.LessonMaterials.Remove(entity);
    public void AddAudit(AuditLog entity) => db.AuditLogs.Add(entity);
}
