using TekyLearningHub.Application.DTOs.Portal;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface IParentCommerceService
{
    Task<IReadOnlyList<ParentCourseDto>> Catalogue(CancellationToken ct);
    Task<ParentCourseDetailDto?> Course(int courseId, CancellationToken ct);
    Task<IReadOnlyList<ParentCourseRequestDto>?> Requests(int parentId, int studentId, CancellationToken ct);
    Task<ParentChange> Register(int parentId, int studentId, int classId, CancellationToken ct);
    Task<IReadOnlyList<ParentPaymentDto>?> Payments(int parentId, int studentId, CancellationToken ct);
    Task<ParentPaymentDto?> Invoice(int parentId, int studentId, int paymentId, CancellationToken ct);
    Task<ParentChange> Refund(int parentId, int studentId, int paymentId, string? reason, CancellationToken ct);
}

public interface IParentCommerceRepository
{
    Task<IReadOnlyList<ParentCourseDto>> Catalogue(CancellationToken ct);
    Task<ParentCourseDetailDto?> Course(int courseId, CancellationToken ct);
    Task<IReadOnlyList<ParentCourseRequestDto>> Requests(int parentId, int studentId, CancellationToken ct);
    Task<bool> Register(int parentId, int studentId, int classId, CancellationToken ct);
    Task<IReadOnlyList<ParentPaymentDto>> Payments(int parentId, int studentId, CancellationToken ct);
    Task<ParentPaymentDto?> Payment(int parentId, int studentId, int paymentId, CancellationToken ct);
    Task<bool> Refund(int parentId, int studentId, int paymentId, string reason, CancellationToken ct);
}
