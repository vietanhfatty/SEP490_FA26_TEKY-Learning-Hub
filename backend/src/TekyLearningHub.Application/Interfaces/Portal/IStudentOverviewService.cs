using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface IStudentOverviewService {
 Task<StudentOverviewDto?> Overview(int userId,CancellationToken ct);
 Task<StudentClassDetailsDto?> ClassDetails(int userId,int classId,CancellationToken ct);
}
public interface IStudentOverviewRepository {
 Task<StudentIdentityDto?> Identity(int userId,CancellationToken ct);
 Task<StudentOverviewMetrics> Metrics(int userId,List<int> courseIds,List<int> activeIds,DateTime start,DateTime end,CancellationToken ct);
 Task<ClassEnrollmentRow?> Enrollment(int userId,int classId,CancellationToken ct);
 Task<ClassNoticeData> Notices(int userId,int classId,CancellationToken ct);
 Task<List<StudentClassMaterialDto>> Materials(int classId,int courseId,CancellationToken ct);
}
