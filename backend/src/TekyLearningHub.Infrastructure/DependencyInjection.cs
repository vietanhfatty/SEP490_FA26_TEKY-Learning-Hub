using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Quartz;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Jobs;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Services;

namespace TekyLearningHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=localhost\\SQLEXPRESS02;Database=Teky_Learning_Hub;Integrated Security=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5),
                    errorNumbersToAdd: null);
            });
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<TekyLearningHubContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        // Auth & Student Services (Dev)
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IStudentClassesService, StudentClassesService>();
        services.AddDataProtection();
        services.AddHostedService<AccountEmailWorker>();

        // Teacher, Parent & Realtime Services (Mtien)
        services.AddScoped<IExcelExportService, ExcelExportService>();
        services.AddScoped<IAiAssistantService, AiAssistantService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IClassroomRealtimeService, ClassroomRealtimeService>();

        // Quartz.NET Background Scheduler (Sunday 00:00 Cron Job)
        services.AddQuartz(q =>
        {
            var jobKey = new JobKey("WeeklyLeaderboardJob");
            q.AddJob<WeeklyLeaderboardJob>(opts => opts.WithIdentity(jobKey));

            q.AddTrigger(opts => opts
                .ForJob(jobKey)
                .WithIdentity("WeeklyLeaderboardTrigger")
                .WithCronSchedule("0 0 0 ? * SUN"));
        });

        services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

        // SignalR
        services.AddSignalR();

        return services;
    }

    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration) =>
        services.AddInfrastructure(configuration);
}
