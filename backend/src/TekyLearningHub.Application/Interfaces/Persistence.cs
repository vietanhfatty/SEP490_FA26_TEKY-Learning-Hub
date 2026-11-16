using TekyLearningHub.Application.Interfaces;

namespace TekyLearningHub.Application.Interfaces;

public sealed class PersistenceConflictException(string message, bool duplicate = false, Exception? inner = null) : Exception(message, inner)
{
    public bool Duplicate { get; } = duplicate;
}
public enum TransactionKind { Default, IdentityAdministration, ProjectSubmission }
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task<T> ExecuteAsync<T>(TransactionKind kind, Func<Task<T>> operation, CancellationToken ct = default);
    void Reset();
}
public interface IAccountEmailOutbox { void Enqueue(string email, string subject, string body); }
public sealed class AccountOptions { public string? InvitationBaseUrl { get; set; } }
