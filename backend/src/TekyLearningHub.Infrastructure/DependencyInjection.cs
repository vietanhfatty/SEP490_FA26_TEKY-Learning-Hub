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
using TekyLearningHub.Infrastructure.Services.Auth;
using TekyLearningHub.Infrastructure.Storage;

namespace TekyLearningHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=VIETANHFATTY\\SQLEXPRESS;uid=sa;password=123456;database=Teky_Learning_Hub;Encrypt=True;TrustServerCertificate=True;";

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
        return services;
    }
}
