using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Infrastructure.Services;
namespace TekyLearningHub.Api.Controllers;
[ApiController, Route("api/admin/users"), Authorize]
public sealed class AdminUsersController(UserAdministrationService service, ILogger<AdminUsersController> logger) : ControllerBase
{
 private int Actor => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
 private async Task<IActionResult> Run(Func<Task<object>> f,int status=200) { try{return StatusCode(status,await f());}catch(UserAdministrationException e){return StatusCode(e.Status,new{message=e.Message});}catch(OperationCanceledException){throw;}catch(Exception e){logger.LogError(e,"User administration failed");return Problem(statusCode:503,title:"Không thể hoàn thành thao tác quản trị.");} }
 [HttpGet] public Task<IActionResult> List(string? q,string? status,byte? roleId,int? departmentId,int skip=0,int take=50,CancellationToken ct=default)=>Run(()=>service.List(Actor,q,status,roleId,departmentId,skip,take,ct));
 [HttpGet("{id:int}")] public Task<IActionResult> Detail(int id,CancellationToken ct)=>Run(()=>service.Detail(Actor,id,ct));
 [HttpPost] public Task<IActionResult> Create(CreateUserRequest r,CancellationToken ct)=>Run(()=>service.Create(Actor,r,ct),201);
 [HttpPatch("{id:int}")] public Task<IActionResult> Update(int id,UpdateUserRequest r,CancellationToken ct)=>Run(()=>service.Update(Actor,id,r,ct));
 [HttpPut("{id:int}/status")] public Task<IActionResult> Status(int id,UserMutationRequest r,CancellationToken ct)=>Run(()=>service.Mutate(Actor,id,"status",r,null,ct));
 [HttpPut("{id:int}/primary-role")] public Task<IActionResult> Primary(int id,UserMutationRequest r,CancellationToken ct)=>Run(()=>service.Mutate(Actor,id,"primary",r,null,ct));
 [HttpPost("{id:int}/role-grants")] public Task<IActionResult> Grant(int id,UserMutationRequest r,CancellationToken ct)=>Run(()=>service.Mutate(Actor,id,"grant",r,null,ct));
 [HttpPost("{id:int}/role-grants/{grantId:long}/revoke")] public Task<IActionResult> Revoke(int id,long grantId,UserMutationRequest r,CancellationToken ct)=>Run(()=>service.Mutate(Actor,id,"revoke",r,grantId,ct));
 [HttpPost("{id:int}/invitations")] public Task<IActionResult> Resend(int id,UserMutationRequest r,CancellationToken ct)=>Run(()=>service.Resend(Actor,id,r,ct));
 [HttpGet("{id:int}/audit-events")] public Task<IActionResult> Audit(int id,int skip=0,int take=50,CancellationToken ct=default)=>Run(()=>service.AuditEvents(Actor,id,skip,take,ct));
 [HttpGet("/api/admin/directory")] public Task<IActionResult> Catalog(CancellationToken ct)=>Run(()=>service.Catalog(Actor,ct));
 [HttpPost("/api/admin/directory/{kind}")] public Task<IActionResult> CreateDirectory(string kind,DirectoryRequest r,CancellationToken ct)=>Run(()=>service.Directory(Actor,kind,null,r,ct));
 [HttpPut("/api/admin/directory/{kind}/{id:int}")] public Task<IActionResult> UpdateDirectory(string kind,int id,DirectoryRequest r,CancellationToken ct)=>Run(()=>service.Directory(Actor,kind,id,r,ct));
 [HttpPost("{id:int}/appointments")] public Task<IActionResult> Appointment(int id,AppointmentRequest r,CancellationToken ct)=>Run(()=>service.Appointment(Actor,id,r,null,ct));
 [HttpPost("{id:int}/appointments/{appointmentId:long}/end")] public Task<IActionResult> EndAppointment(int id,long appointmentId,AppointmentRequest r,CancellationToken ct)=>Run(()=>service.Appointment(Actor,id,r,appointmentId,ct));
}
[ApiController,Route("api/auth"),AllowAnonymous,EnableRateLimiting("account")]
public sealed class InvitationController(UserAdministrationService service,ILogger<InvitationController> logger):ControllerBase
{
 [HttpPost("accept-invitation")] public async Task<IActionResult> Accept(AcceptInvitationRequest r,CancellationToken ct){try{return Ok(await service.Accept(r,ct));}catch(UserAdministrationException e){return StatusCode(e.Status,new{message=e.Message});}catch(OperationCanceledException){throw;}catch(Exception e){logger.LogError(e,"Invitation activation failed");return Problem(statusCode:503,title:"Không thể kích hoạt tài khoản.");}}
}
