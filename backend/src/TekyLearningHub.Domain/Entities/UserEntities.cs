using TekyLearningHub.Domain.Common;

namespace TekyLearningHub.Domain.Entities;

public class Teacher : BaseAuditableEntity<Guid>
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }

    public ICollection<Classroom> Classrooms { get; set; } = new List<Classroom>();
    public ICollection<StemMap> CreatedMaps { get; set; } = new List<StemMap>();
}

public class Student : BaseAuditableEntity<Guid>
{
    public string UserId { get; set; } = string.Empty;
    public string StudentCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int TotalXp { get; set; } = 0;
    public int CurrentLevel { get; set; } = 1;
    public int CurrentStreakDays { get; set; } = 0;
    public DateTime? LastActiveAt { get; set; }

    public ICollection<ClassStudent> ClassEnrollments { get; set; } = new List<ClassStudent>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<StudentSubmission> Submissions { get; set; } = new List<StudentSubmission>();
    public ICollection<ParentStudentRelation> ParentRelations { get; set; } = new List<ParentStudentRelation>();
    public ICollection<StudentPortfolio> Portfolios { get; set; } = new List<StudentPortfolio>();
}

public class Parent : BaseAuditableEntity<Guid>
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Email { get; set; }

    public ICollection<ParentStudentRelation> StudentRelations { get; set; } = new List<ParentStudentRelation>();
    public ICollection<CheerMessage> SentCheerMessages { get; set; } = new List<CheerMessage>();
}

public class ParentStudentRelation : BaseAuditableEntity<Guid>
{
    public Guid ParentId { get; set; }
    public Parent Parent { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public string RelationshipType { get; set; } = "Phụ huynh"; // Bố, Mẹ, Người giám hộ
}
