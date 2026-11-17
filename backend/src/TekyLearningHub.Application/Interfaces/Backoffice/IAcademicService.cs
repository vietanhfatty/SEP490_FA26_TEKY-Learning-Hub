using TekyLearningHub.Application.DTOs.Backoffice;
namespace TekyLearningHub.Application.Interfaces.Backoffice;

public interface IAcademicService
{
    Task<AcademicWorkspace> Workspace(int actor, DateOnly from, DateOnly to, CancellationToken ct);
    Task<AcademicMutation> SaveClass(int actor, AcademicClassDraft draft, CancellationToken ct);
    Task<AcademicMutation> PlaceStudent(int actor, AcademicPlacement draft, CancellationToken ct);
    Task<AcademicMutation> AssignTeacher(int actor, AcademicTeacherAssignment draft, CancellationToken ct);
    Task<AcademicMutation> SaveAvailability(int actor, AcademicAvailabilityDraft draft, CancellationToken ct);
    Task<AcademicMutation> SaveSession(int actor, AcademicSessionDraft draft, CancellationToken ct);
    Task<AcademicMutation> SaveRoom(int actor, AcademicRoomDraft draft, CancellationToken ct);
    Task<AcademicMutation> ReviewCourse(int actor, AcademicReview draft, CancellationToken ct);
    Task<AcademicMutation> ReviewRegistration(int actor, AcademicRegistrationReview draft, CancellationToken ct);
    Task<AcademicMutation> ReviewMakeup(int actor, AcademicMakeupReview draft, CancellationToken ct);
    Task<AcademicMutation> SaveEquipment(int actor, AcademicEquipmentDraft draft, CancellationToken ct);
}
public interface IAcademicRepository : IAcademicService { }

public sealed class AcademicPersistenceException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
