using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Interfaces.Portal;

public interface IStudentClassesRepository
{
    Task<StudentIdentity?> Student(int userId, CancellationToken cancellationToken);
    Task<bool> IsStudent(int userId, CancellationToken cancellationToken);
    Task<List<Enrollment>> EnrolledClasses(int userId, CancellationToken cancellationToken);
    Task<ClassSession?> Session(int userId, int sessionId, CancellationToken cancellationToken);
    Task<bool> ActiveEnrollment(int userId, int classId, CancellationToken cancellationToken);
    Task<Assignment?> WritableAssignment(int userId, int? sessionId, int assignmentId, CancellationToken cancellationToken);
    Task<StudentProjectSubmission?> Submission(int userId, int assignmentId, CancellationToken cancellationToken);
    void AddVersion(StudentProjectVersion entity); void AddSubmission(StudentProjectSubmission entity); void Detach(StudentProjectSubmission entity);
    Task<StudentProjectFile?> File(int userId, int? sessionId, int assignmentId, CancellationToken cancellationToken);
 Task<List<StudentAssignmentRow>> AssignmentRows(int userId,int? sessionId,int? assignmentId,CancellationToken cancellationToken);
 Task<List<StudentProjectVersion>> Versions(int userId,int assignmentId,CancellationToken cancellationToken);
 Task<ProjectLibraryData> Projects(int userId,CancellationToken cancellationToken);
 Task<bool> HasCodeSubmission(int userId,int assignmentId,CancellationToken cancellationToken);
}
