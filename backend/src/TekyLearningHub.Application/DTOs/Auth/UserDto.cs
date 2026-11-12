namespace TekyLearningHub.Application.DTOs.Auth;

public class UserDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public byte RoleId { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Phone { get; set; }
    public string Status { get; set; } = "Active";
    public string ThemeMode { get; set; } = "Light";
}

