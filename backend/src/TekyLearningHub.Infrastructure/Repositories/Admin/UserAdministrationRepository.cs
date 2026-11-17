using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Repositories.Admin;
public sealed class UserAdministrationRepository(ApplicationDbContext db) : IUserAdministrationRepository
{
    public async Task<bool> CanManage(int actor, CancellationToken ct) => await (from g in db.UserRoles
                                                                                 join rp in db.RolePermissions on g.RoleId equals rp.RoleId
                                                                                 join p in db.Permissions on rp.PermissionId equals p.PermissionId
                                                                                 where g.UserId == actor && g.User.Status == "Active" && !g.User.ActivationPending
                                                                                     && g.RevokedAt == null && g.ScopeType == "GLOBAL" && p.Code == "identity.manage"
                                                                                 select g.UserRoleId).AnyAsync(ct);
    public async Task<User?> Load(int id, CancellationToken ct) => await db.Users.Include(x => x.RoleAssignments).ThenInclude(x => x.Role)
               .Include(x => x.PrimaryRole).SingleOrDefaultAsync(x => x.UserId == id, ct);
    public async Task<(int total, List<User> users)> List(string? q, string? status, byte? roleId, int? departmentId, int skip, int take, CancellationToken ct)
    {
        var query = db.Users.AsNoTracking().Include(x => x.PrimaryRole).Include(x => x.RoleAssignments).ThenInclude(x => x.Role).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) { q = q.Trim(); query = query.Where(x => x.Email.Contains(q) || x.FullName.Contains(q)); }
        if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.Status == status);
        if (roleId.HasValue) query = query.Where(x => x.RoleAssignments.Any(g => g.RoleId == roleId && g.RevokedAt == null));
        if (departmentId.HasValue) query = query.Where(x => x.RoleAssignments.Any(g => g.DepartmentId == departmentId && g.RevokedAt == null));
        var total = await query.CountAsync(ct);
        var users = await query.OrderBy(x => x.UserId).Skip(Math.Max(0, skip)).Take(Math.Clamp(take, 1, 100)).ToListAsync(ct);
        return (total, users);
    }
    public async Task<List<StaffAppointmentView>> Appointments(int id, CancellationToken ct) => await db.Database.SqlQuery<StaffAppointmentView>($"""
            SELECT a.AppointmentId,a.DepartmentId,a.PositionId,d.Name AS Department,p.Name AS Position,
              a.EmploymentType,a.ValidFrom,a.ValidTo FROM dbo.StaffAppointments a
            JOIN dbo.Departments d ON d.DepartmentId=a.DepartmentId JOIN dbo.Positions p ON p.PositionId=a.PositionId
            WHERE a.UserId={id} ORDER BY a.ValidFrom DESC
            """).ToListAsync(ct);
    public Task<AccountInvitation?> LatestInvitation(int id, CancellationToken ct) => db.AccountInvitations.AsNoTracking().Where(x => x.UserId == id).OrderByDescending(x => x.Id).FirstOrDefaultAsync(ct);
    public Task<AccountEmail?> LatestDelivery(string email, CancellationToken ct) => db.AccountEmails.AsNoTracking().Where(x => x.Recipient == email && x.Subject == "TEKY - Kích hoạt tài khoản").OrderByDescending(x => x.Id).FirstOrDefaultAsync(ct);
    public async Task<bool> DepartmentExists(int id, CancellationToken ct) => await db.Database.SqlQuery<int>($"SELECT DepartmentId AS Value FROM dbo.Departments WHERE DepartmentId={id} AND IsActive=1").AnyAsync(ct);
    public async Task EnsureStudentProfile(int id, string code, CancellationToken ct) => await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles WHERE UserId={id}) INSERT dbo.StudentProfiles(UserId,StudentCode) VALUES({id},{code});", ct);
    public async Task EnsureTeacherProfile(int id, string code, CancellationToken ct) => await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.TeacherProfiles WHERE UserId={id}) INSERT dbo.TeacherProfiles(UserId,TeacherCode) VALUES({id},{code});", ct);
    public async Task EnsureAdminProfile(int id, string code, CancellationToken ct) => await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.AdminProfiles WHERE UserId={id}) INSERT dbo.AdminProfiles(UserId,StaffCode) VALUES({id},{code});", ct);
    public async Task EnsureParentProfile(int id, CancellationToken ct) => await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.ParentProfiles WHERE UserId={id}) INSERT dbo.ParentProfiles(UserId) VALUES({id});", ct);
    public async Task<bool> EmailExists(string email, CancellationToken ct) => await db.Users.AnyAsync(x => x.Email.Trim().ToLower() == email, ct);
    public async Task<bool> RecentInvitation(int id, DateTime now, CancellationToken ct) => await db.AccountInvitations.AnyAsync(x => x.UserId == id && x.CreatedAt > now.AddSeconds(-60), ct);
    public async Task<List<AccountInvitation>> OpenInvitations(int id, CancellationToken ct) => await db.AccountInvitations.Where(x => x.UserId == id && x.UsedAt == null && x.RevokedAt == null).ToListAsync(ct);
    public async Task<List<UserSession>> ActiveSessions(int id, CancellationToken ct) => await db.UserSessions.Where(x => x.UserId == id && x.IsActive).ToListAsync(ct);
    public async Task<List<PasswordResetOtp>> UnusedOtps(int id, CancellationToken ct) => await db.PasswordResetOtps.Where(x => x.UserId == id && x.UsedAt == null).ToListAsync(ct);
    public async Task<bool> HasActiveAdmin(CancellationToken ct) => await db.UserRoles.AnyAsync(g => g.RoleId == 3 && g.ScopeType == "GLOBAL" && g.RevokedAt == null && g.User.Status == "Active" && !g.User.ActivationPending, ct);
    public async Task<bool> PhoneExists(int id, string phone, CancellationToken ct) => await db.Users.AnyAsync(x => x.UserId != id && x.Phone == phone, ct);
    public async Task<AccountInvitation?> FindInvitation(string hash, CancellationToken ct) => await db.AccountInvitations.Include(x => x.User).SingleOrDefaultAsync(x => x.TokenHash == hash && x.UsedAt == null && x.RevokedAt == null, ct);
    public async Task<bool> HasPrimaryGrant(User user, CancellationToken ct) => await db.UserRoles.AnyAsync(g => g.UserId == user.UserId && g.RoleId == user.PrimaryRoleId && g.RevokedAt == null, ct);
    public async Task<AdministrationCatalog> Catalog(CancellationToken ct)
    {
        var roles = await db.Roles.AsNoTracking().OrderBy(x => x.RoleId).Select(x => new RoleCatalogDto(x.RoleId, x.RoleName)).ToListAsync(ct);
        var permissions = await (from rp in db.RolePermissions join p in db.Permissions on rp.PermissionId equals p.PermissionId select new RolePermissionDto(rp.RoleId, p.Code, p.Description)).ToListAsync(ct);
        var departments = await db.Database.SqlQuery<DirectoryEntry>($"SELECT DepartmentId AS Id,Code,Name,IsActive,CAST(NULL AS int) AS DepartmentId,CAST('' AS nvarchar(160)) AS DepartmentName FROM dbo.Departments ORDER BY Name").ToListAsync(ct);
        var positions = await db.Database.SqlQuery<DirectoryEntry>($"SELECT p.PositionId AS Id,p.Code,p.Name,p.IsActive,p.DepartmentId,d.Name AS DepartmentName FROM dbo.Positions p JOIN dbo.Departments d ON d.DepartmentId=p.DepartmentId ORDER BY d.Name,p.Name").ToListAsync(ct);
        return new AdministrationCatalog(roles, permissions, departments, positions);
    }
    public async Task<AuditPage> AuditEvents(int id, int skip, int take, CancellationToken ct)
    {
        var key = id.ToString(); var query = db.AuditLogs.AsNoTracking().Where(x => x.EntityType == "User" && x.EntityId == key);
        return new AuditPage(await query.CountAsync(ct), await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.AuditId).Skip(Math.Max(skip, 0)).Take(Math.Clamp(take, 1, 100)).Select(x => new AuditEventDto(x.ActorUserId, x.Action, x.OldValue, x.NewValue, x.CreatedAt)).ToListAsync(ct));
    }
    public async Task<int> EndAppointment(int id, long endId, CancellationToken ct) => await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE dbo.StaffAppointments SET ValidTo=SYSUTCDATETIME() WHERE AppointmentId={endId} AND UserId={id} AND ValidTo IS NULL", ct);
    public async Task<bool> PositionExists(int id, CancellationToken ct) => await db.Database.SqlQuery<int>($"SELECT PositionId AS Value FROM dbo.Positions WHERE PositionId={id} AND IsActive=1").AnyAsync(ct);
    public async Task<string?> DepartmentCode(int id, CancellationToken ct) => await db.Database.SqlQuery<string>($"SELECT Code AS Value FROM dbo.Departments WHERE DepartmentId={id}").SingleOrDefaultAsync(ct);
    public async Task<bool> PositionBelongsToDepartment(int positionId, int departmentId, CancellationToken ct) => await db.Database.SqlQuery<int>($"SELECT PositionId AS Value FROM dbo.Positions WHERE PositionId={positionId} AND DepartmentId={departmentId}").AnyAsync(ct);
    public async Task<int> AddAppointment(int id, AppointmentRequest r, CancellationToken ct) => await db.Database.ExecuteSqlInterpolatedAsync($"INSERT dbo.StaffAppointments(UserId,DepartmentId,PositionId,EmploymentType) VALUES({id},{r.DepartmentId},{r.PositionId},{r.EmploymentType})", ct);
    public async Task<bool> DirectoryCodeExists(string kind, string? code, int? departmentId, CancellationToken ct) => kind == "departments"
                   ? await db.Database.SqlQuery<int>($"SELECT DepartmentId AS Value FROM dbo.Departments WHERE Code={code}").AnyAsync(ct)
                   : await db.Database.SqlQuery<int>($"SELECT PositionId AS Value FROM dbo.Positions WHERE Code={code} AND DepartmentId={departmentId}").AnyAsync(ct);
    public async Task<int> WriteDirectory(string kind, int? id, DirectoryRequest r, CancellationToken ct)
    {
        int changed; try
        {
            if (kind == "departments") changed = id.HasValue
                   ? await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE dbo.Departments SET Name={r.Name.Trim()},IsActive={r.IsActive} WHERE DepartmentId={id.Value}", ct)
                   : await db.Database.ExecuteSqlInterpolatedAsync($"INSERT dbo.Departments(Code,Name,IsActive) VALUES({r.Code},{r.Name.Trim()},{r.IsActive})", ct);
            else changed = id.HasValue
                ? await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE dbo.Positions SET Name={r.Name.Trim()},IsActive={r.IsActive},DepartmentId={r.DepartmentId} WHERE PositionId={id.Value}", ct)
                : await db.Database.ExecuteSqlInterpolatedAsync($"INSERT dbo.Positions(Code,Name,IsActive,DepartmentId) VALUES({r.Code},{r.Name.Trim()},{r.IsActive},{r.DepartmentId})", ct); return changed;
        }
        catch (SqlException e) when (e.Number is 2601 or 2627) { throw new PersistenceConflictException("Duplicate directory code", true, e); }
    }
    public void AddUser(User entity) => db.Users.Add(entity);
    public void AddAudit(AuditLog entity) => db.AuditLogs.Add(entity);
    public void AddInvitation(AccountInvitation entity) => db.AccountInvitations.Add(entity);
}
