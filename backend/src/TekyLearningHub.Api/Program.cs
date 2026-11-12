using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using TekyLearningHub.Application;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure;
using TekyLearningHub.Infrastructure.Data;

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

// 5. OpenAPI & Scalar API Documentation
builder.Services.AddOpenApi();

var app = builder.Build();

// 6. Automatic Data Seeding on Startup (Roles & Demo Accounts)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        await DbInitializer.SeedAsync(context, passwordHasher);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Không thể kết nối hoặc khởi tạo dữ liệu mẫu trong DB. Đang sử dụng chế độ dự phòng.");
    }
}

// 7. Configure Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
