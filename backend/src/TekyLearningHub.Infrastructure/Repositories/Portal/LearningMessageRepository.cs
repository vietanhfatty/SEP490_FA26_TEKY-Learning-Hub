using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Domain.Enums;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

public sealed class LearningMessageRepository(ApplicationDbContext db) : ILearningMessageRepository
{
    private sealed class Contact
    {
        public int ParentId { get; init; }
        public int StudentId { get; init; }
        public int TeacherId { get; init; }
        public string ParentName { get; init; } = null!;
        public string StudentName { get; init; } = null!;
        public string TeacherName { get; init; } = null!;
        public string? Specialty { get; init; }
        public string? Bio { get; init; }
    }

    private IQueryable<Contact> Contacts() =>
        from link in db.ParentStudentLinks.AsNoTracking()
        join e in db.Enrollments on link.StudentId equals e.StudentId
        let teacher = e.Class.Teacher
        where link.Status == "Active" && link.Parent.User.Status == "Active" && link.Student.User.Status == "Active"
            && link.Parent.User.RoleAssignments.Any(r => r.RoleId == (byte)UserRole.Parent && r.RevokedAt == null)
            && link.Student.User.RoleAssignments.Any(r => r.RoleId == (byte)UserRole.Student && r.RevokedAt == null)
            && e.Status == "Active" && e.Class.Status != "Completed" && e.Class.Status != "Closed"
            && teacher != null && teacher.User.Status == "Active"
            && teacher.User.RoleAssignments.Any(r => r.RoleId == (byte)UserRole.Teacher && r.RevokedAt == null)
        select new Contact {
            ParentId = link.ParentId, StudentId = link.StudentId, TeacherId = teacher!.UserId,
            ParentName = link.Parent.User.FullName, StudentName = link.Student.User.FullName,
            TeacherName = teacher.User.FullName, Specialty = teacher.Specialty, Bio = teacher.Bio
        };

    private IQueryable<Contact> Scope(int actor, LearningThread thread) => Contacts().Where(c =>
        (c.ParentId == actor || c.TeacherId == actor) && c.ParentId == thread.ParentId &&
        c.StudentId == thread.StudentId && c.TeacherId == thread.TeacherId);

    public Task<bool> HasAccess(int actor, LearningThread thread, CancellationToken ct) => Scope(actor, thread).AnyAsync(ct);

    public async Task<IReadOnlyList<LearningContactDto>> Inbox(int actor, bool teacher, CancellationToken ct)
    {
        var query = Contacts().Where(c => teacher ? c.TeacherId == actor : c.ParentId == actor);
        if (teacher) query = query.Where(c => db.ParentTeacherMessages.Any(m => m.TeacherId == actor &&
            m.StudentId == c.StudentId && m.ParentId == c.ParentId));
        return await query.Distinct().OrderBy(c => c.StudentName).ThenBy(c => c.TeacherName).ThenBy(c => c.ParentName)
            .Select(c => new LearningContactDto(c.ParentId, c.StudentId, c.TeacherId, c.ParentName, c.StudentName,
                c.TeacherName, c.Specialty, c.Bio, db.ParentTeacherMessages.Count(m => m.ParentId == c.ParentId &&
                    m.StudentId == c.StudentId && m.TeacherId == c.TeacherId && m.SenderId != actor && m.ReadAt == null)))
            .ToListAsync(ct);
    }

    private IQueryable<ParentTeacherMessage> Messages(int actor, LearningThread thread) =>
        db.ParentTeacherMessages.AsNoTracking().Where(m => m.ParentId == thread.ParentId &&
            m.StudentId == thread.StudentId && m.TeacherId == thread.TeacherId && Scope(actor, thread).Any());

    public async Task<IReadOnlyList<LearningMessageDto>> History(int actor, LearningThread thread, long? before, int take, CancellationToken ct) =>
        await Messages(actor, thread).Where(m => before == null || m.MessageId < before)
            .OrderByDescending(m => m.MessageId).Take(take)
            .Select(m => new LearningMessageDto(m.MessageId, m.SenderId == actor, m.Body, m.AttachmentName, m.SentAt)).ToListAsync(ct);

    public async Task Read(int actor, LearningThread thread, long through, CancellationToken ct) =>
        await Messages(actor, thread).Where(m => m.ReadAt == null && m.SenderId != actor && m.MessageId <= through)
            .ExecuteUpdateAsync(set => set.SetProperty(m => m.ReadAt, DateTime.UtcNow), ct);

    public Task<LearningAttachment?> Attachment(int actor, LearningThread thread, long id, CancellationToken ct) =>
        Messages(actor, thread).Where(m => m.MessageId == id && m.AttachmentName != null && m.AttachmentContent != null)
            .Select(m => new LearningAttachment(m.AttachmentName!, m.AttachmentContent!)).SingleOrDefaultAsync(ct);

    public async Task<bool> Send(int actor, LearningThread thread, LearningMessageDraft draft, CancellationToken ct)
    {
        if (actor != thread.ParentId && actor != thread.TeacherId) return false;
        var affected = await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT dbo.ParentTeacherMessages(ClientId, ParentId, StudentId, TeacherId, SenderId, Body, AttachmentName, AttachmentContent)
            SELECT {draft.ClientId}, {thread.ParentId}, {thread.StudentId}, {thread.TeacherId}, {actor},
                {draft.Body}, {draft.Attachment?.FileName}, CONVERT(varbinary(max), {draft.Attachment?.Bytes})
            WHERE EXISTS (
                SELECT 1 FROM dbo.ParentStudentLinks link WITH (HOLDLOCK)
                JOIN dbo.Users parent_user ON parent_user.UserId = link.ParentId AND parent_user.Status = N'Active'
                JOIN dbo.Users student_user ON student_user.UserId = link.StudentId AND student_user.Status = N'Active'
                JOIN dbo.Enrollments e WITH (HOLDLOCK) ON e.StudentId = link.StudentId AND e.Status = N'Active'
                JOIN dbo.Classes c WITH (HOLDLOCK) ON c.ClassId = e.ClassId AND c.Status NOT IN (N'Completed', N'Closed')
                JOIN dbo.Users teacher_user ON teacher_user.UserId = c.TeacherId AND teacher_user.Status = N'Active'
                WHERE link.ParentId = {thread.ParentId} AND link.StudentId = {thread.StudentId} AND link.Status = N'Active'
                  AND c.TeacherId = {thread.TeacherId}
                  AND EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserId = link.ParentId AND RoleId = {(byte)UserRole.Parent} AND RevokedAt IS NULL)
                  AND EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserId = link.StudentId AND RoleId = {(byte)UserRole.Student} AND RevokedAt IS NULL)
                  AND EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserId = c.TeacherId AND RoleId = {(byte)UserRole.Teacher} AND RevokedAt IS NULL)
            ) AND NOT EXISTS (SELECT 1 FROM dbo.ParentTeacherMessages WITH (UPDLOCK, HOLDLOCK) WHERE ClientId = {draft.ClientId})
            """, ct);
        return affected == 1 || await Messages(actor, thread).AnyAsync(m => m.ClientId == draft.ClientId && m.SenderId == actor, ct);
    }
}
