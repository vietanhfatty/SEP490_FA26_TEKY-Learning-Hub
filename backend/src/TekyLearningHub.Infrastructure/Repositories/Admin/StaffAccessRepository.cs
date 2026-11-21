using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Admin;

public sealed class StaffAccessRepository(ApplicationDbContext db) : IStaffAccessRepository
{
    private IQueryable<Position> PolicyPositions => db.Positions.Include(x => x.Department).Include(x => x.Policies).ThenInclude(x => x.Roles)
        .Include(x => x.Policies).ThenInclude(x => x.Permissions).ThenInclude(x => x.Permission);
    public Task<Position[]> Positions(CancellationToken ct) => PolicyPositions.OrderBy(x => x.Department.Name).ThenBy(x => x.Name).ToArrayAsync(ct);
    public Task<Dictionary<int, int>> AppointmentCounts(CancellationToken ct) => db.StaffAppointments.Where(x => x.ValidTo == null)
        .GroupBy(x => x.PositionId).Select(group => new { PositionId = group.Key, Count = group.Count() }).ToDictionaryAsync(x => x.PositionId, x => x.Count, ct);
    public Task<Position?> Position(int id, CancellationToken ct) => PolicyPositions.SingleOrDefaultAsync(x => x.PositionId == id, ct);
    public Task<Department?> Department(int id, CancellationToken ct) => db.Departments.SingleOrDefaultAsync(x => x.DepartmentId == id, ct);
    public void AddPosition(Position position) => db.Positions.Add(position);
    private IQueryable<StaffAppointment> LoadedAppointments => db.StaffAppointments.Include(x => x.Position).ThenInclude(x => x.Department)
        .Include(x => x.Policy).ThenInclude(x => x!.Roles);
    public Task<List<StaffAppointment>> Appointments(int id, CancellationToken ct) => LoadedAppointments.Where(x => x.UserId == id).OrderByDescending(x => x.ValidFrom).ToListAsync(ct);
    public Task<List<StaffAppointment>> PositionAppointments(int id, CancellationToken ct) => LoadedAppointments.Where(x => x.PositionId == id && x.ValidTo == null).ToListAsync(ct);
    public Task<User?> User(int id, CancellationToken ct) => db.Users.Include(x => x.RoleAssignments).ThenInclude(x => x.Role)
        .Include(x => x.RoleAssignments).ThenInclude(x => x.Sources).ThenInclude(x => x.Appointment).ThenInclude(x => x!.Position).ThenInclude(x => x.Department)
        .SingleOrDefaultAsync(x => x.UserId == id, ct);
    public void AddAppointment(StaffAppointment appointment) => db.StaffAppointments.Add(appointment);
    public void AddPolicy(PositionAccessPolicy policy) => db.PositionAccessPolicies.Add(policy);
    public async Task<HashSet<string>> ExistingPermissionCodes(CancellationToken ct) =>
        await db.Permissions.AsNoTracking().Select(x => x.Code).ToHashSetAsync(ct);
    public async Task SavePermissions(PositionAccessPolicy policy, string[] permissionCodes, CancellationToken ct)
    {
        if (permissionCodes.Length == 0) return;
        // The permission rows must be tracked so the join rows are inserted with the right keys.
        var permissions = await db.Permissions.Where(x => permissionCodes.Contains(x.Code)).ToListAsync(ct);
        foreach (var permission in permissions)
            policy.Permissions.Add(new PositionPolicyPermission { Policy = policy, Permission = permission, PermissionId = permission.PermissionId });
        await db.SaveChangesAsync(ct);
    }
    public async Task InvalidateSessions(int userId, DateTime now, CancellationToken ct)
    {
        foreach (var session in await db.UserSessions.Where(x => x.UserId == userId && x.IsActive).ToListAsync(ct)) { session.IsActive = false; session.LogoutAt = now; }
        foreach (var otp in await db.PasswordResetOtps.Where(x => x.UserId == userId && x.UsedAt == null).ToListAsync(ct)) otp.UsedAt = now;
    }
}
