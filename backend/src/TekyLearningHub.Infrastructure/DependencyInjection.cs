using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Repositories.Admin;
using TekyLearningHub.Infrastructure.Repositories.Auth;
using TekyLearningHub.Infrastructure.Repositories.Backoffice;
using TekyLearningHub.Infrastructure.Repositories.Portal;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Services;
using TekyLearningHub.Infrastructure.Services.Auth;
using TekyLearningHub.Infrastructure.Services.Portal;
using TekyLearningHub.Infrastructure.Storage;
namespace TekyLearningHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSignalR();

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



        services.AddScoped<TekyLearningHubContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        services.AddScoped<IAcademicPermissionReader, AcademicPermissionReader>();
        services.AddScoped<ITeacherAccessReader, TeacherAccessReader>();
        services.AddScoped<IAccountAccessReader, AccountAccessReader>();





        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAccountEmailOutbox, AccountEmailOutbox>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<IShellSessionRepository, ShellSessionRepository>();
        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<IAcademicRepository, AcademicRepository>();
        services.AddScoped<IUserAdministrationRepository, UserAdministrationRepository>();
        services.AddScoped<IStaffAccessRepository, StaffAccessRepository>();
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
        services.AddScoped<IParentLearningRepository, ParentLearningRepository>();
        services.AddScoped<IParentCommerceRepository, ParentCommerceRepository>();
        services.AddScoped<IParentCheckoutRepository, ParentCheckoutRepository>();
        services.AddHttpClient<ICheckoutGateway, CheckoutGateway>(http => http.Timeout = TimeSpan.FromSeconds(6))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        services.AddHostedService<ParentCheckoutWorker>();
        services.AddScoped<ILearningMessageRepository, LearningMessageRepository>();
        services.AddScoped<IParentRepository, ParentRepository>();
        services.AddScoped<ITeacherRepository, TeacherRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<ILeaderboardRepository, LeaderboardRepository>();
        services.AddScoped<IAiAssistantService, AiAssistantService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IClassroomRealtimeService, ClassroomRealtimeService>();
        services.AddScoped<IExcelExportService, ExcelExportService>();
        return services;
    }
}
