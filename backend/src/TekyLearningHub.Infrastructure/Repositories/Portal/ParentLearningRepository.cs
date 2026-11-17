using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Enums;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

public sealed class ParentLearningRepository(ApplicationDbContext db) : IParentLearningRepository
{
    public async Task<IReadOnlyList<ParentChildDto>> Children(int parentId, CancellationToken ct) =>
        await db.ParentStudentLinks.AsNoTracking()
            .Where(link => link.ParentId == parentId && link.Status == "Active" &&
                link.Parent.User.Status == "Active" && link.Student.User.Status == "Active" &&
                link.Parent.User.RoleAssignments.Any(r => r.RoleId == (byte)UserRole.Parent && r.RevokedAt == null) &&
                link.Student.User.RoleAssignments.Any(r => r.RoleId == (byte)UserRole.Student && r.RevokedAt == null))
            .OrderBy(link => link.Student.User.FullName).ThenBy(link => link.StudentId)
            .Select(link => new ParentChildDto(link.StudentId, link.Student.StudentCode, link.Student.User.FullName,
                link.Relationship, link.Student.GradeLevel, link.Student.SchoolName)).ToListAsync(ct);

    private IQueryable<int> ClassIds(int studentId) => db.Enrollments
        .Where(e => e.StudentId == studentId && (e.Status == "Active" || e.Status == "Completed"))
        .Select(e => e.ClassId);

    public async Task<IReadOnlyList<ParentLessonDto>> Lessons(int studentId, CancellationToken ct)
    {
        var courseIds = db.Classes.Where(c => ClassIds(studentId).Contains(c.ClassId)).Select(c => c.CourseId);
        return await (
            from l in db.Lessons.AsNoTracking()
            where !l.IsDeleted && courseIds.Contains(l.CourseId)
            join p in db.LessonProgresses.AsNoTracking().Where(p => p.StudentId == studentId)
                on l.LessonId equals p.LessonId into progress
            from p in progress.DefaultIfEmpty()
            orderby l.Course.Name, l.OrderNo, l.LessonId
            select new ParentLessonDto(l.CourseId, l.Course.Name, l.LessonId, l.OrderNo, l.Title,
                p == null ? null : p.ViewedAt, p == null ? null : p.CompletedAt)).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ParentAttendanceDto>> Attendance(int studentId, CancellationToken ct) =>
        await db.AttendanceRecords.AsNoTracking().Where(a => a.StudentId == studentId &&
                ClassIds(studentId).Contains(a.Session.ClassId) && a.Session.Status != "Cancelled")
            .OrderByDescending(a => a.Session.SessionDate).ThenByDescending(a => a.Session.StartTime)
            .Select(a => new ParentAttendanceDto(a.SessionId, a.Session.Class.ClassCode,
                a.Session.Lesson == null ? "Buổi học" : a.Session.Lesson!.Title, a.Status, a.AbsenceReason,
                a.Session.SessionDate, a.Session.StartTime, a.Session.EndTime)).ToListAsync(ct);

    public async Task<IReadOnlyList<ParentAssessmentRow>> Assessments(int studentId, CancellationToken ct) =>
        await (from attempt in db.AssessmentAttempts.AsNoTracking()
               join assessment in db.Assessments.AsNoTracking() on attempt.AssessmentId equals assessment.AssessmentId
               where attempt.StudentId == studentId && attempt.SubmittedAt.HasValue && attempt.CorrectCount.HasValue &&
                   assessment.IsPublished && ClassIds(studentId).Contains(assessment.ClassId)
               select new ParentAssessmentRow(assessment.AssessmentId, assessment.Title, assessment.Class.ClassCode,
                   attempt.SubmittedAt!.Value, attempt.CorrectCount!.Value, attempt.QuestionsSnapshot)).ToListAsync(ct);

    public async Task<IReadOnlyList<ParentTeacherDto>> Teachers(int studentId, CancellationToken ct) =>
        await db.TeacherProfiles.AsNoTracking().Where(t => t.User.Status == "Active" &&
            t.User.RoleAssignments.Any(r => r.RoleId == (byte)UserRole.Teacher && r.RevokedAt == null) &&
            t.Classes.Any(c => c.Enrollments.Any(e => e.StudentId == studentId && e.Status == "Active")))
            .OrderBy(t => t.User.FullName)
            .Select(t => new ParentTeacherDto(t.UserId, t.User.FullName, t.Specialty, t.Bio)).ToListAsync(ct);
}
