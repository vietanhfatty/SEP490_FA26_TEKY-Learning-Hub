using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class CheerMessage
{
    public long CheerId { get; set; }

    public int ParentId { get; set; }

    public int StudentId { get; set; }

    public int? StickerId { get; set; }

    public string? Message { get; set; }

    public int? SessionId { get; set; }

    public DateTime SentAt { get; set; }

    public DateTime? SeenAt { get; set; }

    public virtual ParentProfile Parent { get; set; } = null!;

    public virtual ClassSession? Session { get; set; }

    public virtual CheerSticker? Sticker { get; set; }

    public virtual StudentProfile Student { get; set; } = null!;
}
