using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Admin;
public interface IUserAdministrationRepository
{
    Task<bool> CanManage(int actor, CancellationToken ct);
    Task<User?> Load(int id, CancellationToken ct);
    Task<(int total, List<User> users)> List(string? q, string? status, byte? roleId, int? departmentId, int skip, int take, CancellationToken ct);
    Task<List<StaffAppointmentView>> Appointments(int id, CancellationToken ct);
    Task<AccountInvitation?> LatestInvitation(int id, CancellationToken ct);
    Task<AccountEmail?> LatestDelivery(string email, CancellationToken ct);
    Task<bool> DepartmentExists(int id, CancellationToken ct);
    Task EnsureStudentProfile(int id, string code, CancellationToken ct);
    Task EnsureTeacherProfile(int id, string code, CancellationToken ct);
    Task EnsureAdminProfile(int id, string code, CancellationToken ct);
    Task EnsureParentProfile(int id, CancellationToken ct);
    Task<bool> EmailExists(string email, CancellationToken ct);
    Task<bool> RecentInvitation(int id, DateTime now, CancellationToken ct);
    Task<List<AccountInvitation>> OpenInvitations(int id, CancellationToken ct);
    Task<List<UserSession>> ActiveSessions(int id, CancellationToken ct);
    Task<List<PasswordResetOtp>> UnusedOtps(int id, CancellationToken ct);
    Task<bool> HasActiveAdmin(CancellationToken ct);
    Task<bool> PhoneExists(int id, string phone, CancellationToken ct);
    Task<AccountInvitation?> FindInvitation(string hash, CancellationToken ct);
    Task<bool> HasPrimaryGrant(User user, CancellationToken ct);
    Task<AdministrationCatalog> Catalog(CancellationToken ct);
    Task<AuditPage> AuditEvents(int id, int skip, int take, CancellationToken ct);
    Task<int> EndAppointment(int id, long endId, CancellationToken ct);
    Task<bool> PositionExists(int id, CancellationToken ct);
    Task<int> AddAppointment(int id, AppointmentRequest r, CancellationToken ct);
    /// <summary>Resolves the code of a department, used to build position codes.</summary>
    Task<string?> DepartmentCode(int id, CancellationToken ct);
    /// <summary>Checks that a position belongs to the given department.</summary>
    Task<bool> PositionBelongsToDepartment(int positionId, int departmentId, CancellationToken ct);
    Task<bool> DirectoryCodeExists(string kind, string? code, int? departmentId, CancellationToken ct);
    Task<int> WriteDirectory(string kind, int? id, DirectoryRequest r, CancellationToken ct);
    void AddUser(User entity);
    void AddAudit(AuditLog entity);
    void AddInvitation(AccountInvitation entity);
}
