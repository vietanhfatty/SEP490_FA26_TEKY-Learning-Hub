using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Notification
{
    public long NotificationId { get; set; }

    public int RecipientId { get; set; }

    public string Type { get; set; } = null!;

    public string Title { get; set; } = null!;

    public string? Body { get; set; }

    public string? RefType { get; set; }

    public long? RefId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReadAt { get; set; }

    public virtual User Recipient { get; set; } = null!;
}
