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
    /// <summary>Activates or deactivates a department or job title.</summary>
    Task<AdministrationSuccess> DirectoryStatus(int actor, string kind, int id, DirectoryStatusRequest r, CancellationToken ct = default);
    /// <summary>Removes a department or job title. Refuses while anything still references it.</summary>
    Task<AdministrationSuccess> DirectoryDelete(int actor, string kind, int id, CancellationToken ct = default);
    /// <summary>Creates several staff accounts at once, each with a job title appointment.</summary>
    Task<BulkCreateResult> BulkCreate(int actor, BulkCreateUsersRequest r, CancellationToken ct = default);
    /// <summary>Excel template the admin fills in for a bulk import.</summary>
    Task<byte[]> BulkCreateTemplate(int actor, CancellationToken ct = default);
    /// <summary>Reads an uploaded Excel file into rows so the admin can preview them first.</summary>
    Task<BulkRowPreview[]> BulkCreatePreview(int actor, Stream content, CancellationToken ct = default);
}
