using FluentValidation;
using TekyLearningHub.Application.DTOs.Auth;

namespace TekyLearningHub.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequestDto>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.EmailOrUsername)
            .NotEmpty().WithMessage("Vui lòng nhập Email hoặc Mã tài khoản.")
            .MinimumLength(3).WithMessage("Email hoặc Mã tài khoản phải có ít nhất 3 ký tự.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.")
            .MinimumLength(6).WithMessage("Mật khẩu phải có ít nhất 6 ký tự.");
    }
}

