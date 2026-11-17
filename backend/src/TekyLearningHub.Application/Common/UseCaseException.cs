namespace TekyLearningHub.Application.Common;

public class UseCaseException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
