namespace TekyLearningHub.Application.DTOs.Auth;

public class UserDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public byte RoleId { get; set; }
    public string[] Roles { get; set; } = [];
    public AccountAccessDto Access { get; set; } = AccountAccessDto.Empty;
    public string? AvatarUrl { get; set; }
    public string? Phone { get; set; }
    public string? Bio { get; set; }
    public string Status { get; set; } = "Active";
    public string ThemeMode { get; set; } = "Light";
}

