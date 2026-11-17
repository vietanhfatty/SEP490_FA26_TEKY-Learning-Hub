using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface IStudentAssessmentsService {
 Task<StudentAssessmentSummary[]> List(int studentId,CancellationToken ct);
 Task<StudentAssessmentDetail?> Detail(int studentId,int id,CancellationToken ct);
 Task<StudentAssessmentOutcome> Start(int studentId,int id,CancellationToken ct);
 Task<StudentAssessmentOutcome> Submit(int studentId,int id,int[]? answers,CancellationToken ct);
}
public interface IStudentAssessmentsRepository {
 Task<List<AssessmentPaper>> List(int studentId,CancellationToken ct);
 Task<AssessmentPaper?> Find(int studentId,int id,CancellationToken ct);
 void Add(AssessmentAttempt attempt);void Detach(AssessmentAttempt attempt);
 Task<int> Submit(int studentId,int id,DateTime submitted,int correct,string json,CancellationToken ct);
}
