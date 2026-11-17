using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Hosting;
using TekyLearningHub.Infrastructure;
using TekyLearningHub.Infrastructure.Hubs;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class SignalRStartupTests
{
    [Fact]
    public async Task InfrastructureRegistersServicesRequiredToMapAllHubEndpoints()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = Environments.Production
        });
        builder.Services.AddInfrastructure(builder.Configuration);
        await using var app = builder.Build();

        app.MapHub<ClassroomHub>("/hubs/classroom");
        app.MapHub<CheerHub>("/hubs/cheer");
        app.MapHub<NotificationHub>("/hubs/notifications");

        var routes = ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText)
            .ToArray();
        foreach (var path in new[] { "/hubs/classroom", "/hubs/cheer", "/hubs/notifications" })
        {
            Assert.Contains(path, routes);
            Assert.Contains($"{path}/negotiate", routes);
        }
    }
}
