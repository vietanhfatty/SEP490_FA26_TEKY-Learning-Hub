using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Api.Controllers;
[ApiController, Route("api/auth/shell-transfer"), EnableRateLimiting("account")]
public class ShellTransferController(ApplicationDbContext db, IAuthService auth, IConfiguration configuration) : ControllerBase {
 record Ticket(string RefreshToken,string Challenge,string Destination,DateTime Expires);
 static readonly ConcurrentDictionary<string,Ticket> Tickets=new();
 public record BeginRequest(string RefreshToken,string Challenge,string Destination);
 public record ExchangeRequest(string Code,string Verifier);
 [Authorize, HttpPost]
 public async Task<IActionResult> Begin(BeginRequest request) {
  string[] origins=[configuration["Shells:PortalOrigin"] ?? "http://localhost:3000",configuration["Shells:BackofficeOrigin"] ?? "http://localhost:3001"];
  if(!origins.Contains(request.Destination) || request.Challenge?.Length!=43 || string.IsNullOrWhiteSpace(request.RefreshToken)) return BadRequest();
  var id=int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
  var hash=Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.RefreshToken)));
  if(!await db.UserSessions.AnyAsync(x=>x.UserId==id && x.TokenHash==hash && x.IsActive && x.LoginAt>DateTime.UtcNow.AddDays(-30))) return Unauthorized();
  foreach(var item in Tickets) if(item.Value.Expires<DateTime.UtcNow) Tickets.TryRemove(item.Key,out _);
  if(Tickets.Count>=1000) return StatusCode(429);
  var code=Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
  Tickets[code]=new(request.RefreshToken,request.Challenge,request.Destination,DateTime.UtcNow.AddSeconds(30));
  return Ok(new {code});
 }
 [HttpPost("exchange")]
 public async Task<IActionResult> Exchange(ExchangeRequest request) {
  if(string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Verifier) || request.Verifier.Length>128 || !Tickets.TryRemove(request.Code,out var ticket)) return Unauthorized();
  var challenge=Base64UrlEncoder.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(request.Verifier)));
  if(ticket.Expires<DateTime.UtcNow || ticket.Challenge!=challenge || Request.Headers.Origin.ToString()!=ticket.Destination) return Unauthorized();
  var result=await auth.RefreshTokenAsync(ticket.RefreshToken,HttpContext.Connection.RemoteIpAddress?.ToString(),Request.Headers.UserAgent);
  return result.Success?Ok(result):Unauthorized();
 }
}
