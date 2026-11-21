using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Backoffice;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
namespace TekyLearningHub.Infrastructure.Repositories.Backoffice;

public sealed class AcademicRepository(ApplicationDbContext db) : IAcademicRepository
{
    public async Task<AcademicWorkspace> Workspace(int actor, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var courses = await Rows<AcademicCourse>($"""
            SELECT c.CourseId, c.CourseCode, c.Name, c.DepartmentId, c.Status, a.ReviewStatus, a.Comment, a.Version,
                   c.LearningObjectives, c.TuitionVnd, (SELECT COUNT(*) FROM dbo.Lessons l WHERE l.CourseId=c.CourseId AND l.IsDeleted=0) Lessons
            FROM dbo.Courses c JOIN dbo.CourseApprovals a ON a.CourseId=c.CourseId
            WHERE dbo.HasAcademicPermission({actor}, 'academic.manage', c.DepartmentId)=1 ORDER BY c.CourseCode
            """, ct);
        var classes = await Rows<AcademicClass>($"""
            SELECT cl.ClassId, cl.CourseId, co.Name CourseName, cl.ClassCode, cl.Name, cl.Status, cl.MaxStudents,
                (SELECT COUNT(*) FROM dbo.Enrollments e WHERE e.ClassId=cl.ClassId AND e.Status='Active') Students,
                (SELECT COUNT(*) FROM dbo.ParentCourseCheckouts p WHERE p.ClassId=cl.ClassId AND p.IsOpen=1) Reserved,
                cl.TeacherId, u.FullName TeacherName, cl.StartDate, cl.EndDate, ISNULL(v.Version,1) Version,
                (SELECT COUNT(*) FROM dbo.ClassSessions s WHERE s.ClassId=cl.ClassId) TotalSessions,
                (SELECT COUNT(*) FROM dbo.ClassSessions s WHERE s.ClassId=cl.ClassId AND s.Status='Done') DoneSessions,
                (SELECT COUNT(*) FROM dbo.ClassSessions s WHERE s.ClassId=cl.ClassId AND s.Status='Cancelled') CancelledSessions
            FROM dbo.Classes cl JOIN dbo.Courses co ON co.CourseId=cl.CourseId
            LEFT JOIN dbo.Users u ON u.UserId=cl.TeacherId LEFT JOIN dbo.AcademicClassVersions v ON v.ClassId=cl.ClassId
            WHERE dbo.HasAcademicPermission({actor}, 'academic.manage', co.DepartmentId)=1 ORDER BY cl.ClassCode
            """, ct);
        var shared = await db.Database.SqlQuery<int>($"""
            SELECT CAST(dbo.HasAcademicPermission({actor}, 'academic.manage', NULL) AS int) Value
            """).SingleAsync(ct) == 1;
        var students = await Rows<AcademicStudent>($"""
            SELECT s.UserId StudentId, s.StudentCode, u.FullName Name, s.GradeLevel
            FROM dbo.StudentProfiles s JOIN dbo.Users u ON u.UserId=s.UserId WHERE u.Status='Active' AND
            ({shared}=1 OR EXISTS (SELECT 1 FROM dbo.Enrollments e JOIN dbo.Classes cl ON cl.ClassId=e.ClassId
                JOIN dbo.Courses c ON c.CourseId=cl.CourseId WHERE e.StudentId=s.UserId AND dbo.HasAcademicPermission({actor},'academic.manage',c.DepartmentId)=1)
             OR EXISTS (SELECT 1 FROM dbo.ParentCourseRequests r JOIN dbo.Classes cl ON cl.ClassId=r.ClassId
                JOIN dbo.Courses c ON c.CourseId=cl.CourseId WHERE r.StudentId=s.UserId AND dbo.HasAcademicPermission({actor},'academic.manage',c.DepartmentId)=1))
            ORDER BY u.FullName
            """, ct);
        var enrollments = await Rows<AcademicEnrollment>($"""
            SELECT e.EnrollmentId, e.ClassId, e.StudentId, u.FullName StudentName, sp.StudentCode, e.Status, e.ProgressPercent
            FROM dbo.Enrollments e JOIN dbo.Classes cl ON cl.ClassId=e.ClassId JOIN dbo.Courses c ON c.CourseId=cl.CourseId
            JOIN dbo.Users u ON u.UserId=e.StudentId JOIN dbo.StudentProfiles sp ON sp.UserId=e.StudentId
            WHERE dbo.HasAcademicPermission({actor},'academic.manage',c.DepartmentId)=1 ORDER BY e.EnrollmentId
            """, ct);
        var teachers = await Rows<AcademicTeacher>($"""
            SELECT t.UserId TeacherId, t.TeacherCode, u.FullName Name, t.Specialty,
                (SELECT COUNT(*) FROM dbo.Classes cl WHERE cl.TeacherId=t.UserId AND cl.Status IN ('Open','Planned','Closed')) Classes,
                (SELECT COUNT(*) FROM dbo.ClassSessions s JOIN dbo.Classes cl ON cl.ClassId=s.ClassId WHERE cl.TeacherId=t.UserId
                    AND s.SessionDate BETWEEN {from} AND {to} AND s.Status='Scheduled') Sessions,
                ISNULL((SELECT SUM(DATEDIFF(minute,s.StartTime,s.EndTime)) FROM dbo.ClassSessions s JOIN dbo.Classes cl ON cl.ClassId=s.ClassId
                    WHERE cl.TeacherId=t.UserId AND s.SessionDate BETWEEN {from} AND {to} AND s.Status='Scheduled'),0) Minutes
            FROM dbo.TeacherProfiles t JOIN dbo.Users u ON u.UserId=t.UserId WHERE u.Status='Active' ORDER BY u.FullName
            """, ct);
        var availability = await Rows<AcademicAvailability>($"""
            SELECT AvailabilityId, TeacherId, Weekday, StartsAt, EndsAt FROM dbo.TeacherAvailability ORDER BY TeacherId, Weekday, StartsAt
            """, ct);
        var rooms = await Rows<AcademicRoom>($"""
            SELECT RoomId, RoomName, Capacity, Status, DepartmentId FROM dbo.Rooms ORDER BY RoomName
            """, ct);
        var sessions = await Rows<AcademicSession>($"""
            SELECT s.SessionId, s.ClassId, cl.ClassCode, s.LessonId, l.Title, cl.TeacherId, u.FullName TeacherName,
                s.RoomId, r.RoomName, s.SessionDate Date, s.StartTime StartsAt, s.EndTime EndsAt, s.Status,
                ISNULL(v.Version,1) Version, v.ChangeReason
            FROM dbo.ClassSessions s JOIN dbo.Classes cl ON cl.ClassId=s.ClassId JOIN dbo.Courses co ON co.CourseId=cl.CourseId
            LEFT JOIN dbo.Lessons l ON l.LessonId=s.LessonId LEFT JOIN dbo.Users u ON u.UserId=cl.TeacherId
            LEFT JOIN dbo.Rooms r ON r.RoomId=s.RoomId LEFT JOIN dbo.AcademicSessionVersions v ON v.SessionId=s.SessionId
            WHERE s.SessionDate BETWEEN {from} AND {to} AND dbo.HasAcademicPermission({actor},'academic.manage',co.DepartmentId)=1
            ORDER BY s.SessionDate,s.StartTime,s.SessionId
            """, ct);
        var registrations = await Rows<AcademicRegistration>($"""
            SELECT r.RequestId,r.ParentId,p.FullName ParentName,r.StudentId,u.FullName StudentName,sp.GradeLevel,
                r.ClassId,cl.ClassCode,cl.CourseId,c.Name CourseName,r.Status,r.ManagerNote,r.Version,c.TuitionVnd,
                CASE WHEN EXISTS (SELECT 1 FROM dbo.ParentPayments py WHERE py.StudentId=r.StudentId
                    AND py.CourseId=cl.CourseId AND py.Status='Paid') THEN N'Paid' ELSE N'Unpaid' END PaymentStatus,
                CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Enrollments e WHERE e.StudentId=r.StudentId
                    AND e.ClassId=r.ClassId AND e.Status IN ('Active','Completed')) THEN 1 ELSE 0 END AS bit) Enrolled
            FROM dbo.ParentCourseRequests r JOIN dbo.Classes cl ON cl.ClassId=r.ClassId JOIN dbo.Courses c ON c.CourseId=cl.CourseId
            JOIN dbo.Users p ON p.UserId=r.ParentId JOIN dbo.Users u ON u.UserId=r.StudentId JOIN dbo.StudentProfiles sp ON sp.UserId=r.StudentId
            WHERE dbo.HasAcademicPermission({actor},'academic.manage',c.DepartmentId)=1 ORDER BY r.RequestId DESC
            """, ct);
        var makeup = await Rows<AcademicMakeup>($"""
            SELECT m.MakeupId,a.StudentId,u.FullName StudentName,s.ClassId,cl.ClassCode,s.LessonId,s.SessionDate AbsentDate,
                m.Reason,m.Status,ms.SessionId,m.ManagerNote,m.Version
            FROM dbo.MakeupRequests m JOIN dbo.AttendanceRecords a ON a.AttendanceId=m.AttendanceId
            JOIN dbo.Users u ON u.UserId=a.StudentId JOIN dbo.ClassSessions s ON s.SessionId=a.SessionId
            JOIN dbo.Classes cl ON cl.ClassId=s.ClassId JOIN dbo.Courses c ON c.CourseId=cl.CourseId
            LEFT JOIN dbo.MakeupSessionAssignments ms ON ms.MakeupId=m.MakeupId
            WHERE dbo.HasAcademicPermission({actor},'academic.manage',c.DepartmentId)=1 ORDER BY m.MakeupId DESC
            """, ct);
        var equipment = await Rows<AcademicEquipment>($"""
            SELECT e.EquipmentId,e.Code,e.Name,e.RoomId,r.RoomName,e.Status,e.PurchaseDate,e.CostVnd,e.UsefulLifeMonths,e.Note,e.Version,e.DepartmentId,
                CONVERT(int, CASE WHEN DATEDIFF(month,e.PurchaseDate,CONVERT(date,DATEADD(hour,7,SYSUTCDATETIME()))) >= e.UsefulLifeMonths THEN 0
                ELSE CONVERT(bigint,e.CostVnd)*(e.UsefulLifeMonths-DATEDIFF(month,e.PurchaseDate,CONVERT(date,DATEADD(hour,7,SYSUTCDATETIME()))))/e.UsefulLifeMonths END) BookValueVnd
            FROM dbo.StemEquipment e LEFT JOIN dbo.Rooms r ON r.RoomId=e.RoomId
            WHERE dbo.HasAcademicPermission({actor},'academic.manage',e.DepartmentId)=1 ORDER BY e.Code
            """, ct);
        var lessons = await Rows<AcademicLesson>($"""
            SELECT l.LessonId,l.CourseId,l.Title,l.OrderNo FROM dbo.Lessons l JOIN dbo.Courses c ON c.CourseId=l.CourseId
            WHERE l.IsDeleted=0 AND dbo.HasAcademicPermission({actor},'academic.manage',c.DepartmentId)=1
            ORDER BY c.CourseCode,l.OrderNo,l.LessonId
            """, ct);
        var departments = await Rows<AcademicDepartment>($"""
            SELECT DepartmentId,Name FROM dbo.Departments WHERE IsActive=1
                AND dbo.HasAcademicPermission({actor},'academic.manage',DepartmentId)=1 ORDER BY Name
            """,ct);
        return new(courses, classes, students, enrollments, teachers, availability, rooms, sessions, registrations, makeup, equipment, shared, lessons, departments);
    }

