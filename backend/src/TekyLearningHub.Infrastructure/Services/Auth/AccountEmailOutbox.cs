using Microsoft.AspNetCore.DataProtection;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Services.Auth;

public sealed class AccountEmailOutbox(ApplicationDbContext db, IDataProtectionProvider protection) : IAccountEmailOutbox
{
    public void Enqueue(string email, string subject, string body) => AccountEmailWorker.Enqueue(db, protection, email, subject, body);
}
