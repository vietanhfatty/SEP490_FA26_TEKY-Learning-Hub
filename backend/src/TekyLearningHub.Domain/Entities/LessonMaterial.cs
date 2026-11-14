using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class LessonMaterial
{
    public int MaterialId { get; set; }

    public int LessonId { get; set; }

    public string MaterialType { get; set; } = null!;

    public string Title { get; set; } = null!;

    public string FileUrl { get; set; } = null!;

    public bool IsDownloadable { get; set; }

    public int SortOrder { get; set; }

    public virtual Lesson Lesson { get; set; } = null!;
}
