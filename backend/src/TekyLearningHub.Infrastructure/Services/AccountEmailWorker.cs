using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Infrastructure.Data;
using TekyLearningHub.Domain.Entities;
namespace TekyLearningHub.Infrastructure.Services;
public class AccountEmailWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<AccountEmailWorker> logger) : BackgroundService {
 public static void Enqueue(ApplicationDbContext db, IDataProtectionProvider protection, string email, string subject, string body) => db.AccountEmails.Add(new AccountEmail {Recipient=email,Subject=subject,ProtectedBody=protection.CreateProtector("AccountEmail.v1").Protect(body)});
 protected override async Task ExecuteAsync(CancellationToken stop) {
  while (!stop.IsCancellationRequested) {
   try {
    if (!string.IsNullOrWhiteSpace(config["Smtp:Host"])) {
     using var scope=scopes.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
     var protection=scope.ServiceProvider.GetRequiredService<IDataProtectionProvider>();
     var messages=await db.AccountEmails.Where(x=>x.SentAt==null && x.NextAttemptAt<=DateTime.UtcNow).OrderBy(x=>x.Id).Take(10).ToListAsync(stop);
     foreach(var item in messages) {
      try {
       using var client=new SmtpClient(config["Smtp:Host"],config.GetValue("Smtp:Port",587)) {EnableSsl=config.GetValue("Smtp:EnableSsl",true),Credentials=new NetworkCredential(config["Smtp:Username"],config["Smtp:Password"])};
       using var mail=new MailMessage(config["Smtp:From"]!,item.Recipient,item.Subject,protection.CreateProtector("AccountEmail.v1").Unprotect(item.ProtectedBody));
       await client.SendMailAsync(mail,stop); item.SentAt=DateTime.UtcNow; item.ProtectedBody="";
      } catch(Exception) when(!stop.IsCancellationRequested) {item.Attempts++;item.NextAttemptAt=DateTime.UtcNow.AddMinutes(Math.Min(60,item.Attempts*2));}
      await db.SaveChangesAsync(stop);
     }
    }
   } catch(Exception) when(!stop.IsCancellationRequested) {logger.LogWarning("Account email queue is unavailable; retrying.");}
   await Task.Delay(TimeSpan.FromSeconds(15),stop);
  }
 }
}
