using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.DTOs.Auth;

namespace TekyLearningHub.Application.Interfaces.Admin;
public interface IUserAdministrationService
{
    Task<ManagedUserPage> List(int actor, string? q, string? status, byte? roleId, int? departmentId, int skip, int take, CancellationToken ct = default);
    Task<ManagedUserDetail> Detail(int actor, int id, CancellationToken ct = default);
    Task<CreatedUserResult> Create(int actor, CreateUserRequest r, CancellationToken ct = default);
    Task<AdministrationMessage> Resend(int actor, int id, UserMutationRequest r, CancellationToken ct = default);
    Task<AdministrationVersion> Mutate(int actor, int id, string operation, UserMutationRequest r, long? grantId = null, CancellationToken ct = default);
    Task<AdministrationVersion> Update(int actor, int id, UpdateUserRequest r, CancellationToken ct = default);
    Task<AdministrationMessage> Accept(AcceptInvitationRequest r, CancellationToken ct = default);
    Task<AdministrationCatalog> Catalog(int actor, CancellationToken ct = default);
    Task<AuditPage> AuditEvents(int actor, int id, int skip, int take, CancellationToken ct = default);
    Task<AdministrationSuccess> Appointment(int actor, int id, AppointmentRequest r, long? endId, CancellationToken ct = default);
    Task<AdministrationSuccess> Directory(int actor, string kind, int? id, DirectoryRequest r, CancellationToken ct = default);
}
