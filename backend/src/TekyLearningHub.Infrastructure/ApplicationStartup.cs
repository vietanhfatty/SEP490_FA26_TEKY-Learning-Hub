using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data.Migrations;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure;
public static class ApplicationStartup
{
    public static async Task<bool> InitializeAsync(IServiceProvider services, IConfiguration configuration, IHostEnvironment environment, ILogger logger)
    {
        if (!environment.IsDevelopment()) return false;
        using var scope = services.CreateScope();
        try
        {
            await DevelopmentDatabaseMigrator.ApplyAsync(configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required."), logger);
            if (configuration.GetValue<bool>("migrate-only")) return true;
            await DbInitializer.SeedAsync(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(), scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
            return configuration.GetValue<bool>("seed-demo-only");
        }
        catch (Exception e) { logger.LogCritical(e, "Không thể cập nhật database Development. Backend dừng để tránh chạy với schema không tương thích."); throw; }
    }
}
