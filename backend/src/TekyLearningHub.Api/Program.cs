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
                "http://localhost:3000",
                "http://localhost:3001")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Required for SignalR WebSocket handshake
    });
});

var app = builder.Build();

// Global exception handling → trả JSON { message } để Frontend hiển thị trạng thái Error có hướng khắc phục
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var ex = feature?.Error;
        context.Response.StatusCode = ex switch
        {
            KeyNotFoundException => StatusCodes.Status404NotFound,
            UnauthorizedAccessException => StatusCodes.Status403Forbidden,
            ArgumentException or InvalidOperationException => StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status500InternalServerError
        };
        await context.Response.WriteAsJsonAsync(new
        {
            message = context.Response.StatusCode == StatusCodes.Status500InternalServerError
                ? "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
                : ex?.Message
        });
    });
});

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
