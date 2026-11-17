using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Constants;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

public sealed class ParentCommerceRepository(ApplicationDbContext db) : IParentCommerceRepository
{
    private IQueryable<Course> Courses() => db.Courses.AsNoTracking()
        .Where(c => c.Status == CourseStatuses.Published || c.Status == CourseStatuses.Active);
    private static readonly Expression<Func<Course, ParentCourseDto>> CourseSummary = c =>
        new ParentCourseDto(c.CourseId, c.CourseCode, c.Name, c.Description, c.LevelCode, c.TuitionVnd,
            c.Lessons.Count(l => !l.IsDeleted), c.Classes.Count(cl => cl.Status == "Open"));

    public async Task<IReadOnlyList<ParentCourseDto>> Catalogue(CancellationToken ct) =>
        await Courses().OrderBy(c => c.Name).Select(CourseSummary).ToListAsync(ct);

    public async Task<ParentCourseDetailDto?> Course(int courseId, CancellationToken ct)
    {
        var course = await Courses().Where(c => c.CourseId == courseId).Select(CourseSummary).SingleOrDefaultAsync(ct);
        if (course is null) return null;
        var objectives = await db.Courses.Where(c => c.CourseId == courseId).Select(c => c.LearningObjectives).SingleAsync(ct);
        var lessons = await db.Lessons.AsNoTracking().Where(l => l.CourseId == courseId && !l.IsDeleted)
            .OrderBy(l => l.OrderNo).ThenBy(l => l.LessonId)
            .Select(l => new ParentCourseLessonDto(l.LessonId, l.OrderNo, l.Title)).ToListAsync(ct);
        var localNow = DateTime.UtcNow.AddHours(7);
        var today = DateOnly.FromDateTime(localNow);
        var time = TimeOnly.FromDateTime(localNow);
        var rows = await db.Classes.AsNoTracking().Where(c => c.CourseId == courseId && (c.Status == "Open" || c.Status == "Planned"))
            .OrderBy(c => c.StartDate).ThenBy(c => c.ClassCode)
            .Select(c => new
            {
                c.ClassId, c.ClassCode, c.Name, c.Status, c.StartDate, c.EndDate,
                TeacherName = c.Teacher == null ? null : c.Teacher.User.FullName,
                Schedule = c.ClassSessions.Where(s => s.Status == "Scheduled" &&
                        (s.SessionDate > today || (s.SessionDate == today && s.EndTime > time)))
                    .OrderBy(s => s.SessionDate).ThenBy(s => s.StartTime).ThenBy(s => s.SessionId)
                    .Select(s => new ParentCourseSessionDto(s.SessionId,
                        s.Lesson == null || s.Lesson.IsDeleted ? "Buổi học" : s.Lesson.Title,
                        s.SessionDate, s.StartTime, s.EndTime)).ToList()
            }).ToListAsync(ct);
        return new(course, objectives, lessons, rows.Select(c =>
        {
            var next = c.Schedule.FirstOrDefault();
            return new ParentClassOfferDto(c.ClassId, c.ClassCode, c.Name, c.Status, c.StartDate, c.EndDate,
                c.TeacherName, next?.Date, next?.StartsAt, next?.EndsAt, c.Schedule);
        }).ToArray());
    }

    private IQueryable<int> LinkedStudents(int parentId) => db.ParentStudentLinks
        .Where(link => link.ParentId == parentId && link.Status == "Active").Select(link => link.StudentId);

    public async Task<IReadOnlyList<ParentCourseRequestDto>> Requests(int parentId, int studentId, CancellationToken ct) =>
        await db.ParentCourseRequests.AsNoTracking().Where(r => r.ParentId == parentId && r.StudentId == studentId &&
                LinkedStudents(parentId).Contains(r.StudentId))
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new ParentCourseRequestDto(r.RequestId, r.ClassId, r.Class.ClassCode, r.Class.Course.Name,
                r.Status, r.RequestedAt)).ToListAsync(ct);

    public async Task<bool> Register(int parentId, int studentId, int classId, CancellationToken ct) =>
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT dbo.ParentCourseRequests(ParentId, StudentId, ClassId)
            SELECT {parentId}, {studentId}, c.ClassId
            FROM dbo.Classes c JOIN dbo.Courses course ON course.CourseId = c.CourseId
            WHERE c.ClassId = {classId} AND c.Status = N'Open' AND course.Status IN (N'Published', N'Active')
              AND EXISTS (SELECT 1 FROM dbo.ParentStudentLinks WITH (HOLDLOCK)
                          WHERE ParentId = {parentId} AND StudentId = {studentId} AND Status = N'Active')
              AND NOT EXISTS (SELECT 1 FROM dbo.Enrollments WITH (HOLDLOCK) WHERE StudentId = {studentId}
                              AND ClassId = c.ClassId AND Status IN (N'Active', N'Completed'))
              AND NOT EXISTS (SELECT 1 FROM dbo.ParentCourseRequests WITH (UPDLOCK, HOLDLOCK)
                              WHERE StudentId = {studentId} AND ClassId = c.ClassId)
            """, ct) == 1;

    private IQueryable<ParentPayment> PaymentRows(int parentId, int studentId) => db.ParentPayments.AsNoTracking()
        .Where(p => p.ParentId == parentId && p.StudentId == studentId && LinkedStudents(parentId).Contains(p.StudentId));
    private static readonly Expression<Func<ParentPayment, ParentPaymentDto>> PaymentSummary = p =>
        new ParentPaymentDto(p.PaymentId, p.Reference, p.InvoiceNumber, p.Course.Name, p.AmountVnd,
            p.Status, p.CreatedAt, p.PaidAt, p.Refund == null ? null : p.Refund.Status,
            p.Refund == null ? null : p.Refund.Reason, p.Refund == null ? null : p.Refund.RequestedAt);

    public async Task<IReadOnlyList<ParentPaymentDto>> Payments(int parentId, int studentId, CancellationToken ct) =>
        await PaymentRows(parentId, studentId).OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.PaymentId)
            .Select(PaymentSummary).ToListAsync(ct);

    public Task<ParentPaymentDto?> Payment(int parentId, int studentId, int paymentId, CancellationToken ct) =>
        PaymentRows(parentId, studentId).Where(p => p.PaymentId == paymentId).Select(PaymentSummary).SingleOrDefaultAsync(ct);

    public async Task<bool> Refund(int parentId, int studentId, int paymentId, string reason, CancellationToken ct) =>
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT dbo.ParentRefundRequests(PaymentId, Reason)
            SELECT p.PaymentId, {reason}
            FROM dbo.ParentPayments p WITH (HOLDLOCK)
            WHERE p.PaymentId = {paymentId} AND p.ParentId = {parentId} AND p.StudentId = {studentId}
              AND p.Status = N'Paid' AND p.AmountVnd > 0
              AND EXISTS (SELECT 1 FROM dbo.ParentStudentLinks WITH (HOLDLOCK)
                          WHERE ParentId = {parentId} AND StudentId = {studentId} AND Status = N'Active')
              AND NOT EXISTS (SELECT 1 FROM dbo.ParentRefundRequests WITH (UPDLOCK, HOLDLOCK) WHERE PaymentId = p.PaymentId)
            """, ct) == 1;
}
