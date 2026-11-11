using Microsoft.Extensions.DependencyInjection;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Services;

namespace TekyLearningHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAstAnalysisService, AstAnalysisService>();
        services.AddScoped<ITeacherService, TeacherService>();
        services.AddScoped<IParentService, ParentService>();

        return services;
    }
}
