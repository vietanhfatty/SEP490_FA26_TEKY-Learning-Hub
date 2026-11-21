using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using FluentValidation;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Application.Services.Admin;
using TekyLearningHub.Application.Services.Auth;
using TekyLearningHub.Application.Services.Backoffice;
using TekyLearningHub.Application.Services.Portal;

namespace TekyLearningHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IShellTransferService, ShellTransferService>();
        services.AddScoped<ISessionValidationService, SessionValidationService>();
        services.AddScoped<ICourseService, CourseService>();
        services.AddScoped<IAcademicService, AcademicService>();
        services.AddScoped<IUserAdministrationService, UserAdministrationService>();
        services.AddScoped<IStaffAccessService, StaffAccessService>();
        services.AddScoped<IStudentClassesService, StudentClassesService>();
        services.AddScoped<IStudentLearningService, StudentLearningService>();
        services.AddScoped<IProjectReviewService, ProjectReviewService>();
        services.AddScoped<IStudentAssessmentsService, StudentAssessmentsService>();
        services.AddScoped<IStudentOverviewService, StudentOverviewService>();
        services.AddScoped<ITeacherService, TeacherService>();
        services.AddScoped<IParentService, ParentService>();
        services.AddScoped<ILearningMessageService, LearningMessageService>();
        services.AddScoped<IParentLearningService, ParentLearningService>();
        services.AddScoped<IParentCommerceService, ParentCommerceService>();
        services.AddScoped<IParentCheckoutService, ParentCheckoutService>();
        services.AddScoped<IAstAnalysisService, AstAnalysisService>();
        return services;
    }
}

