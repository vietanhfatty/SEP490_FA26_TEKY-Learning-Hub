using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Quartz;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Application.Services.Backoffice;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Repositories.Admin;
using TekyLearningHub.Infrastructure.Repositories.Auth;
using TekyLearningHub.Infrastructure.Repositories.Backoffice;
using TekyLearningHub.Infrastructure.Repositories.Portal;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Services;
using TekyLearningHub.Infrastructure.Services.Auth;
using TekyLearningHub.Infrastructure.Storage;
using TekyLearningHub.Infrastructure.Jobs;

namespace TekyLearningHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=.\\SQLEXPRESS;Database=Teky_Learning_Hub;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";

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



        services.AddScoped<TekyLearningHubContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        services.AddScoped<IAcademicPermissionReader, AcademicPermissionReader>();





        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAccountEmailOutbox, AccountEmailOutbox>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<IShellSessionRepository, ShellSessionRepository>();
        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<IUserAdministrationRepository, UserAdministrationRepository>();
        services.AddScoped<IStudentClassesRepository, StudentClassesRepository>();
        services.AddScoped<IStudentLearningRepository, StudentLearningRepository>();
        services.AddScoped<IProjectReviewRepository, ProjectReviewRepository>();
        services.AddSingleton<IAvatarStorage, AvatarStorage>();
        services.AddSingleton<ITransferTicketStore, TransferTicketStore>();
        services.AddSingleton(new AccountOptions { InvitationBaseUrl = configuration["Account:InvitationBaseUrl"] });
        services.AddSingleton(new ShellOptions { PortalOrigin = configuration["Shells:PortalOrigin"] ?? "http://localhost:3000", BackofficeOrigin = configuration["Shells:BackofficeOrigin"] ?? "http://localhost:3001" });
        services.AddDataProtection();
        services.AddHostedService<AccountEmailWorker>();

        services.AddScoped<IStudentAssessmentsRepository, StudentAssessmentsRepository>();
        services.AddScoped<IStudentOverviewRepository, StudentOverviewRepository>();
        services.AddScoped<ITeacherRepository, TeacherRepository>();
        services.AddScoped<ILeaderboardRepository, LeaderboardRepository>();
        services.AddScoped<IParentRepository, ParentRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IClassroomRealtimeService, ClassroomRealtimeService>();
        services.AddScoped<IAiAssistantService, AiAssistantService>();
        services.AddScoped<IExcelExportService, ExcelExportService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<AstAnalysisService>();

        // SignalR: phòng Lab, cheer box và thông báo thời gian thực.
        services.AddSignalR();

        // Job nền: tính bảng xếp hạng tuần và trao thưởng XP mỗi sáng thứ Hai.
        services.AddQuartz(q =>
        {
            q.AddJob<WeeklyLeaderboardJob>(job => job.WithIdentity("weekly-leaderboard"));
            q.AddTrigger(trigger => trigger
                .ForJob("weekly-leaderboard")
                .WithSchedule(CronScheduleBuilder.CronSchedule("0 0 3 ? * MON")
                    .WithMisfireHandlingInstructionFireAndProceed()));
        });
        services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

        // AddInfrastructure có thể được dùng ngoài host (ví dụ test DI chỉ dựng ServiceCollection),
        // nên cung cấp IHostApplicationLifetime tối thiểu khi chưa có đăng ký nào.
        if (!services.Any(descriptor => descriptor.ServiceType == typeof(IHostApplicationLifetime)))
            services.AddSingleton<IHostApplicationLifetime, HostApplicationLifetimeStub>();

        return services;
    }

    /// <summary>Vòng đời ứng dụng tối thiểu cho môi trường không có host thật.</summary>
    private sealed class HostApplicationLifetimeStub : IHostApplicationLifetime, IDisposable
    {
        private readonly CancellationTokenSource _stopping = new();
        public CancellationToken ApplicationStarted => CancellationToken.None;
        public CancellationToken ApplicationStopping => _stopping.Token;
        public CancellationToken ApplicationStopped => _stopping.Token;
        public CancellationToken ShutdownRequested => _stopping.Token;
        public void StopApplication() => _stopping.Cancel();
        public void Dispose() => _stopping.Dispose();
    }
}
