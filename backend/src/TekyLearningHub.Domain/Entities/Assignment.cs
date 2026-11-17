using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Assignment
{
    public int AssignmentId { get; set; }

    public int ClassId { get; set; }

    public int? LessonId { get; set; }

    public int? MapId { get; set; }

    public string Title { get; set; } = null!;

    public string? Instructions { get; set; }

    public DateTime? DueAt { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? ClosedAt { get; set; }

    public string? ClosedReason { get; set; }

    public string? MasterAstJson { get; set; }

    public bool MasterTested { get; set; }

    public decimal AstWeight { get; set; }

    public decimal HardwareWeight { get; set; }

    public decimal MaxScore { get; set; }

    public int? MaxAttempts { get; set; }

    public int? ParTimeMs { get; set; }

    public int? ParBlockCount { get; set; }

    public int MaxXp { get; set; }

    public int CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<HardwareRubricCriterion> HardwareRubricCriteria { get; set; } = new List<HardwareRubricCriterion>();

    public virtual Lesson? Lesson { get; set; }

    public virtual ChallengeMap? Map { get; set; }

    public virtual ICollection<SimulationRun> SimulationRuns { get; set; } = new List<SimulationRun>();

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();

    public virtual ICollection<WorkspaceDraft> WorkspaceDrafts { get; set; } = new List<WorkspaceDraft>();
}
