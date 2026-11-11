using TekyLearningHub.Domain.Common;
using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Domain.Entities;

public class StemMap : BaseAuditableEntity<Guid>
{
    public Guid TeacherId { get; set; }
    public Teacher Teacher { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int GridWidth { get; set; } = 10;
    public int GridHeight { get; set; } = 10;
    public int ParTimeSeconds { get; set; } = 60;
    public bool IsAiGenerated { get; set; } = false;
    public string? PromptUsed { get; set; }

    public ICollection<MapCheckpoint> Checkpoints { get; set; } = new List<MapCheckpoint>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public class MapCheckpoint : BaseAuditableEntity<Guid>
{
    public Guid StemMapId { get; set; }
    public StemMap StemMap { get; set; } = null!;

    public int OrderIndex { get; set; }
    public double CoordinateX { get; set; }
    public double CoordinateY { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? QuestionPrompt { get; set; }
    public string? StandardAnswer { get; set; }
}

public class Assignment : BaseAuditableEntity<Guid>
{
    public Guid ClassroomId { get; set; }
    public Classroom Classroom { get; set; } = null!;

    public Guid? StemMapId { get; set; }
    public StemMap? StemMap { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public double MaxScore { get; set; } = 10.0;
    public string? MasterBlocklyXml { get; set; }
    public string? MasterAstJson { get; set; }

    public ICollection<StudentSubmission> Submissions { get; set; } = new List<StudentSubmission>();
}

public class StudentSubmission : BaseAuditableEntity<Guid>
{
    public Guid AssignmentId { get; set; }
    public Assignment Assignment { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public Guid? ClassSessionId { get; set; }
    public ClassSession? ClassSession { get; set; }

    public string SubmittedBlocklyXml { get; set; } = string.Empty;
    public string SubmittedAstJson { get; set; } = string.Empty;
    public int TimeTakenSeconds { get; set; }
    
    // Formula 60/40: TotalScore = (AstAutoScore * 0.6) + (RubricScore * 0.4)
    public double AstAutoScore { get; set; } = 0.0; // Scaled 0 - 10
    public double RubricScore { get; set; } = 0.0;  // Scaled 0 - 10
    public double TotalScore { get; set; } = 0.0;   // Scaled 0 - 10

    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public SubmissionRubric? RubricDetail { get; set; }
}

public class SubmissionRubric : BaseAuditableEntity<Guid>
{
    public Guid StudentSubmissionId { get; set; }
    public StudentSubmission StudentSubmission { get; set; } = null!;

    // Quick-Pill rubric breakdown
    public double AssemblyScore { get; set; } = 10.0;          // Kỹ năng lắp ráp mô hình
    public double AlgorithmExplainScore { get; set; } = 10.0;  // Kỹ năng giải thích thuật toán
    public double TeamworkScore { get; set; } = 10.0;          // Tinh thần làm việc nhóm & thái độ

    public string? TeacherNote { get; set; }
    public string? VoiceMemoUrl { get; set; }
    public string? VoiceMemoTranscript { get; set; }
}
