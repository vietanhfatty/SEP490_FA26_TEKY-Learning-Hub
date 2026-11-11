using System.Text.Json.Serialization;
using Scalar.AspNetCore;
using TekyLearningHub.Application;
using TekyLearningHub.Infrastructure;
using TekyLearningHub.Infrastructure.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add Controllers with JSON settings
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// OpenAPI & Swagger
builder.Services.AddOpenApi();

// Clean Architecture Layers Dependency Injection
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// CORS for Frontend (Vite / React Portal & Backoffice)
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", 
                "http://localhost:5174", 
                "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Required for SignalR WebSocket handshake
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "TEKY Learning Hub - Teacher & Parent LMS API";
        options.Theme = ScalarTheme.Purple;
    });
}

app.UseHttpsRedirection();
app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

// Map REST Controllers
app.MapControllers();

// Map SignalR Realtime Hubs
app.MapHub<ClassroomHub>("/hubs/classroom");
app.MapHub<CheerHub>("/hubs/cheer");
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
