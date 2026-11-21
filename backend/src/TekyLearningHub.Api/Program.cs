using TekyLearningHub.Application.Common;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application;
using TekyLearningHub.Infrastructure;
using TekyLearningHub.Infrastructure.Hubs;

Console.OutputEncoding = Encoding.UTF8;

var builder = WebApplication.CreateBuilder(args);

// 1. Register Application & Infrastructure Clean Architecture Layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// 2. Configure Controllers & Model Validation
builder.Services.AddControllers();

// 3. Configure CORS for Portal & Backoffice Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:3003",
                "https://localhost:7001",
                "http://localhost:5000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 4. Configure JWT Authentication & Bearer Token Validation
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "TekyLearningHubSuperSecretKeyForDevelopment2026!MustBe32BytesOrLonger";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TekyLearningHub";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TekyLearningHubUsers";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var principal = context.Principal;
            if (principal is null || !int.TryParse(principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId)
                || !int.TryParse(principal.FindFirst("security_version")?.Value, out var version)
                || !byte.TryParse(principal.FindFirst("role_id")?.Value, out var roleId)) { context.Fail("Invalid session"); return; }
            var identity = new SessionIdentity(userId, version, roleId, principal.FindAll(System.Security.Claims.ClaimTypes.Role).Select(x => x.Value).ToArray());
            var validator = context.HttpContext.RequestServices.GetRequiredService<ISessionValidationService>();
            if (!await validator.IsValid(identity)) context.Fail("Session revoked or role changed");
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("account", context => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
    context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

// 5. OpenAPI & Scalar API Documentation
builder.Services.AddOpenApi();

// 5b. SignalR hubs và job nền Quartz đã đăng ký trong AddInfrastructure.

var app = builder.Build();

// 6. Automatic Data Seeding on Startup (Roles & Demo Accounts)
// Development updates the schema before querying entities. Production performs no automatic migration or demo seeding.
if (await ApplicationStartup.InitializeAsync(app.Services, app.Configuration, app.Environment, app.Logger)) return;

// 7. Configure Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors("AllowFrontend");
app.Use(async (context, next) =>
{
    try { await next(); }
    catch (UseCaseException error)
    {
        context.Response.StatusCode = error.Status;
        await context.Response.WriteAsJsonAsync(new { message = error.Message });
    }
    catch (PersistenceConflictException)
    {
        context.Response.StatusCode = 409;
        await context.Response.WriteAsJsonAsync(new { message = "Dữ liệu vừa thay đổi. Vui lòng tải lại hoặc thử lại." });
    }
});

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SignalR hub endpoints cho phòng Lab, cheer box và thông báo thời gian thực
app.MapHub<ClassroomHub>("/hubs/classroom");
app.MapHub<CheerHub>("/hubs/cheer");
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
