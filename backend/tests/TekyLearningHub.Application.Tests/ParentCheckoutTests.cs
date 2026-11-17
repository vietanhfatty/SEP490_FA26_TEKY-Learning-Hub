using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TekyLearningHub.Application.Interfaces.Portal;
using TekyLearningHub.Application.Services.Portal;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Repositories.Portal;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public sealed class ParentCheckoutTests
{
    [SqlServerFact]
    public async Task CheckoutVerifiesAmountAndScopeThenGrantsCourseOnce()
    {
        await using var fixture = new DatabaseMigrationTests.TestDatabase();
        await fixture.Migrate();
        await fixture.Execute("""
            INSERT dbo.Users(Email, PasswordHash, PrimaryRoleId, FullName) VALUES
                ('child@checkout.test', 'unused', 1, 'Child'),
                ('parent@checkout.test', 'unused', 4, 'Parent'),
                ('other@checkout.test', 'unused', 4, 'Other parent');
            INSERT dbo.UserRoles(UserId, RoleId, ScopeType)
                SELECT UserId, PrimaryRoleId, 'GLOBAL' FROM dbo.Users WHERE Email LIKE '%@checkout.test';
            DECLARE @student int = (SELECT UserId FROM dbo.Users WHERE Email = 'child@checkout.test'),
                    @parent int = (SELECT UserId FROM dbo.Users WHERE Email = 'parent@checkout.test'),
                    @other int = (SELECT UserId FROM dbo.Users WHERE Email = 'other@checkout.test');
            INSERT dbo.StudentProfiles(UserId, StudentCode) VALUES (@student, 'QR-TEST');
            INSERT dbo.ParentProfiles(UserId) VALUES (@parent), (@other);
            INSERT dbo.ParentStudentLinks(ParentId, StudentId, Status) VALUES (@parent, @student, 'Active');
            EXEC dbo.SeedDemoParentCheckout;
            """);
        var student = await fixture.Scalar("SELECT UserId FROM dbo.StudentProfiles WHERE StudentCode = 'QR-TEST'");
        var parent = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email = 'parent@checkout.test'");
        var other = await fixture.Scalar("SELECT UserId FROM dbo.Users WHERE Email = 'other@checkout.test'");
        var classId = await fixture.Scalar("SELECT ClassId FROM dbo.Classes WHERE ClassCode = 'DEMO-QR-STEM-01'");
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(fixture.ConnectionString).Options;
        await using var db = new ApplicationDbContext(options);
        await using var parallelDb = new ApplicationDbContext(options);
        var gateway = new TestGateway();
        var parallelGateway = new TestGateway();
        var service = Service(db, gateway);
        var parallelService = Service(parallelDb, parallelGateway);
        var studentCourses = new StudentLearningRepository(db);

        Assert.Empty(await studentCourses.Courses(student, default));
        Assert.Null(await service.Buy(other, student, classId, default));
        await fixture.Execute($"INSERT dbo.ParentCourseRequests(ParentId,StudentId,ClassId,Status,ProcessedBy) VALUES({parent},{student},{classId},'Declined',{parent})");
        Assert.Null(await service.Buy(parent, student, classId, default));
        await fixture.Execute("UPDATE dbo.ParentCourseRequests SET Status='Accepted',UpdatedAt=SYSUTCDATETIME()");
        var orders = await Task.WhenAll(service.Buy(parent, student, classId, default),
            parallelService.Buy(parent, student, classId, default));
        var order = Assert.IsType<ParentCheckoutDto>(orders[0]);
        Assert.Equal(order.PaymentId, orders[1]?.PaymentId);
        Assert.Equal("Pending", order.Status);
        Assert.Equal("server-generated-qr", order.QrCode);
        Assert.Equal(99000, order.AmountVnd);
        Assert.Null(await service.List(other, student, default));
        Assert.Empty(await studentCourses.Courses(student, default));

        var stored = gateway.Order ?? parallelGateway.Order!;
        using var webhook = JsonDocument.Parse("{}");
        Assert.False(await service.Webhook(webhook.RootElement, default));
        gateway.Order = stored;
        parallelGateway.Order = stored;
        gateway.Result = new(stored.OrderCode, "link", 1, 1, 0, "PAID");
        await Assert.ThrowsAsync<CheckoutGatewayException>(() => service.Webhook(webhook.RootElement, default));
        Assert.Empty(await studentCourses.Courses(student, default));

        gateway.Result = new(stored.OrderCode, "link", order.AmountVnd, order.AmountVnd, 0, "PAID");
        parallelGateway.Result = gateway.Result;
        Assert.All(await Task.WhenAll(service.Webhook(webhook.RootElement, default),
            parallelService.Webhook(webhook.RootElement, default)), value => Assert.True(value));
        Assert.Equal("Paid", Assert.Single((await service.List(parent, student, default))!).Status);
        Assert.Single(await studentCourses.Courses(student, default));
        Assert.Equal(1, await fixture.Scalar("SELECT COUNT(*) FROM dbo.Enrollments"));
        Assert.Null(await service.Buy(parent, student, classId, default));
    }

    private static ParentCheckoutService Service(ApplicationDbContext db, ICheckoutGateway gateway)
    {
        var classes = new StudentClassesService(new StudentClassesRepository(db), new UnitOfWork(db));
        var overview = new StudentOverviewService(new StudentOverviewRepository(db), classes);
        var learning = new ParentLearningService(new ParentLearningRepository(db), classes, overview);
        return new(new ParentCheckoutRepository(db), learning, gateway, NullLogger<ParentCheckoutService>.Instance);
    }

    private sealed class TestGateway : ICheckoutGateway
    {
        public string Provider => "PayOS";
        public ParentCheckout? Order { get; set; }
        public CheckoutStatus? Result { get; set; }

        public Task<CheckoutLink> Create(ParentCheckout row, CancellationToken ct)
        {
            Order = row;
            return Task.FromResult(new CheckoutLink("link", "https://example.test/", "server-generated-qr"));
        }

        public Task<CheckoutStatus?> Status(long orderCode, CancellationToken ct) => Task.FromResult(Result);
        public long? VerifyWebhook(JsonElement payload) => Result is null ? null : Order?.OrderCode;
    }
}
