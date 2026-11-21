using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Admin;

public interface IStaffAccessRepository
{
    Task<Position[]> Positions(CancellationToken ct);
    Task<Dictionary<int, int>> AppointmentCounts(CancellationToken ct);
    Task<Position?> Position(int id, CancellationToken ct);
    Task<Department?> Department(int id, CancellationToken ct);
    void AddPosition(Position position);
    /// <summary>Permission codes that exist in the catalogue, so unknown codes are rejected.</summary>
    Task<HashSet<string>> ExistingPermissionCodes(CancellationToken ct);
    /// <summary>Persists the permission list attached to a job title policy.</summary>
    Task SavePermissions(PositionAccessPolicy policy, string[] permissionCodes, CancellationToken ct);
    Task<List<StaffAppointment>> Appointments(int userId, CancellationToken ct);
    Task<List<StaffAppointment>> PositionAppointments(int positionId, CancellationToken ct);
    Task<User?> User(int userId, CancellationToken ct);
    void AddAppointment(StaffAppointment appointment);
    void AddPolicy(PositionAccessPolicy policy);
    Task InvalidateSessions(int userId, DateTime now, CancellationToken ct);
}
