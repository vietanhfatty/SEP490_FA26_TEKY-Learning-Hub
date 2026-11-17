using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Portal;

public sealed class ParentCheckoutRepository(ApplicationDbContext db) : IParentCheckoutRepository
{
    private IQueryable<ParentCheckout> Rows =>
        db.Database.SqlQueryRaw<ParentCheckout>("SELECT * FROM dbo.ParentCourseCheckoutDetails");

    public async Task<ParentCheckout?> Reserve(int parentId, int studentId, int classId, string provider,
        long orderCode, DateTime expiresAt, CancellationToken ct)
    {
        try
        {
            var rows = await db.Database.SqlQuery<ParentCheckout>($"""
                EXEC dbo.ReserveParentCourseCheckout {parentId}, {studentId}, {classId}, {orderCode}, {provider}, {expiresAt}
                """).ToListAsync(ct);
            return rows.SingleOrDefault();
        }
        catch (SqlException error) when (error.Number >= 51000)
        {
            throw new CheckoutConflictException(error.Message);
        }
    }

    public async Task<IReadOnlyList<ParentCheckout>> ForParent(int parentId, int studentId, CancellationToken ct) =>
        await db.Database.SqlQuery<ParentCheckout>($"""
            SELECT c.* FROM dbo.ParentCourseCheckoutDetails c
            WHERE c.ParentId = {parentId} AND c.StudentId = {studentId}
              AND EXISTS (SELECT 1 FROM dbo.ParentStudentLinks l WHERE l.ParentId = c.ParentId
                          AND l.StudentId = c.StudentId AND l.Status = N'Active')
            """).OrderByDescending(row => row.PaymentId).ToListAsync(ct);

    public Task<ParentCheckout?> ByOrder(long orderCode, CancellationToken ct) =>
        Rows.SingleOrDefaultAsync(row => row.OrderCode == orderCode, ct);

    public Task<ParentCheckout?> DemoByReference(string reference, CancellationToken ct) =>
        Rows.SingleOrDefaultAsync(row => row.Provider == "Demo" && row.Reference == reference, ct);

    public Task SaveLink(int paymentId, CheckoutLink link, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE dbo.ParentCourseCheckouts SET ProviderLinkId = {link.Id},
                CheckoutUrl = {link.Url}, QrCode = COALESCE({link.QrCode}, QrCode)
            WHERE PaymentId = {paymentId} AND IsOpen = 1 AND (ProviderLinkId IS NULL OR ProviderLinkId = {link.Id})
            """, ct);

    public Task Resolve(int paymentId, string provider, bool paid, string? linkId, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync($"""
            EXEC dbo.ResolveParentCourseCheckout {paymentId}, {provider}, {paid}, {linkId}
            """, ct);

    public async Task<IReadOnlyList<ParentCheckout>> Due(string provider, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var cutoff = now.AddSeconds(-8);
        return await Rows.Where(row => row.Provider == provider && row.IsOpen &&
                (provider == "Demo" ? row.ExpiresAt <= now :
                    (row.ProviderLinkId != null || row.ExpiresAt <= now) &&
                    (row.LastCheckedAt == null || row.LastCheckedAt < cutoff)))
            .OrderBy(row => row.LastCheckedAt).ThenBy(row => row.PaymentId).Take(20).ToListAsync(ct);
    }

    public Task MarkChecked(int paymentId, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE dbo.ParentCourseCheckouts SET LastCheckedAt = SYSUTCDATETIME() WHERE PaymentId = {paymentId}
            """, ct);
}
