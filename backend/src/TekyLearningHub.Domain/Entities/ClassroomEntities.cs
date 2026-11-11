using TekyLearningHub.Domain.Common;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Domain.Entities;

public class Classroom : BaseAuditableEntity<Guid>
{
    public string ClassCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;

    public string RoomName { get; set; } = "Lab 101";
    public int Capacity { get; set; } = 15;
    public bool IsActive { get; set; } = true;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public ICollection<ClassStudent> Students { get; set; } = new List<ClassStudent>();
    public ICollection<ClassSession> Sessions { get; set; } = new List<ClassSession>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public class ClassStudent : BaseAuditableEntity<Guid>
{
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}

public class ClassSession : BaseAuditableEntity<Guid>
{
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;

    public int SessionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string RoomName { get; set; } = "Lab 101";
    public ClassSessionStatus Status { get; set; } = ClassSessionStatus.Scheduled;

    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<EContactBook> ContactBooks { get; set; } = new List<EContactBook>();
}

public class Attendance : BaseAuditableEntity<Guid>
{
    public Guid ClassSessionId { get; set; }
    public ClassSession ClassSession { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;
    public AttendanceSource Source { get; set; } = AttendanceSource.ManualTeacher;
    public DateTime? CheckInTime { get; set; }
    public string? Notes { get; set; }
    public string? WorkstationIp { get; set; }
}

public class MakeupRequest : BaseAuditableEntity<Guid>
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public Guid OriginalSessionId { get; set; }
    public ClassSession OriginalSession { get; set; } = null!;

    public Guid TargetSessionId { get; set; }
    public ClassSession TargetSession { get; set; } = null!;

    public string Reason { get; set; } = string.Empty;
    public MakeupRequestStatus Status { get; set; } = MakeupRequestStatus.Pending;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public Guid? ReviewedByTeacherId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? TeacherNote { get; set; }
}
