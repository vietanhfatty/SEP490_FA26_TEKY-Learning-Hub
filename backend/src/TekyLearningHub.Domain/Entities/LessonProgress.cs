using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class LessonProgress
{
    public int StudentId { get; set; }

    public int LessonId { get; set; }

    public DateTime ViewedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public virtual Lesson Lesson { get; set; } = null!;

    public virtual StudentProfile Student { get; set; } = null!;
}
