using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TekyLearningHub.Api.Controllers.Auth;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Services.Auth;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class LayerBoundaryTests
{
    [Fact]
    public void TypedAdministrationResponsesKeepTheirPublicJsonShape()
    {
        var options = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);
        using var created = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(new CreatedUserResult(12, "Pending", "Queued"), options));
        Assert.Equal(new[] { "message", "status", "userId" }, created.RootElement.EnumerateObject().Select(p => p.Name).Order().ToArray());
        using var page = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(new ManagedUserPage(0, []), options));
        Assert.Equal(new[] { "items", "total" }, page.RootElement.EnumerateObject().Select(p => p.Name).Order().ToArray());
        Assert.Equal(0, page.RootElement.GetProperty("items").GetArrayLength());
        using var mutation = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(new AdministrationVersion(true, 3), options));
        Assert.Equal(new[] { "success", "version" }, mutation.RootElement.EnumerateObject().Select(p => p.Name).Order().ToArray());
    }

    [Fact]
    public void InnerLayersDoNotReferencePersistenceOrHttpFrameworks()
    {
        var domain = typeof(User).Assembly;
        var application = typeof(AuthService).Assembly;
        foreach (var assembly in new[] { domain, application })
        {
            Assert.DoesNotContain(assembly.GetReferencedAssemblies(), reference =>
                reference.Name!.Contains("EntityFrameworkCore") || reference.Name.Contains("SqlClient") ||
                reference.Name.Contains("AspNetCore") || reference.Name.Contains("Infrastructure") || reference.Name.EndsWith(".Api"));
        }
        Assert.DoesNotContain(domain.GetReferencedAssemblies(), reference => reference.Name == application.GetName().Name);
        foreach (var contract in application.GetTypes().Where(type => type.IsInterface))
        {
            foreach (var type in contract.GetMethods().SelectMany(method => method.GetParameters().Select(p => p.ParameterType).Append(method.ReturnType)))
                AssertNoProviderType(type);
        }
    }

    private static void AssertNoProviderType(Type type)
    {
        Assert.DoesNotContain("EntityFramework", type.FullName ?? "");
        Assert.DoesNotContain("IQueryable", type.FullName ?? "");
        foreach (var argument in type.GetGenericArguments()) AssertNoProviderType(argument);
    }

    [Fact]
    public void ControllersDependOnApplicationContractsAndCanBeResolved()
    {
        var controllers = typeof(AuthController).Assembly.GetTypes()
            .Where(type => !type.IsAbstract && typeof(ControllerBase).IsAssignableFrom(type)).ToArray();
        var services = WebApplication.CreateBuilder().Services;
        services.AddLogging();
        services.AddApplication();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=Unused;Integrated Security=True;TrustServerCertificate=True"
        }).Build();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddInfrastructure(configuration);
        foreach (var controller in controllers)
        {
            foreach (var parameter in controller.GetConstructors().SelectMany(c => c.GetParameters()))
                Assert.DoesNotContain("Infrastructure", parameter.ParameterType.FullName ?? "");
            services.AddTransient(controller);
        }
        using var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateOnBuild = true, ValidateScopes = true });
        using var scope = provider.CreateScope();
        foreach (var controller in controllers) Assert.NotNull(scope.ServiceProvider.GetRequiredService(controller));
    }

    [Fact]
    public async Task LoginRulesRunAgainstPlainRepositoriesWithoutDatabaseOrCryptoProvider()
    {
        var user = new User
        {
            UserId = 12,
            Email = "test@example.com",
            FullName = "Test",
            Status = "Active",
            PrimaryRoleId = 1,
            PrimaryRole = new Role { RoleId = 1, RoleName = "Student" },
            RoleAssignments = [new() { RoleId = 1 }],
            FailedLoginCount = 5
        };
        var repository = new AuthMemoryRepository(user);
        var unit = new MemoryUnitOfWork();
        var email = new MemoryEmail();
        var service = new AuthService(repository, new TestPasswords(), new TestTokens(), unit, email);

        var failure = await service.LoginAsync(new() { EmailOrUsername = user.Email, Password = "wrong" }, null, null);
        Assert.False(failure.Success);
        Assert.Equal(6, user.FailedLoginCount);
        Assert.True(user.LockoutEndAt > DateTime.UtcNow);
        Assert.Equal(1, email.Count);
        Assert.Empty(repository.Sessions);
        user.LockoutEndAt = DateTime.UtcNow.AddSeconds(-1);

        var success = await service.LoginAsync(new() { EmailOrUsername = user.Email, Password = "correct" }, null, null);
        Assert.True(success.Success);
        Assert.Equal("student", success.Data!.User.Role);
        Assert.Equal(0, user.FailedLoginCount);
        Assert.Single(repository.Sessions);
        Assert.Equal(2, unit.Saves);
    }

    private sealed class AuthMemoryRepository(User user) : IAuthRepository
    {
        public List<UserSession> Sessions { get; } = [];
        public Task<User?> FindByIdentifier(string identifier) => Task.FromResult<User?>(identifier == user.Email ? user : null);
        public Task<User?> FindUser(int id) => Task.FromResult<User?>(id == user.UserId ? user : null);
        public Task<UserSession?> FindSession(string hash) => Task.FromResult(Sessions.FirstOrDefault(s => s.TokenHash == hash && s.IsActive));
        public Task<List<UserSession>> ActiveSessions(int id) => Task.FromResult(Sessions.Where(s => s.UserId == id && s.IsActive).ToList());
        public void AddSession(UserSession session) => Sessions.Add(session);
        public void AddAudit(AuditLog audit) { }
    }

    private sealed class MemoryUnitOfWork : IUnitOfWork
    {
        public int Saves { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken ct = default) { Saves++; return Task.FromResult(1); }
        public Task<T> ExecuteAsync<T>(TransactionKind kind, Func<Task<T>> operation, CancellationToken ct = default) => operation();
        public void Reset() { }
    }
    private sealed class MemoryEmail : IAccountEmailOutbox
    {
        public int Count { get; private set; }
        public void Enqueue(string email, string subject, string body) => Count++;
    }
    private sealed class TestPasswords : IPasswordHasher
    {
        public string HashPassword(string password) => password;
        public bool VerifyPassword(string password, string hash) => password == "correct";
    }
    private sealed class TestTokens : IJwtTokenGenerator
    {
        public string GenerateAccessToken(User user) => "access";
        public string GenerateRefreshToken() => "refresh";
        public int GetAccessTokenExpiryMinutes() => 60;
    }
}
