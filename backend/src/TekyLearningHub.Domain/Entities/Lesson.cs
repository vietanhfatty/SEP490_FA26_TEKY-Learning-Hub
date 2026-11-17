using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Lesson
{
    public int LessonId { get; set; }

    public int CourseId { get; set; }

    public string Title { get; set; } = null!;

    public string? Content { get; set; }

    public int OrderNo { get; set; }

    public bool IsDeleted { get; set; }

    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();

    public virtual ICollection<ClassSession> ClassSessions { get; set; } = new List<ClassSession>();

    public virtual Course Course { get; set; } = null!;

    public virtual ICollection<LessonMaterial> LessonMaterials { get; set; } = new List<LessonMaterial>();

    public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();

    public virtual ICollection<MakeupRequest> MakeupRequests { get; set; } = new List<MakeupRequest>();
}
