using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;

namespace TekyLearningHub.Application.Services.Portal;

public sealed class ParentCommerceService(IParentCommerceRepository repository, IParentLearningService learning)
    : IParentCommerceService
{
    public Task<IReadOnlyList<ParentCourseDto>> Catalogue(CancellationToken ct) => repository.Catalogue(ct);
    public Task<ParentCourseDetailDto?> Course(int courseId, CancellationToken ct) => repository.Course(courseId, ct);

    public async Task<IReadOnlyList<ParentCourseRequestDto>?> Requests(int parentId, int studentId, CancellationToken ct) =>
        await Linked(parentId, studentId, ct) ? await repository.Requests(parentId, studentId, ct) : null;

    public async Task<ParentChange> Register(int parentId, int studentId, int classId, CancellationToken ct)
    {
        if (classId < 1) return ParentChange.Invalid;
        if (!await Linked(parentId, studentId, ct)) return ParentChange.NotFound;
        return await repository.Register(parentId, studentId, classId, ct) ? ParentChange.Saved : ParentChange.Unavailable;
    }

    public async Task<IReadOnlyList<ParentPaymentDto>?> Payments(int parentId, int studentId, CancellationToken ct) =>
        await Linked(parentId, studentId, ct) ? await repository.Payments(parentId, studentId, ct) : null;

    public async Task<ParentPaymentDto?> Invoice(int parentId, int studentId, int paymentId, CancellationToken ct)
    {
        if (!await Linked(parentId, studentId, ct)) return null;
        var payment = await repository.Payment(parentId, studentId, paymentId, ct);
        return payment is { Status: "Paid" or "Refunded", InvoiceNumber: not null } ? payment : null;
    }

    public async Task<ParentChange> Refund(int parentId, int studentId, int paymentId, string? reason, CancellationToken ct)
    {
        var cleaned = reason?.Trim();
        if (cleaned is null || cleaned.Length is < 5 or > 500) return ParentChange.Invalid;
        if (!await Linked(parentId, studentId, ct) || await repository.Payment(parentId, studentId, paymentId, ct) is null)
            return ParentChange.NotFound;
        return await repository.Refund(parentId, studentId, paymentId, cleaned, ct) ? ParentChange.Saved : ParentChange.Unavailable;
    }

    private async Task<bool> Linked(int parentId, int studentId, CancellationToken ct) =>
        (await learning.Children(parentId, ct)).Any(child => child.StudentId == studentId);
}
