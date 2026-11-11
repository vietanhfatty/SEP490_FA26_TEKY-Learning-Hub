using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Quartz;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Jobs;
using TekyLearningHub.Infrastructure.Services;

namespace TekyLearningHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Server=(localdb)\\mssqllocaldb;Database=TekyLearningHubDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(connectionString, b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        // Services
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
                .WithCronSchedule("0 0 0 ? * SUN")); // Every Sunday at 00:00
        });

        services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

        // SignalR
        services.AddSignalR();

        return services;
    }
}
