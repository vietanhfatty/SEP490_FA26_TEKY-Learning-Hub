using System;
using System.Collections.Generic;
using TekyLearningHub.Domain.Constants;

namespace TekyLearningHub.Domain.Entities;

public partial class AuditLog
{
    public long AuditId { get; set; }

    public int? ActorUserId { get; set; }

    private string _actorType = AuditActorTypes.User;
    public string ActorType
    {
        get => _actorType;
        set => _actorType = AuditActorTypes.Normalize(value);
    }

    public string Action { get; set; } = null!;

    public string? EntityType { get; set; }

    public string? EntityId { get; set; }

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? ActorUser { get; set; }
}
