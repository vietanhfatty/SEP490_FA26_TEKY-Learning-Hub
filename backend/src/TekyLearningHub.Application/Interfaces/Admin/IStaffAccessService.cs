using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Admin;

public interface IStaffAccessService
{
    Task<PositionPolicyView[]> Policies(int actor, CancellationToken ct = default);
    Task<StaffPreview> PolicyPreview(int actor, int positionId, PolicyRequest request, CancellationToken ct = default);
    Task<PositionPolicyView> SavePolicy(int actor, int positionId, PolicyRequest request, CancellationToken ct = default);
    Task<PositionPolicyView> SavePosition(int actor, int? positionId, PositionSaveRequest request, CancellationToken ct = default);
    Task<StaffAccessState> State(int userId, CancellationToken ct = default);
    Task<RoleGrantRequest[]> Resolve(AppointmentInput[] appointments, CancellationToken ct = default);
    Task<StaffPreview> PreviewNew(int actor, AppointmentInput[] appointments, CancellationToken ct = default);
    Task Assign(int actor, User user, AppointmentInput appointment, CancellationToken ct = default);
    Task<StaffPreview> Preview(int actor, int userId, StaffChangeRequest request, CancellationToken ct = default);
    Task<AdministrationVersion> Change(int actor, int userId, StaffChangeRequest request, CancellationToken ct = default);
    Task<StaffPreview> ReconcilePreview(int actor, int userId, ReconcileStaffRequest request, CancellationToken ct = default);
    Task<AdministrationVersion> Reconcile(int actor, int userId, ReconcileStaffRequest request, CancellationToken ct = default);
    Task<StaffPreview> ExceptionPreview(int actor, int userId, StaffExceptionRequest request, CancellationToken ct = default);
    Task<AdministrationVersion> GrantException(int actor, int userId, StaffExceptionRequest request, CancellationToken ct = default);
}
