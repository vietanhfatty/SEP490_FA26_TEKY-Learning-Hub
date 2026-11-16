using System.ComponentModel.DataAnnotations;

namespace TekyLearningHub.Application.DTOs.Auth;

public sealed class AcceptInvitationRequest
{
    [Required,StringLength(128)] public string Token { get; set; } = "";
    [Required,MinLength(12)] public string NewPassword { get; set; } = "";
    [Required,Compare(nameof(NewPassword))] public string ConfirmPassword { get; set; } = "";
}
