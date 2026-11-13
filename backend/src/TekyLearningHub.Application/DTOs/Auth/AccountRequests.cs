using System.ComponentModel.DataAnnotations;
namespace TekyLearningHub.Application.DTOs.Auth;
public class ForgotPasswordRequest { [Required, EmailAddress] public string Email { get; set; } = ""; }
public class ResetPasswordRequest : ForgotPasswordRequest {
 [Required, RegularExpression(@"^\d{6}$")] public string Otp { get; set; } = "";
 [Required, MinLength(12)] public string NewPassword { get; set; } = "";
 [Required, Compare(nameof(NewPassword))] public string ConfirmPassword { get; set; } = "";
}
public class ChangePasswordRequest {
 [Required] public string CurrentPassword { get; set; } = "";
 [Required, MinLength(12)] public string NewPassword { get; set; } = "";
 [Required, Compare(nameof(NewPassword))] public string ConfirmPassword { get; set; } = "";
}
public class UpdateProfileRequest {
 [Required, StringLength(120, MinimumLength=1)] public string FullName { get; set; } = "";
 [StringLength(20), Phone] public string? Phone { get; set; }
 [StringLength(1000)] public string? Bio { get; set; }
}
