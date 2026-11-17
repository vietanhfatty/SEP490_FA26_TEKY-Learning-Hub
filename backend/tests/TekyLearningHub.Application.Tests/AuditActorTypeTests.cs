using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;
using Xunit;
namespace TekyLearningHub.Application.Tests;
public class AuditActorTypeTests {
 [Theory]
 [InlineData("User","User")]
 [InlineData(" user ","User")]
 [InlineData("SYSTEM","System")]
 [InlineData("System","System")]
 public void CanonicalizesValidCategories(string value,string expected) => Assert.Equal(expected,new AuditLog {ActorType=value}.ActorType);
 [Theory]
 [InlineData(null)] [InlineData("")] [InlineData(" ")]
 [InlineData("AcademicManager")] [InlineData("academic_manager")]
 [InlineData("Student")] [InlineData("Teacher")] [InlineData("Admin")] [InlineData("Parent")] [InlineData("Staff")]
 public void RejectsInvalidCategories(string? value) => Assert.Throws<ArgumentException>(()=>new AuditLog {ActorType=value!});
 [Fact]
 public async Task PersistenceAlsoRejectsInvalidBackingFieldValues() {
  using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
  var log=new AuditLog {Action="TEST"};db.AuditLogs.Add(log);
  db.Entry(log).Property(x=>x.ActorType).CurrentValue="AcademicManager";
  Assert.Throws<ArgumentException>(()=>db.SaveChanges());
  await Assert.ThrowsAsync<ArgumentException>(()=>db.SaveChangesAsync());
  Assert.Empty(await db.AuditLogs.AsNoTracking().ToListAsync());
 }
}