    public Task<AcademicMutation> SaveClass(int actor, AcademicClassDraft draft, CancellationToken ct) =>
        Change(actor, "Class", draft, async () =>
        {
            if (draft.ClassId is int classId) await LockClass(classId, ct);
            await DemandCourse(actor, draft.CourseId, ct);
            if (draft.TeacherId is int teacher) await DemandTeacher(teacher, ct);
            var id = draft.ClassId;
            if (id is null)
            {
                if (draft.Status is "Completed" or "Cancelled") Fail("Lớp mới cần ở trạng thái Planned hoặc Open.");
                id = (await Rows<AcademicMutation>($"""
                    INSERT dbo.Classes(ClassCode,CourseId,Name,MaxStudents,TeacherId,StartDate,EndDate,Status)
                    OUTPUT INSERTED.ClassId Id
                    VALUES({draft.ClassCode.Trim()},{draft.CourseId},{draft.Name.Trim()},{draft.MaxStudents},
                        {draft.TeacherId},{draft.StartDate},{draft.EndDate},{draft.Status});
                    """, ct)).Single().Id;
            }
            else
            {
                await DemandClass(actor, id.Value, ct);
                await VersionClass(id.Value, draft.Version, ct);
                await Execute($"""
                    IF EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassId={id} AND Status IN ('Cancelled','Completed') AND Status<>{draft.Status})
                        THROW 51000,N'Lớp đã kết thúc hoặc bị hủy. Hãy tạo lớp mới để tổ chức lại.',1;
                    IF EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassId={id} AND CourseId<>{draft.CourseId})
                       AND (EXISTS (SELECT 1 FROM dbo.Enrollments WHERE ClassId={id})
                            OR EXISTS (SELECT 1 FROM dbo.ClassSessions WHERE ClassId={id})
                            OR EXISTS (SELECT 1 FROM dbo.ParentCourseCheckouts WHERE ClassId={id} AND IsOpen=1))
                        THROW 51000,N'Lớp đã có buổi học, ghi danh hoặc đơn thanh toán. Không thể đổi khóa học.',1;
                    IF {draft.MaxStudents} < (SELECT COUNT(*) FROM dbo.Enrollments WHERE ClassId={id} AND Status='Active') +
                        (SELECT COUNT(*) FROM dbo.ParentCourseCheckouts WHERE ClassId={id} AND IsOpen=1)
                        THROW 51000,N'Sĩ số thấp hơn số học sinh và chỗ đã giữ thanh toán.',1;
                    IF {draft.Status} IN ('Completed','Cancelled') AND
                        EXISTS (SELECT 1 FROM dbo.ParentCourseCheckouts WHERE ClassId={id} AND IsOpen=1)
                        THROW 51000,N'Lớp còn đơn thanh toán đang đối soát.',1;
                    IF {draft.Status}='Completed' AND EXISTS (SELECT 1 FROM dbo.ClassSessions WHERE ClassId={id} AND Status='Scheduled')
                        THROW 51000,N'Cần hoàn tất hoặc hủy các buổi học trước khi kết thúc lớp.',1;
                    UPDATE dbo.Classes SET ClassCode={draft.ClassCode.Trim()},CourseId={draft.CourseId},Name={draft.Name.Trim()},
                        MaxStudents={draft.MaxStudents},TeacherId={draft.TeacherId},StartDate={draft.StartDate},
                        EndDate={draft.EndDate},Status={draft.Status} WHERE ClassId={id};
                    """, ct);
            }
            await EnsureClassVersion(id!.Value, ct);
            if (draft.Status == "Cancelled")
            {
                await Execute($"""
                    UPDATE dbo.ClassSessions SET Status='Cancelled' WHERE ClassId={id} AND Status='Scheduled';
                    UPDATE dbo.Enrollments SET Status='Dropped' WHERE ClassId={id} AND Status='Active';
                    UPDATE dbo.ParentCourseRequests SET Status='Declined',ManagerNote=CONCAT(N'Lớp bị hủy: ',{draft.Reason}),
                        ProcessedBy={actor},UpdatedAt=SYSUTCDATETIME(),Version=Version+1
                    WHERE ClassId={id} AND Status IN ('Pending','Accepted');
                    INSERT dbo.ParentRefundRequests(PaymentId,Reason)
                    SELECT p.PaymentId,LEFT(CONCAT(N'Lớp bị hủy: ',{draft.Reason}),500) FROM dbo.ParentPayments p
                    WHERE p.Status='Paid' AND EXISTS (SELECT 1 FROM dbo.ParentCourseCheckouts co WHERE co.PaymentId=p.PaymentId AND co.ClassId={id})
                      AND NOT EXISTS (SELECT 1 FROM dbo.ParentRefundRequests r WHERE r.PaymentId=p.PaymentId);
                    """, ct);
            }
            if (draft.Status == "Completed")
                await Execute($"""
                    UPDATE dbo.Enrollments SET Status='Completed',CompletedAt=SYSUTCDATETIME() WHERE ClassId={id} AND Status='Active';
                    """, ct);
            await ValidateClass(id.Value, ct);
            return id.Value;
        }, ct);

