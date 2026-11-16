using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;

namespace TekyLearningHub.Infrastructure.Data;

public sealed class UnitOfWork(ApplicationDbContext db) : IUnitOfWork
{
    public void Reset() => db.ChangeTracker.Clear();
    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        try { return await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException e) { throw new PersistenceConflictException("Dữ liệu vừa thay đổi. Hãy tải lại trước khi lưu.", false, e); }
        catch (DbUpdateException e) when (e.InnerException is SqlException { Number: 2601 or 2627 }) { throw new PersistenceConflictException("Email, số điện thoại hoặc phân công đã tồn tại.", true, e); }
    }
    public Task<T> ExecuteAsync<T>(TransactionKind kind, Func<Task<T>> operation, CancellationToken ct = default) => db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
    {
        Reset();
        await using var tx = await db.Database.BeginTransactionAsync(kind == TransactionKind.ProjectSubmission ? IsolationLevel.Serializable : IsolationLevel.ReadCommitted, ct);
        if (kind == TransactionKind.IdentityAdministration) await db.Database.ExecuteSqlRawAsync("""
   DECLARE @r int;
   EXEC @r=sys.sp_getapplock @Resource=N'Teky.UserAdministration', @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000;
   IF @r<0 THROW 51201,'Cannot acquire user administration lock.',1;
   """, ct);
        var result = await operation(); await SaveChangesAsync(ct); await tx.CommitAsync(ct); return result;
    });
}
