using System.Text;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using TekyLearningHub.Application;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Data.Migrations;

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
    options.Events = new JwtBearerEvents { OnTokenValidated = async context => {
        var id=context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var version=context.Principal?.FindFirst("security_version")?.Value;
        var db=context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
        if(!int.TryParse(id,out var userId) || !int.TryParse(version,out var tokenVersion)) {context.Fail("Invalid session");return;}
        var user=await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleOrDefaultAsync(db.Users, x=>x.UserId==userId);
        if(user==null || user.Status!="Active" || user.SecurityVersion!=tokenVersion) context.Fail("Session revoked");
    }};
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
builder.Services.AddRateLimiter(options => {
 options.RejectionStatusCode=429;
 options.AddPolicy("account", context => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
 context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions {PermitLimit=10,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));
});

// 5. OpenAPI & Scalar API Documentation
builder.Services.AddOpenApi();

var app = builder.Build();

// 6. Automatic Data Seeding on Startup (Roles & Demo Accounts)
// Development updates the schema before querying entities. Production performs no automatic migration or demo seeding.
if (app.Environment.IsDevelopment())
using (var scope = app.Services.CreateScope())
{
    try
    {
        var connectionString = app.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
        await DevelopmentDatabaseMigrator.ApplyAsync(connectionString, app.Logger);
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        await DbInitializer.SeedAsync(context, passwordHasher);
    }
    catch (Exception ex)
    {
        app.Logger.LogCritical(ex, "Không thể cập nhật database Development. Backend dừng để tránh chạy với schema không tương thích.");
        throw;
    }
}

// 7. Configure Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors("AllowFrontend");
app.Use(async (context, next) => {
    try { await next(); }
    catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException) {
        context.Response.StatusCode=409;
        await context.Response.WriteAsJsonAsync(new {message="Dữ liệu vừa thay đổi. Vui lòng tải lại hoặc thử lại."});
    }
});

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
