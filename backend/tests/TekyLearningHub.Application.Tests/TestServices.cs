using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Backoffice;
using TekyLearningHub.Application.Services.Admin;
using TekyLearningHub.Application.Services.Auth;
using TekyLearningHub.Application.Services.Backoffice;
using TekyLearningHub.Application.Services.Portal;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Infrastructure.Repositories.Admin;
using TekyLearningHub.Infrastructure.Repositories.Auth;
using TekyLearningHub.Infrastructure.Repositories.Backoffice;
using TekyLearningHub.Infrastructure.Repositories.Portal;
using TekyLearningHub.Infrastructure.Security;
using TekyLearningHub.Infrastructure.Services.Auth;
using TekyLearningHub.Infrastructure.Storage;

namespace TekyLearningHub.Application.Tests;

/// <summary>Excel adapter stub: the bulk import tests only need the template and the reader.</summary>
internal sealed class StaffImportExcelStub : IExcelExportService
{
    public Task<byte[]> ExportClassGradebookAsync(int classId, CancellationToken cancellationToken = default) =>
        Task.FromResult(Array.Empty<byte>());

    public Task<byte[]> BuildStaffImportTemplateAsync(CancellationToken cancellationToken = default)
    {
        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Nhân sự");
        sheet.Cell(1, 1).Value = "Email";
        sheet.Cell(1, 2).Value = "Họ tên";
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return Task.FromResult(stream.ToArray());
    }

    public Task<(string Email, string? FullName)[]> ReadStaffImportAsync(Stream content, CancellationToken cancellationToken = default)
    {
        using var workbook = new ClosedXML.Excel.XLWorkbook(content);
        var sheet = workbook.Worksheets.FirstOrDefault();
        var rows = new List<(string, string?)>();
        if (sheet is not null)
            foreach (var row in sheet.RowsUsed().Skip(1))
            {
                var email = row.Cell(1).GetString().Trim();
                if (email.Length == 0) continue;
                var name = row.Cell(2).GetString().Trim();
                rows.Add((email, name.Length == 0 ? null : name));
            }
        return Task.FromResult(rows.ToArray());
    }
}

internal static class TestServices
{
    public static AuthService Auth(ApplicationDbContext db, IPasswordHasher hasher, IJwtTokenGenerator tokens, IDataProtectionProvider? protection = null) =>
        new(new AuthRepository(db), hasher, tokens, new UnitOfWork(db), new AccountEmailOutbox(db, protection ?? new EphemeralDataProtectionProvider()), new AccountAccessReader(db));

    public static UserAdministrationService Administration(ApplicationDbContext db, IPasswordHasher hasher, IDataProtectionProvider protection, IConfiguration configuration) =>
        new(new UserAdministrationRepository(db), new UnitOfWork(db), hasher, new AccountEmailOutbox(db, protection), new AccountOptions { InvitationBaseUrl = configuration["Account:InvitationBaseUrl"] }, new AccountAccessReader(db), StaffAccess(db), new StaffImportExcelStub());

    public static StaffAccessService StaffAccess(ApplicationDbContext db) => new(new StaffAccessRepository(db), new UserAdministrationRepository(db), new UnitOfWork(db));

    public static StudentAssessmentsService Assessments(ApplicationDbContext db) => new(new StudentAssessmentsRepository(db),new UnitOfWork(db));
    public static StudentOverviewService Overview(ApplicationDbContext db,StudentClassesService classes) => new(new StudentOverviewRepository(db),classes);
    public static StudentClassesService Classes(ApplicationDbContext db) => new(new StudentClassesRepository(db), new UnitOfWork(db));
    public static StudentLearningService Learning(ApplicationDbContext db, StudentClassesService classes) => new(new StudentLearningRepository(db), classes);
    public static ProjectReviewService Reviews(ApplicationDbContext db) => new(new ProjectReviewRepository(db));
    public static ShellTransferService Shell(ApplicationDbContext db, IAuthService auth, IConfiguration config) => new(new ShellSessionRepository(db), new TransferTicketStore(), auth, new ShellOptions { PortalOrigin = config["Shells:PortalOrigin"] ?? "http://localhost:3000", BackofficeOrigin = config["Shells:BackofficeOrigin"] ?? "http://localhost:3001" });
    public static AccountService Account(ApplicationDbContext db, IPasswordHasher hasher, IDataProtectionProvider protection) =>
        new(new AccountRepository(db), new UnitOfWork(db), hasher, new AccountEmailOutbox(db, protection), new AvatarStorage());
}
