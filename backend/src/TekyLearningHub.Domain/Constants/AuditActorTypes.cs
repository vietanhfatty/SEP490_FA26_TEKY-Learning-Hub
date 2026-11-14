namespace TekyLearningHub.Domain.Constants;

/// <summary>Actor category in the audit schema. A user's role is not an actor category.</summary>
public static class AuditActorTypes
{
    public const string User = "User";
    public const string System = "System";

    public static string Normalize(string? value) => value?.Trim() switch
    {
        var text when string.Equals(text, User, StringComparison.OrdinalIgnoreCase) => User,
        var text when string.Equals(text, System, StringComparison.OrdinalIgnoreCase) => System,
        _ => throw new ArgumentException("Audit ActorType must be User or System.", nameof(value))
    };
}
