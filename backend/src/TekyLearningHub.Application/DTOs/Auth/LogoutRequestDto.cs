namespace TekyLearningHub.Application.DTOs.Auth;

public class LogoutRequestDto
{
    public string? RefreshToken { get; set; }

    public bool AllDevices { get; set; } = false;
}
