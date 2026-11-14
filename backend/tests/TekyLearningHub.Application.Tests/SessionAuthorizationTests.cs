using System.Security.Claims;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Security;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class SessionAuthorizationTests
{
    private static ClaimsPrincipal Principal(byte roleId = 1, string role = "student", int version = 2, int userId = 42) =>
        new(new ClaimsIdentity(new[] {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("security_version", version.ToString()),
            new Claim("role_id", roleId.ToString()),
            new Claim(ClaimTypes.Role, role)
        }, "Bearer"));

    private static User Account(byte roleId = 1) => new() { UserId = 42, RoleId = roleId, SecurityVersion = 2, Status = "Active" };

    [Theory]
    [InlineData(1, "student")]
    [InlineData(2, "teacher")]
    [InlineData(3, "admin")]
    [InlineData(4, "parent")]
    [InlineData(5, "staff")]
    [InlineData(6, "academic_manager")]
    public void AllowsOnlyTheCurrentAssignedRole(byte roleId, string role) =>
        Assert.True(SessionAuthorization.MatchesCurrentUser(Principal(roleId, role), Account(roleId)));

    [Theory]
    [InlineData(3, "admin", 2, 42)] // role changed in the database
    [InlineData(1, "admin", 2, 42)] // conflicting role claims
    [InlineData(1, "student", 1, 42)] // revoked security version
    [InlineData(1, "student", 2, 99)] // wrong identity
    public void RejectsStaleOrMismatchedAuthorization(byte roleId, string role, int version, int userId) =>
        Assert.False(SessionAuthorization.MatchesCurrentUser(Principal(roleId, role, version, userId), Account()));

    [Fact]
    public void RejectsDisabledMissingAndUnknownAccounts()
    {
        var inactive = Account(); inactive.Status = "Inactive";
        Assert.False(SessionAuthorization.MatchesCurrentUser(Principal(), inactive));
        Assert.False(SessionAuthorization.MatchesCurrentUser(Principal(), null));
        Assert.False(SessionAuthorization.MatchesCurrentUser(null, Account()));
        Assert.False(SessionAuthorization.MatchesCurrentUser(Principal(99), Account(99)));
    }

    [Fact]
    public void RejectsExtraPrivilegedRoleClaims()
    {
        var principal = Principal();
        ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim(ClaimTypes.Role, "admin"));
        Assert.False(SessionAuthorization.MatchesCurrentUser(principal, Account()));
    }
}
