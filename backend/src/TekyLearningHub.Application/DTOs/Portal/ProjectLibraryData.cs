using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.DTOs.Portal;

public record FileProjectRow(int AssignmentId,string Title,string ClassCode,string CourseName,DateTime SubmittedAt,int AttemptNo,string ReviewStatus,string FileName,string? Feedback);
public record PortfolioProjectRow(int AssignmentId,string Title,string ClassCode,string CourseName,DateTime SubmittedAt,int AttemptNo,string? Summary,decimal MaxScore,bool Finalized,decimal? Score,string? Feedback);
public record ProjectLibraryData(List<FileProjectRow> Files,List<PortfolioProjectRow> Portfolio);