    public Task<AcademicMutation> PlaceStudent(int actor, AcademicPlacement draft, CancellationToken ct) =>
        Change(actor, "Enrollment", draft, async () =>
        {
            foreach (var id in new[] { draft.ClassId, draft.FromClassId ?? draft.ClassId }.Distinct().Order())
                await LockClass(id, ct);
            await DemandClass(actor, draft.ClassId, ct);
            if (draft.FromClassId is int source)
            {
                await DemandClass(actor, source, ct);
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.Enrollments WHERE ClassId={source} AND StudentId={draft.StudentId} AND Status='Active')
                        THROW 51000,N'Không tìm thấy ghi danh còn hiệu lực ở lớp nguồn.',1;
                    IF (SELECT CourseId FROM dbo.Classes WHERE ClassId={source})<>(SELECT CourseId FROM dbo.Classes WHERE ClassId={draft.ClassId})
                        THROW 51000,N'Chỉ chuyển giữa các lớp cùng khóa học.',1;
                    UPDATE dbo.Enrollments SET Status='Transferred' WHERE ClassId={source} AND StudentId={draft.StudentId};
                    """, ct);
            }
            await Execute($"""
                IF NOT EXISTS (SELECT 1 FROM dbo.Classes cl JOIN dbo.Courses c ON c.CourseId=cl.CourseId
                    WHERE cl.ClassId={draft.ClassId} AND (c.TuitionVnd=0 OR EXISTS (
                        SELECT 1 FROM dbo.ParentPayments p WHERE p.StudentId={draft.StudentId} AND p.CourseId=c.CourseId AND p.Status='Paid')))
                    THROW 51000,N'Cần xác nhận học phí trước khi ghi danh học sinh vào khóa có thu phí.',1;
                """, ct);
            await Enroll(draft.ClassId, draft.StudentId, draft.FromClassId, ct);
            return draft.ClassId;
        }, ct);

    public Task<AcademicMutation> AssignTeacher(int actor, AcademicTeacherAssignment draft, CancellationToken ct) =>
        Change(actor, "TeacherAssignment", draft, async () =>
        {
            await LockClass(draft.ClassId, ct);
            await DemandClass(actor, draft.ClassId, ct);
            await VersionClass(draft.ClassId, draft.Version, ct);
            if (draft.TeacherId is int teacher) await DemandTeacher(teacher, ct);
            await Execute($"""
                IF EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassId={draft.ClassId} AND Status IN ('Completed','Cancelled'))
                    THROW 51000,N'Lớp đã kết thúc hoặc bị hủy.',1;
                UPDATE dbo.Classes SET TeacherId={draft.TeacherId} WHERE ClassId={draft.ClassId};
                """, ct);
            await ValidateClass(draft.ClassId, ct);
            return draft.ClassId;
        }, ct);

    public Task<AcademicMutation> SaveAvailability(int actor, AcademicAvailabilityDraft draft, CancellationToken ct) =>
        Change(actor, "TeacherAvailability", draft, async () =>
        {
            await DemandGlobal(actor, ct);
            await DemandTeacher(draft.TeacherId, ct);
            if (draft.AvailabilityId is int id)
            {
                await Execute($"""
                    DELETE dbo.TeacherAvailability WHERE AvailabilityId={id} AND TeacherId={draft.TeacherId};
                    IF @@ROWCOUNT=0 THROW 51000,N'Khoảng thời gian không còn tồn tại.',1;
                    """, ct);
            }
            if (!draft.Delete)
                await Execute($"""
                    IF EXISTS (SELECT 1 FROM dbo.TeacherAvailability WHERE TeacherId={draft.TeacherId} AND Weekday={draft.Weekday}
                        AND StartsAt<{draft.EndsAt} AND {draft.StartsAt}<EndsAt)
                        THROW 51000,N'Khoảng thời gian bị trùng.',1;
                    INSERT dbo.TeacherAvailability(TeacherId,Weekday,StartsAt,EndsAt)
                    VALUES({draft.TeacherId},{draft.Weekday},{draft.StartsAt},{draft.EndsAt});
                    """, ct);
            var classes = await db.Classes.Where(c => c.TeacherId == draft.TeacherId && c.Status != "Completed" && c.Status != "Cancelled")
                .Select(c => c.ClassId).ToArrayAsync(ct);
            foreach (var classId in classes) { await LockClass(classId, ct); await ValidateClass(classId, ct); }
            return draft.TeacherId;
        }, ct);

    public Task<AcademicMutation> SaveSession(int actor, AcademicSessionDraft draft, CancellationToken ct) =>
        Change(actor, "ClassSession", draft, async () =>
        {
            await LockClass(draft.ClassId, ct);
            await DemandClass(actor, draft.ClassId, ct);
            if (draft.RoomId is int requestedRoom)
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE RoomId={requestedRoom}
                        AND (DepartmentId IS NULL OR dbo.HasAcademicPermission({actor},'academic.manage',DepartmentId)=1))
                        THROW 51003,N'Phòng không thuộc phạm vi được sử dụng.',1;
                    """,ct);
            if (draft.LessonId is int lesson)
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.Lessons l JOIN dbo.Classes c ON c.CourseId=l.CourseId
                        WHERE c.ClassId={draft.ClassId} AND l.LessonId={lesson} AND l.IsDeleted=0)
                        THROW 51000,N'Bài học không thuộc khóa học của lớp.',1;
                    """, ct);
            if (!draft.Cancel)
                await Execute($"""
                    EXEC dbo.ValidateAcademicSession {draft.ClassId},{draft.SessionId ?? 0},{draft.Date},{draft.StartsAt},{draft.EndsAt},{draft.RoomId};
                    """, ct);
            int id;
            if (draft.SessionId is int session)
            {
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.ClassSessions WHERE SessionId={session} AND ClassId={draft.ClassId} AND Status='Scheduled')
                        THROW 51000,N'Buổi học đã diễn ra, bị hủy hoặc không thuộc lớp.',1;
                    IF EXISTS (SELECT 1 FROM dbo.AcademicSessionVersions WHERE SessionId={session} AND Version<>{draft.Version})
                        THROW 51000,N'Dữ liệu đã thay đổi. Tải lại trước khi sửa.',1;
                    IF EXISTS (SELECT 1 FROM dbo.AttendanceRecords WHERE SessionId={session})
                        THROW 51000,N'Buổi học đã có điểm danh. Cần giữ lịch sử buổi học.',1;
                    UPDATE dbo.ClassSessions SET LessonId={draft.LessonId},RoomId={draft.RoomId},SessionDate={draft.Date},
                        StartTime={draft.StartsAt},EndTime={draft.EndsAt},Status={(draft.Cancel ? "Cancelled" : "Scheduled")}
                    WHERE SessionId={session};
                    """, ct);
                id = session;
            }
            else
            {
                if (draft.Cancel) Fail("Không thể hủy buổi học chưa được tạo.");
                id = (await Rows<AcademicMutation>($"""
                    INSERT dbo.ClassSessions(ClassId,LessonId,RoomId,SessionDate,StartTime,EndTime)
                    OUTPUT INSERTED.SessionId Id
                    VALUES({draft.ClassId},{draft.LessonId},{draft.RoomId},{draft.Date},{draft.StartsAt},{draft.EndsAt});
                    """, ct)).Single().Id;
            }
            await Execute($"""
                IF NOT EXISTS (SELECT 1 FROM dbo.AcademicSessionVersions WHERE SessionId={id})
                    INSERT dbo.AcademicSessionVersions(SessionId) VALUES({id});
                UPDATE dbo.AcademicSessionVersions SET Version=Version+1,ChangeReason={draft.Reason},ChangedAt=SYSUTCDATETIME() WHERE SessionId={id};
                INSERT dbo.Notifications(RecipientId,Type,Title,Body,RefType,RefId)
                SELECT StudentId,N'Schedule',N'Lịch học đã cập nhật',{draft.Reason},N'ClassSession',{id}
                FROM dbo.Enrollments WHERE ClassId={draft.ClassId} AND Status='Active';
                """, ct);
            return id;
        }, ct);

    public Task<AcademicMutation> SaveRoom(int actor, AcademicRoomDraft draft, CancellationToken ct) =>
        Change(actor, "Room", draft, async () =>
        {
            await DemandDepartment(actor, draft.DepartmentId, ct);
            if (draft.RoomId is int currentRoom)
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE RoomId={currentRoom}
                        AND dbo.HasAcademicPermission({actor},'academic.manage',DepartmentId)=1)
                        THROW 51003,N'Phòng không thuộc phạm vi quản lý.',1;
                    """,ct);
            if (draft.RoomId is int id)
            {
                await Execute($"""
                    IF EXISTS (SELECT 1 FROM dbo.ClassSessions s JOIN dbo.Classes c ON c.ClassId=s.ClassId WHERE s.RoomId={id}
                        AND s.Status='Scheduled' AND (c.MaxStudents>{draft.Capacity} OR {draft.Status}<>'Active'))
                        THROW 51000,N'Phòng đang được xếp lịch. Kiểm tra sức chứa hoặc điều chuyển lịch trước.',1;
                    UPDATE dbo.Rooms SET RoomName={draft.RoomName.Trim()},Capacity={draft.Capacity},Status={draft.Status},DepartmentId={draft.DepartmentId} WHERE RoomId={id};
                    IF @@ROWCOUNT=0 THROW 51000,N'Phòng không tồn tại.',1;
                    """, ct);
                return id;
            }
            return (await Rows<AcademicMutation>($"""
                INSERT dbo.Rooms(RoomName,Capacity,Status,DepartmentId) OUTPUT INSERTED.RoomId Id
                VALUES({draft.RoomName.Trim()},{draft.Capacity},{draft.Status},{draft.DepartmentId});
                """, ct)).Single().Id;
        }, ct);

    public Task<AcademicMutation> ReviewCourse(int actor, AcademicReview draft, CancellationToken ct) =>
        Change(actor, "CourseReview", draft, async () =>
        {
            await DemandCourse(actor, draft.Id, ct);
            await Execute($"""
                IF NOT EXISTS (SELECT 1 FROM dbo.CourseApprovals WHERE CourseId={draft.Id} AND Version={draft.Version})
                    THROW 51000,N'Dữ liệu duyệt đã thay đổi. Tải lại trước khi thao tác.',1;
                """, ct);
            var approval = await db.Database.SqlQuery<string>($"""
                SELECT ReviewStatus Value FROM dbo.CourseApprovals WHERE CourseId={draft.Id}
                """).SingleAsync(ct);
            var state = draft.Action switch
            {
                "Submit" when approval is "Draft" or "Revision" or "Rejected" => "Pending",
                "Approve" when approval == "Pending" => "Approved",
                "Reject" when approval == "Pending" => "Rejected",
                "RequestRevision" when approval is "Pending" or "Approved" => "Revision",
                "Publish" when approval == "Approved" => "Approved",
                "Unpublish" => approval,
                "Archive" => approval,
                _ => throw new AcademicPersistenceException(409, "Không thể thực hiện thao tác ở trạng thái duyệt hiện tại.")
            };
            if (draft.Action is "Reject" or "RequestRevision" && string.IsNullOrWhiteSpace(draft.Comment))
                Fail("Cần ghi rõ lý do từ chối hoặc yêu cầu chỉnh sửa.");
            if (draft.Action is "Submit" or "Approve" or "Publish")
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.Courses WHERE CourseId={draft.Id} AND NULLIF(LTRIM(RTRIM(LearningObjectives)),'') IS NOT NULL)
                        OR NOT EXISTS (SELECT 1 FROM dbo.Lessons WHERE CourseId={draft.Id} AND IsDeleted=0)
                        THROW 51000,N'Cần mục tiêu đầu ra và ít nhất một bài học trước khi gửi hoặc duyệt.',1;
                    """, ct);
            await Execute($"""
                UPDATE dbo.CourseApprovals SET ReviewStatus={state},Comment={draft.Comment},
                    ReviewedBy={actor},Version=Version+1,UpdatedAt=SYSUTCDATETIME() WHERE CourseId={draft.Id};
                """, ct);
            if (draft.Action is "Publish" or "Unpublish" or "Archive")
            {
                var status = draft.Action == "Publish" ? "Published" : draft.Action == "Archive" ? "Archived" : "Draft";
                await Execute($"""
                    UPDATE dbo.Courses SET Status={status} WHERE CourseId={draft.Id};
                    """, ct);
            }
            return draft.Id;
        }, ct);

    public Task<AcademicMutation> ReviewRegistration(int actor, AcademicRegistrationReview draft, CancellationToken ct) =>
        Change(actor, "Registration", draft, async () =>
        {
            var current = (await Rows<RegistrationScope>($"""
                SELECT r.ClassId,r.StudentId,r.ParentId,r.Status,r.Version FROM dbo.ParentCourseRequests r WHERE RequestId={draft.RequestId}
                """, ct)).SingleOrDefault() ?? throw new AcademicPersistenceException(404, "Không tìm thấy đăng ký.");
            await DemandClass(actor, current.ClassId, ct);
            if (current.Version != draft.Version) Fail("Đăng ký đã thay đổi. Tải lại dữ liệu.");
            var target = draft.ClassId ?? current.ClassId;
            foreach (var id in new[] { current.ClassId, target }.Distinct().Order()) await LockClass(id, ct);
            await DemandClass(actor, target, ct);
            await Execute($"""
                IF NOT EXISTS (SELECT 1 FROM dbo.ParentStudentLinks WHERE ParentId={current.ParentId} AND StudentId={current.StudentId} AND Status='Active')
                    THROW 51000,N'Liên kết phụ huynh và học sinh không còn hiệu lực.',1;
                IF (SELECT CourseId FROM dbo.Classes WHERE ClassId={target})<>(SELECT CourseId FROM dbo.Classes WHERE ClassId={current.ClassId})
                    THROW 51000,N'Lớp được xếp phải cùng khóa học đã đăng ký.',1;
                """, ct);
            var status = draft.Action switch
            {
                "Approve" or "Assign" => "Accepted",
                "Reject" => "Declined",
                "RequestInfo" => "Pending",
                _ => throw new AcademicPersistenceException(400, "Thao tác đăng ký không hợp lệ.")
            };
            if (draft.Action is "Reject" or "RequestInfo" && string.IsNullOrWhiteSpace(draft.Comment)) Fail("Cần ghi nội dung gửi phụ huynh.");
            await Execute($"""
                IF EXISTS (SELECT 1 FROM dbo.Enrollments WHERE ClassId={current.ClassId} AND StudentId={current.StudentId} AND Status IN ('Active','Completed'))
                    THROW 51000,N'Học sinh đã được ghi danh. Dùng chức năng chuyển lớp để thay đổi lớp.',1;
                IF EXISTS (SELECT 1 FROM dbo.ParentCourseCheckouts WHERE StudentId={current.StudentId}
                    AND CourseId=(SELECT CourseId FROM dbo.Classes WHERE ClassId={target}) AND IsOpen=1)
                    THROW 51000,N'Đăng ký đang có giao dịch thanh toán. Đợi đối soát trước khi xếp lại.',1;
                """, ct);
            if (status == "Accepted")
            {
                await CheckSeat(target, current.StudentId, ct);
                var paid = await db.Database.SqlQuery<int>($"""
                    SELECT CAST(CASE WHEN c.TuitionVnd=0 OR EXISTS (
                        SELECT 1 FROM dbo.ParentPayments p WHERE p.StudentId={current.StudentId} AND p.CourseId=c.CourseId AND p.Status='Paid')
                        THEN 1 ELSE 0 END AS int) Value FROM dbo.Courses c JOIN dbo.Classes cl ON cl.CourseId=c.CourseId WHERE cl.ClassId={target}
                    """).SingleAsync(ct) == 1;
                if (paid) await Enroll(target, current.StudentId, null, ct);
            }
            await Execute($"""
                UPDATE dbo.ParentCourseRequests SET ClassId={target},Status={status},ManagerNote={draft.Comment},
                    ProcessedBy={actor},UpdatedAt=SYSUTCDATETIME(),Version=Version+1 WHERE RequestId={draft.RequestId};
                INSERT dbo.Notifications(RecipientId,Type,Title,Body,RefType,RefId)
                VALUES({current.ParentId},N'Registration',N'Cập nhật đăng ký khóa học',{draft.Comment},N'CourseRequest',{draft.RequestId});
                """, ct);
            return target;
        }, ct);

    public Task<AcademicMutation> ReviewMakeup(int actor, AcademicMakeupReview draft, CancellationToken ct) =>
        Change(actor, "Makeup", draft, async () =>
        {
            var request = (await Rows<MakeupScope>($"""
                SELECT s.ClassId,a.StudentId,s.LessonId,m.Status,m.Version FROM dbo.MakeupRequests m
                JOIN dbo.AttendanceRecords a ON a.AttendanceId=m.AttendanceId JOIN dbo.ClassSessions s ON s.SessionId=a.SessionId
                WHERE m.MakeupId={draft.MakeupId} AND a.Status IN ('Absent','Excused')
                """, ct)).SingleOrDefault() ?? throw new AcademicPersistenceException(404, "Không có yêu cầu học bù phù hợp.");
            await LockClass(request.ClassId, ct);
            await DemandClass(actor, request.ClassId, ct);
            if (request.Version != draft.Version || request.Status != "Pending") Fail("Yêu cầu học bù đã được xử lý.");
            var status = draft.Action == "Approve" ? "Approved" : draft.Action == "Reject" ? "Rejected" : "";
            if (status == "") Fail("Thao tác học bù không hợp lệ.");
            if (status == "Rejected" && string.IsNullOrWhiteSpace(draft.Comment)) Fail("Cần lý do từ chối học bù.");
            if (status == "Approved")
            {
                if (draft.SessionId is null) Fail("Cần chọn buổi học bù.");
                var session = await db.ClassSessions.AsNoTracking().SingleOrDefaultAsync(s => s.SessionId == draft.SessionId, ct);
                if (session is null) Fail("Không tìm thấy buổi học bù.");
                await LockClass(session!.ClassId, ct);
                await DemandClass(actor, session.ClassId, ct);
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.ClassSessions s JOIN dbo.Classes cl ON cl.ClassId=s.ClassId
                        WHERE s.SessionId={draft.SessionId} AND s.Status='Scheduled'
                          AND s.SessionDate>=CONVERT(date,DATEADD(hour,7,SYSUTCDATETIME()))
                          AND cl.CourseId=(SELECT CourseId FROM dbo.Classes WHERE ClassId={request.ClassId})
                          AND ({request.LessonId} IS NULL OR s.LessonId={request.LessonId}))
                        THROW 51000,N'Chọn buổi học sắp tới thuộc cùng khóa học và bài học.',1;
                    IF (SELECT COUNT(*) FROM dbo.Enrollments WHERE ClassId={session.ClassId} AND Status='Active') +
                       (SELECT COUNT(*) FROM dbo.MakeupSessionAssignments WHERE SessionId={draft.SessionId}) >=
                       (SELECT MaxStudents FROM dbo.Classes WHERE ClassId={session.ClassId})
                       AND NOT EXISTS (SELECT 1 FROM dbo.Enrollments WHERE ClassId={session.ClassId} AND StudentId={request.StudentId} AND Status='Active')
                        THROW 51000,N'Buổi học bù đã hết chỗ.',1;
                    EXEC dbo.ValidateAcademicSession {session.ClassId},{session.SessionId},{session.SessionDate},{session.StartTime},{session.EndTime},{session.RoomId},{request.StudentId};
                    INSERT dbo.MakeupSessionAssignments(MakeupId,SessionId,StudentId) VALUES({draft.MakeupId},{draft.SessionId},{request.StudentId});
                    """, ct);
            }
            await Execute($"""
                UPDATE dbo.MakeupRequests SET Status={status},ManagerNote={draft.Comment},ProcessedBy={actor},
                    ProcessedAt=SYSUTCDATETIME(),PreferredSessionId={draft.SessionId},Version=Version+1 WHERE MakeupId={draft.MakeupId};
                """, ct);
            return draft.MakeupId;
        }, ct);

    public Task<AcademicMutation> SaveEquipment(int actor, AcademicEquipmentDraft draft, CancellationToken ct) =>
        Change(actor, "Equipment", draft, async () =>
        {
            await DemandDepartment(actor, draft.DepartmentId, ct);
            if (draft.EquipmentId is int currentEquipment)
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.StemEquipment WHERE EquipmentId={currentEquipment}
                        AND dbo.HasAcademicPermission({actor},'academic.manage',DepartmentId)=1)
                        THROW 51003,N'Thiết bị không thuộc phạm vi quản lý.',1;
                    """,ct);
            if (draft.RoomId is int room)
                await Execute($"""
                    IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE RoomId={room} AND
                        (DepartmentId IS NULL OR DepartmentId={draft.DepartmentId}
                         OR dbo.HasAcademicPermission({actor},'academic.manage',DepartmentId)=1))
                        THROW 51003,N'Phòng học không tồn tại trong phạm vi được phân bổ.',1;
                    """, ct);
            if (draft.EquipmentId is int id)
            {
                await Execute($"""
                    UPDATE dbo.StemEquipment SET Code={draft.Code.Trim()},Name={draft.Name.Trim()},RoomId={draft.RoomId},DepartmentId={draft.DepartmentId},
                        Status={draft.Status},PurchaseDate={draft.PurchaseDate},CostVnd={draft.CostVnd},UsefulLifeMonths={draft.UsefulLifeMonths},
                        Note={draft.Note},Version=Version+1 WHERE EquipmentId={id} AND Version={draft.Version};
                    IF @@ROWCOUNT=0 THROW 51000,N'Thiết bị đã thay đổi. Tải lại dữ liệu.',1;
                    """, ct);
                return id;
            }
            return (await Rows<AcademicMutation>($"""
                INSERT dbo.StemEquipment(Code,Name,RoomId,Status,PurchaseDate,CostVnd,UsefulLifeMonths,Note,DepartmentId)
                OUTPUT INSERTED.EquipmentId Id
                VALUES({draft.Code.Trim()},{draft.Name.Trim()},{draft.RoomId},{draft.Status},{draft.PurchaseDate},
                       {draft.CostVnd},{draft.UsefulLifeMonths},{draft.Note},{draft.DepartmentId});
                """, ct)).Single().Id;
        }, ct);

    private async Task<AcademicMutation> Change<T>(int actor, string entityType, T payload, Func<Task<int>> operation, CancellationToken ct)
    {
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            try
            {
                await Execute($"""
                    DECLARE @lock int;
                    EXEC @lock=sys.sp_getapplock @Resource=N'Teky.AcademicOperations',@LockMode='Exclusive',@LockTimeout=10000;
                    IF @lock<0 THROW 51000,N'Đang có thao tác khác. Vui lòng thử lại.',1;
                    """, ct);
                var id = await operation();
                db.AuditLogs.Add(new AuditLog
                {
                    ActorUserId = actor,
                    Action = "ACADEMIC_" + entityType.ToUpperInvariant(),
                    EntityType = entityType,
                    EntityId = id.ToString(),
                    NewValue = JsonSerializer.Serialize(payload),
                    CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return new AcademicMutation(id);
            }
            catch (SqlException error) when (error.Number == 51003)
            { throw new AcademicPersistenceException(403, error.Message); }
            catch (SqlException error) when (error.Number >= 51000)
            { throw new AcademicPersistenceException(409, error.Message); }
            catch (SqlException error) when (error.Number is 2601 or 2627)
            { throw new AcademicPersistenceException(409, "Mã, lịch hoặc ghi danh đã tồn tại. Tải lại dữ liệu."); }
            catch (SqlException error) when (error.Number == 547)
            { throw new AcademicPersistenceException(409, "Dữ liệu liên quan không còn hợp lệ. Tải lại và kiểm tra."); }
        });
    }
    private async Task DemandCourse(int actor, int courseId, CancellationToken ct) =>
        await Execute($"""
            IF NOT EXISTS (SELECT 1 FROM dbo.Courses WHERE CourseId={courseId} AND dbo.HasAcademicPermission({actor},'academic.manage',DepartmentId)=1)
                THROW 51003,N'Khóa học không thuộc phạm vi quản lý.',1;
            """, ct);
    private async Task DemandClass(int actor, int classId, CancellationToken ct) =>
        await Execute($"""
            IF NOT EXISTS (SELECT 1 FROM dbo.Classes cl JOIN dbo.Courses c ON c.CourseId=cl.CourseId
                WHERE cl.ClassId={classId} AND dbo.HasAcademicPermission({actor},'academic.manage',c.DepartmentId)=1)
                THROW 51003,N'Lớp học không thuộc phạm vi quản lý.',1;
            """, ct);
    private async Task DemandDepartment(int actor, int? departmentId, CancellationToken ct) =>
        await Execute($"""
            IF dbo.HasAcademicPermission({actor},'academic.manage',{departmentId})<>1
                THROW 51003,N'Tài nguyên không thuộc phạm vi quản lý.',1;
            IF {departmentId} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE DepartmentId={departmentId} AND IsActive=1)
                THROW 51000,N'Phòng ban không còn hoạt động.',1;
            """,ct);
    private async Task DemandGlobal(int actor, CancellationToken ct) =>
        await Execute($"""
            IF dbo.HasAcademicPermission({actor},'academic.manage',NULL)<>1
                THROW 51003,N'Cần quyền toàn hệ thống để chỉnh sửa tài nguyên dùng chung.',1;
            """, ct);
    private async Task DemandTeacher(int id, CancellationToken ct) =>
        await Execute($"""
            IF NOT EXISTS (SELECT 1 FROM dbo.TeacherProfiles t JOIN dbo.Users u ON u.UserId=t.UserId
                WHERE t.UserId={id} AND u.Status='Active') THROW 51000,N'Giảng viên chưa sẵn sàng.',1;
            """, ct);
    private async Task LockClass(int id, CancellationToken ct) =>
        await Execute($"""
            DECLARE @resource nvarchar(80)=CONCAT(N'ParentCheckout:Class:',{id}),@lock int;
            EXEC @lock=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockTimeout=10000;
            IF @lock<0 THROW 51000,N'Lớp đang được cập nhật. Vui lòng thử lại.',1;
            """, ct);
    private async Task EnsureClassVersion(int id, CancellationToken ct) =>
        await Execute($"""
            IF NOT EXISTS(SELECT 1 FROM dbo.AcademicClassVersions WHERE ClassId={id})
                INSERT dbo.AcademicClassVersions(ClassId) VALUES({id});
            """, ct);
    private async Task VersionClass(int id, int version, CancellationToken ct)
    {
        await EnsureClassVersion(id, ct);
        await Execute($"""
            UPDATE dbo.AcademicClassVersions SET Version=Version+1 WHERE ClassId={id} AND Version={version};
            IF @@ROWCOUNT=0 THROW 51000,N'Lớp đã thay đổi. Tải lại trước khi sửa.',1;
            """, ct);
    }
    private async Task ValidateClass(int id, CancellationToken ct)
    {
        var sessions = await db.ClassSessions.AsNoTracking().Where(s => s.ClassId == id && s.Status == "Scheduled").ToArrayAsync(ct);
        foreach (var s in sessions)
            await Execute($"""
                EXEC dbo.ValidateAcademicSession {id},{s.SessionId},{s.SessionDate},{s.StartTime},{s.EndTime},{s.RoomId};
                """, ct);
    }
    private async Task CheckSeat(int classId, int studentId, CancellationToken ct) =>
        await Execute($"""
            IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles sp JOIN dbo.Users u ON u.UserId=sp.UserId
                WHERE sp.UserId={studentId} AND u.Status='Active') THROW 51000,N'Hồ sơ học sinh chưa hoạt động.',1;
            IF NOT EXISTS(SELECT 1 FROM dbo.Classes WHERE ClassId={classId} AND Status='Open')
                THROW 51000,N'Lớp chưa mở nhận học sinh.',1;
            IF NOT EXISTS(SELECT 1 FROM dbo.Enrollments WHERE ClassId={classId} AND StudentId={studentId} AND Status='Active')
              AND (SELECT COUNT(*) FROM dbo.Enrollments WHERE ClassId={classId} AND Status='Active') +
                  (SELECT COUNT(*) FROM dbo.ParentCourseCheckouts WHERE ClassId={classId} AND IsOpen=1) >=
                  (SELECT MaxStudents FROM dbo.Classes WHERE ClassId={classId})
                THROW 51000,N'Lớp đã đủ sĩ số tính cả chỗ đang giữ thanh toán.',1;
            """, ct);
    private async Task Enroll(int classId, int studentId, int? source, CancellationToken ct)
    {
        await CheckSeat(classId, studentId, ct);
        await Execute($"""
            EXEC dbo.ValidateAcademicPlacement {classId},{studentId};
            """, ct);
        await Execute($"""
            IF EXISTS (SELECT 1 FROM dbo.Enrollments e JOIN dbo.Classes otherClass ON otherClass.ClassId=e.ClassId
                WHERE e.StudentId={studentId} AND e.Status='Active' AND e.ClassId<>{classId}
                  AND otherClass.CourseId=(SELECT CourseId FROM dbo.Classes WHERE ClassId={classId}))
                THROW 51000,N'Học sinh đang học một lớp cùng khóa học. Dùng thao tác chuyển lớp.',1;
            IF EXISTS (SELECT 1 FROM dbo.Enrollments WHERE ClassId={classId} AND StudentId={studentId} AND Status='Completed')
                THROW 51000,N'Học sinh đã hoàn thành lớp này.',1;
            IF NOT EXISTS(SELECT 1 FROM dbo.Enrollments WHERE ClassId={classId} AND StudentId={studentId})
                INSERT dbo.Enrollments(ClassId,StudentId,TransferredFromId)
                VALUES({classId},{studentId},(SELECT EnrollmentId FROM dbo.Enrollments WHERE ClassId={source} AND StudentId={studentId}));
            ELSE UPDATE dbo.Enrollments SET Status='Active',CompletedAt=NULL
                WHERE ClassId={classId} AND StudentId={studentId};
            """, ct);
        if (source is int sourceClass)
            await Execute($"""
                UPDATE target SET ProgressPercent=original.ProgressPercent
                FROM dbo.Enrollments target JOIN dbo.Enrollments original ON original.StudentId=target.StudentId
                WHERE target.ClassId={classId} AND target.StudentId={studentId} AND original.ClassId={sourceClass};
                """, ct);
        await ValidateClass(classId, ct);
    }
    private Task<int> Execute(FormattableString sql, CancellationToken ct) => db.Database.ExecuteSqlInterpolatedAsync(sql, ct);
    private async Task<T[]> Rows<T>(FormattableString sql, CancellationToken ct) where T : class =>
        (await db.Database.SqlQuery<T>(sql).ToListAsync(ct)).ToArray();
    private static void Fail(string message) => throw new AcademicPersistenceException(409, message);
    private sealed record RegistrationScope(int ClassId, int StudentId, int ParentId, string Status, int Version);
    private sealed record MakeupScope(int ClassId, int StudentId, int? LessonId, string Status, int Version);
}
