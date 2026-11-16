using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Application.Interfaces.Auth;
using TekyLearningHub.Application.Interfaces;
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

internal static class TestServices
{
    public static AuthService Auth(ApplicationDbContext db, IPasswordHasher hasher, IJwtTokenGenerator tokens, IDataProtectionProvider? protection = null) =>
        new(new AuthRepository(db), hasher, tokens, new UnitOfWork(db), new AccountEmailOutbox(db, protection ?? new EphemeralDataProtectionProvider()));

    public static UserAdministrationService Administration(ApplicationDbContext db, IPasswordHasher hasher, IDataProtectionProvider protection, IConfiguration configuration) =>
        new(new UserAdministrationRepository(db), new UnitOfWork(db), hasher, new AccountEmailOutbox(db, protection), new AccountOptions { InvitationBaseUrl = configuration["Account:InvitationBaseUrl"] });

    public static StudentClassesService Classes(ApplicationDbContext db) => new(new StudentClassesRepository(db), new UnitOfWork(db));
    public static StudentLearningService Learning(ApplicationDbContext db, StudentClassesService classes) => new(new StudentLearningRepository(db), classes);
    public static ProjectReviewService Reviews(ApplicationDbContext db) => new(new ProjectReviewRepository(db));
    public static ShellTransferService Shell(ApplicationDbContext db, IAuthService auth, IConfiguration config) => new(new ShellSessionRepository(db), new TransferTicketStore(), auth, new ShellOptions { PortalOrigin = config["Shells:PortalOrigin"] ?? "http://localhost:3000", BackofficeOrigin = config["Shells:BackofficeOrigin"] ?? "http://localhost:3001" });
    public static AccountService Account(ApplicationDbContext db, IPasswordHasher hasher, IDataProtectionProvider protection) =>
        new(new AccountRepository(db), new UnitOfWork(db), hasher, new AccountEmailOutbox(db, protection), new AvatarStorage());
}
