using TekyLearningHub.Application.Common;
using TekyLearningHub.Application.DTOs.Backoffice;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces.Backoffice;
namespace TekyLearningHub.Application.Services.Backoffice;

public sealed class AcademicService(IAcademicRepository repository, IAccountAccessReader access) : IAcademicService
{
    public Task<AcademicWorkspace> Workspace(int actor, DateOnly from, DateOnly to, CancellationToken ct)
    {
        if (to < from || to.DayNumber - from.DayNumber > 93) throw new UseCaseException(400, "Khoảng lịch tối đa 93 ngày.");
        return Run(actor, () => repository.Workspace(actor, from, to, ct), ct);
    }
    public Task<AcademicMutation> SaveClass(int actor, AcademicClassDraft draft, CancellationToken ct)
    {
        if (draft.StartDate > draft.EndDate || draft.MaxStudents is < 1 or > 500 ||
            !new[] { "Planned", "Open", "Closed", "Completed", "Cancelled" }.Contains(draft.Status))
            throw new UseCaseException(400, "Kiểm tra thời gian, sĩ số và trạng thái lớp.");
        if (draft.Status == "Cancelled" && string.IsNullOrWhiteSpace(draft.Reason))
            throw new UseCaseException(400, "Cần lý do hủy lớp.");
        return Run(actor, () => repository.SaveClass(actor, draft, ct), ct);
    }
    public Task<AcademicMutation> PlaceStudent(int actor, AcademicPlacement draft, CancellationToken ct)
    {
        if (draft.ClassId == draft.FromClassId || draft.StudentId < 1 || draft.ClassId < 1)
            throw new UseCaseException(400, "Kiểm tra lớp đích và học sinh.");
        return Run(actor, () => repository.PlaceStudent(actor, draft, ct), ct);
    }
    public Task<AcademicMutation> AssignTeacher(int actor, AcademicTeacherAssignment draft, CancellationToken ct) =>
        Run(actor, () => repository.AssignTeacher(actor, draft, ct), ct);
    public Task<AcademicMutation> SaveAvailability(int actor, AcademicAvailabilityDraft draft, CancellationToken ct)
    {
        if (draft.Weekday is < 1 or > 7 || draft.StartsAt >= draft.EndsAt)
            throw new UseCaseException(400, "Kiểm tra thứ và giờ có thể giảng dạy.");
        return Run(actor, () => repository.SaveAvailability(actor, draft, ct), ct);
    }
    public Task<AcademicMutation> SaveSession(int actor, AcademicSessionDraft draft, CancellationToken ct)
    {
        if (draft.StartsAt >= draft.EndsAt || draft.ClassId < 1 || draft.Date == default)
            throw new UseCaseException(400, "Kiểm tra lớp, ngày và giờ học.");
        if (draft.SessionId.HasValue && string.IsNullOrWhiteSpace(draft.Reason))
            throw new UseCaseException(400, "Cần lý do thay đổi hoặc hủy buổi học.");
        return Run(actor, () => repository.SaveSession(actor, draft, ct), ct);
    }
    public Task<AcademicMutation> SaveRoom(int actor, AcademicRoomDraft draft, CancellationToken ct)
    {
        if (draft.Capacity is < 1 or > 500 || string.IsNullOrWhiteSpace(draft.RoomName) || draft.RoomName.Length > 50 ||
            !new[] { "Active", "Inactive" }.Contains(draft.Status))
            throw new UseCaseException(400, "Kiểm tra tên, trạng thái và sức chứa phòng.");
        return Run(actor, () => repository.SaveRoom(actor, draft, ct), ct);
    }
    public Task<AcademicMutation> ReviewCourse(int actor, AcademicReview draft, CancellationToken ct) =>
        Run(actor, () => repository.ReviewCourse(actor, draft, ct), ct);
    public Task<AcademicMutation> ReviewRegistration(int actor, AcademicRegistrationReview draft, CancellationToken ct) =>
        Run(actor, () => repository.ReviewRegistration(actor, draft, ct), ct);
    public Task<AcademicMutation> ReviewMakeup(int actor, AcademicMakeupReview draft, CancellationToken ct) =>
        Run(actor, () => repository.ReviewMakeup(actor, draft, ct), ct);
    public Task<AcademicMutation> SaveEquipment(int actor, AcademicEquipmentDraft draft, CancellationToken ct)
    {
        if (draft.PurchaseDate == default || draft.PurchaseDate > DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)) ||
            !new[] { "Available", "InUse", "Damaged", "Maintenance", "Lost", "Retired" }.Contains(draft.Status))
            throw new UseCaseException(400, "Kiểm tra ngày mua và tình trạng thiết bị.");
        return Run(actor, () => repository.SaveEquipment(actor, draft, ct), ct);
    }
    private async Task<T> Run<T>(int actor, Func<Task<T>> operation, CancellationToken ct)
    {
        var permissions = (await access.Read(actor, ct)).Permissions;
        if (!permissions.Any(p => p.Code == "academic.manage"))
            throw new UseCaseException(403, "Bạn chưa được cấp quyền vận hành đào tạo.");
        try { return await operation(); }
        catch (AcademicPersistenceException error) { throw new UseCaseException(error.Status, error.Message); }
    }
}
