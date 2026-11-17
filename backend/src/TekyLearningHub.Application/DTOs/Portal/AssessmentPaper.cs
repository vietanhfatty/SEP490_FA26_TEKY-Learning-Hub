using TekyLearningHub.Application.DTOs.Portal;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.DTOs.Portal;
    public sealed record AssessmentPaper
    {
        public required Assessment Assessment { get; init; }
        public required string ClassCode { get; init; }
        public required string CourseName { get; init; }
        public bool Active { get; init; }
        public AssessmentAttempt? Attempt { get; init; }
    }
