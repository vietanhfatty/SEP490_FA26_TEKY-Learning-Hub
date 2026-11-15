using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Services;

public sealed class UserAdministrationException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

public sealed class DirectoryEntry
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public bool IsActive { get; set; }
}
public sealed class StaffAppointmentView
{
    public long AppointmentId { get; set; }
    public int DepartmentId { get; set; }
    public int PositionId { get; set; }
    public string Department { get; set; } = "";
    public string Position { get; set; } = "";
    public string EmploymentType { get; set; } = "";
    public DateTime ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
}

/// <summary>Identity administration checks live grants and serializes changes, including
/// invitation consumption, so concurrent administrators cannot remove the last admin.</summary>
public sealed class UserAdministrationService(ApplicationDbContext db, IPasswordHasher hasher,
    IDataProtectionProvider protection, IConfiguration configuration)
{
    private static void Fail(int status, string message) => throw new UserAdministrationException(status, message);
    public async Task DemandManage(int actor, CancellationToken ct = default)
    {
        var allowed = await (from g in db.UserRoles join rp in db.RolePermissions on g.RoleId equals rp.RoleId
            join p in db.Permissions on rp.PermissionId equals p.PermissionId
            where g.UserId == actor && g.User.Status == "Active" && !g.User.ActivationPending
                && g.RevokedAt == null && g.ScopeType == "GLOBAL" && p.Code == "identity.manage"
            select g.UserRoleId).AnyAsync(ct);
        if (!allowed) Fail(403, "Bạn không có quyền quản lý tài khoản.");
    }

    private async Task<T> Locked<T>(int? actor, Func<Task<T>> operation, CancellationToken ct)
    {
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            try
            {
                await db.Database.ExecuteSqlRawAsync("""
                    DECLARE @r int;
                    EXEC @r=sys.sp_getapplock @Resource=N'Teky.UserAdministration',
                      @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000;
                    IF @r<0 THROW 51201,'Cannot acquire user administration lock.',1;
                    """, ct);
                if (actor.HasValue) await DemandManage(actor.Value, ct);
                var result = await operation();
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return result;
            }
            catch (DbUpdateConcurrencyException) { Fail(409, "Dữ liệu vừa thay đổi. Hãy tải lại trước khi lưu."); throw; }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            { Fail(409, "Email, số điện thoại hoặc phân công đã tồn tại."); throw; }
        });
    }
    private void Audit(int actor, int target, string action, object? before = null, object? after = null) =>
        db.AuditLogs.Add(new AuditLog { ActorUserId=actor, ActorType="User", Action=action,
            EntityType="User", EntityId=target.ToString(), OldValue=before==null?null:JsonSerializer.Serialize(before),
            NewValue=after==null?null:JsonSerializer.Serialize(after), CreatedAt=DateTime.UtcNow });

    private async Task<User> Load(int id, int? version = null, CancellationToken ct = default)
    {
        var user = await db.Users.Include(x=>x.RoleAssignments).ThenInclude(x=>x.Role)
            .Include(x=>x.PrimaryRole).SingleOrDefaultAsync(x=>x.UserId==id,ct);
        if(user==null) Fail(404,"Không tìm thấy tài khoản.");
        if(version.HasValue && user!.AdministrationVersion!=version.Value) Fail(409,"Dữ liệu vừa thay đổi. Hãy tải lại trước khi lưu.");
        return user!;
    }
    private static object View(User u) => new {
        u.UserId,u.Email,u.FullName,u.Phone,u.Status,u.ActivationPending,u.PrimaryRoleId,
        PrimaryRole=u.PrimaryRole.RoleName, Version=u.AdministrationVersion,u.CreatedAt,u.LastLoginAt,
        Roles=u.RoleAssignments.OrderBy(x=>x.UserRoleId).Select(g=>new {
            GrantId=g.UserRoleId,g.RoleId,Role=g.Role.RoleName,g.ScopeType,g.DepartmentId,g.AssignedBy,g.AssignedAt,g.RevokedAt }).ToArray()
    };

    public async Task<object> List(int actor, string? q, string? status, byte? roleId, int? departmentId,
        int skip, int take, CancellationToken ct = default)
    {
        await DemandManage(actor,ct);
        var query=db.Users.AsNoTracking().Include(x=>x.PrimaryRole).Include(x=>x.RoleAssignments).ThenInclude(x=>x.Role).AsQueryable();
        if(!string.IsNullOrWhiteSpace(q)){q=q.Trim();query=query.Where(x=>x.Email.Contains(q)||x.FullName.Contains(q));}
        if(!string.IsNullOrEmpty(status))query=query.Where(x=>x.Status==status);
        if(roleId.HasValue)query=query.Where(x=>x.RoleAssignments.Any(g=>g.RoleId==roleId&&g.RevokedAt==null));
        if(departmentId.HasValue) query=query.Where(x=>x.RoleAssignments.Any(g=>g.DepartmentId==departmentId&&g.RevokedAt==null));
        var total=await query.CountAsync(ct);
        var users=await query.OrderBy(x=>x.UserId).Skip(Math.Max(0,skip)).Take(Math.Clamp(take,1,100)).ToListAsync(ct);
        return new {total,items=users.Select(View).ToArray()};
    }
    public async Task<object> Detail(int actor,int id,CancellationToken ct=default)
    {
        await DemandManage(actor,ct); var user=await Load(id,ct:ct);
        var appointments=await db.Database.SqlQuery<StaffAppointmentView>($"""
            SELECT a.AppointmentId,a.DepartmentId,a.PositionId,d.Name AS Department,p.Name AS Position,
              a.EmploymentType,a.ValidFrom,a.ValidTo FROM dbo.StaffAppointments a
            JOIN dbo.Departments d ON d.DepartmentId=a.DepartmentId JOIN dbo.Positions p ON p.PositionId=a.PositionId
            WHERE a.UserId={id} ORDER BY a.ValidFrom DESC
            """).ToListAsync(ct);
        var invitation=await db.AccountInvitations.AsNoTracking().Where(x=>x.UserId==id).OrderByDescending(x=>x.Id)
            .Select(x=>new{x.CreatedAt,x.ExpiresAt,x.UsedAt,x.RevokedAt}).FirstOrDefaultAsync(ct);
        var delivery=await db.AccountEmails.AsNoTracking().Where(x=>x.Recipient==user.Email && x.Subject=="TEKY - Kích hoạt tài khoản")
            .OrderByDescending(x=>x.Id).Select(x=>new{x.SentAt,x.Attempts,x.NextAttemptAt}).FirstOrDefaultAsync(ct);
        return new {user=View(user),appointments,invitation,delivery};
    }

    private async Task ValidateGrant(RoleGrantRequest g,CancellationToken ct)
    {
        if(g.RoleId is <1 or >6 || g.ScopeType is not ("GLOBAL" or "DEPARTMENT") ||
            (g.ScopeType=="GLOBAL" && g.DepartmentId!=null) || (g.ScopeType=="DEPARTMENT" && g.DepartmentId==null) ||
            (g.RoleId==3 && g.ScopeType!="GLOBAL")) Fail(400,"Role hoặc phạm vi không hợp lệ.");
        if(g.DepartmentId.HasValue && !await db.Database.SqlQuery<int>($"SELECT DepartmentId AS Value FROM dbo.Departments WHERE DepartmentId={g.DepartmentId.Value} AND IsActive=1").AnyAsync(ct))
            Fail(400,"Phòng ban không tồn tại hoặc đã ngừng hoạt động.");
    }
    private async Task EnsureProfile(User user,byte role,CancellationToken ct)
    {
        var id=user.UserId;
        if(role==1)await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles WHERE UserId={id}) INSERT dbo.StudentProfiles(UserId,StudentCode) VALUES({id},{"ST-"+id});",ct);
        if(role==2)await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.TeacherProfiles WHERE UserId={id}) INSERT dbo.TeacherProfiles(UserId,TeacherCode) VALUES({id},{"TC-"+id});",ct);
        if(role==3)await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.AdminProfiles WHERE UserId={id}) INSERT dbo.AdminProfiles(UserId,StaffCode) VALUES({id},{"AD-"+id});",ct);
        if(role==4)await db.Database.ExecuteSqlInterpolatedAsync($"IF NOT EXISTS(SELECT 1 FROM dbo.ParentProfiles WHERE UserId={id}) INSERT dbo.ParentProfiles(UserId) VALUES({id});",ct);
    }
    private async Task AddGrant(int actor,User user,RoleGrantRequest g,CancellationToken ct)
    {
        await ValidateGrant(g,ct);
        if(user.RoleAssignments.Any(x=>x.RoleId==g.RoleId&&x.ScopeType==g.ScopeType&&x.DepartmentId==g.DepartmentId&&x.RevokedAt==null))
            Fail(409,"Role trong phạm vi này đã được cấp.");
        user.RoleAssignments.Add(new UserRoleAssignment{RoleId=g.RoleId,ScopeType=g.ScopeType,DepartmentId=g.DepartmentId,AssignedBy=actor});
        await EnsureProfile(user,g.RoleId,ct);
    }
    public Task<object> Create(int actor,CreateUserRequest r,CancellationToken ct=default) => Locked<object>(actor,async()=>
    {
        if(string.IsNullOrWhiteSpace(r.FullName)||r.Grants.Length==0||r.Grants.Length>20||!r.Grants.Any(x=>x.RoleId==r.PrimaryRoleId))Fail(400,"Tên, role hoặc role mặc định không hợp lệ.");
        foreach(var g in r.Grants)await ValidateGrant(g,ct);
        var email=r.Email.Trim().ToLowerInvariant();
        if(await db.Users.AnyAsync(x=>x.Email.Trim().ToLower()==email,ct))Fail(409,"Email đã tồn tại.");
        var user=new User{Email=email,FullName=r.FullName.Trim(),Phone=string.IsNullOrWhiteSpace(r.Phone)?null:r.Phone.Trim(),
            PasswordHash=hasher.HashPassword(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))),PrimaryRoleId=r.PrimaryRoleId,
            Status="Pending",ActivationPending=true,ThemeMode="Light",CreatedAt=DateTime.UtcNow};
        db.Users.Add(user); await db.SaveChangesAsync(ct);
        foreach(var g in r.Grants)await AddGrant(actor,user,g,ct);
        await Invite(actor,user,ct); Audit(actor,user.UserId,"USER_CREATED",after:new{user.Email,user.FullName,r.PrimaryRoleId,r.Grants});
        return new{userId=user.UserId,status="Pending",message="Đã tạo tài khoản; lời mời đang chờ gửi email."};
    },ct);

    private async Task Invite(int actor,User user,CancellationToken ct)
    {
        var now=DateTime.UtcNow;
        if(await db.AccountInvitations.AnyAsync(x=>x.UserId==user.UserId&&x.CreatedAt>now.AddSeconds(-60),ct))Fail(409,"Vui lòng chờ 60 giây trước khi gửi lại.");
        foreach(var old in await db.AccountInvitations.Where(x=>x.UserId==user.UserId&&x.UsedAt==null&&x.RevokedAt==null).ToListAsync(ct))old.RevokedAt=now;
        // Flush revocations before inserting a replacement under the filtered unique index.
        await db.SaveChangesAsync(ct);
        var origin=configuration["Account:InvitationBaseUrl"];
        if(!Uri.TryCreate(origin,UriKind.Absolute,out var uri)||uri.Scheme is not ("http" or "https")||!string.IsNullOrEmpty(uri.Query)||!string.IsNullOrEmpty(uri.Fragment))
            Fail(503,"Chưa cấu hình địa chỉ kích hoạt tài khoản. Liên hệ quản trị hệ thống.");
        var token=Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        db.AccountInvitations.Add(new AccountInvitation{UserId=user.UserId,TokenHash=HashToken(token),ExpiresAt=now.AddHours(24),CreatedBy=actor,CreatedAt=now});
        AccountEmailWorker.Enqueue(db,protection,user.Email,"TEKY - Kích hoạt tài khoản",
            $"Xin chào {user.FullName},\nĐặt mật khẩu tại: {origin!.TrimEnd('/')}/accept-invitation#token={token}\nLiên kết có hiệu lực 24 giờ, chỉ sử dụng một lần.");
    }
    public Task<object> Resend(int actor,int id,UserMutationRequest r,CancellationToken ct=default)=>Locked<object>(actor,async()=>
    {
        var user=await Load(id,r.Version,ct); if(!user.ActivationPending||user.Status!="Pending")Fail(409,"Chỉ gửi lời mời cho tài khoản đang chờ kích hoạt.");
        await Invite(actor,user,ct);user.AdministrationVersion++;Audit(actor,id,"INVITATION_RESENT");return new{success=true,message="Lời mời mới đang chờ gửi email."};
    },ct);

    private async Task Invalidate(User user,CancellationToken ct)
    {
        user.SecurityVersion++;
        foreach(var s in await db.UserSessions.Where(x=>x.UserId==user.UserId&&x.IsActive).ToListAsync(ct)){s.IsActive=false;s.LogoutAt=DateTime.UtcNow;}
        foreach(var otp in await db.PasswordResetOtps.Where(x=>x.UserId==user.UserId&&x.UsedAt==null).ToListAsync(ct))otp.UsedAt=DateTime.UtcNow;
    }
    private async Task PreserveAdmins(CancellationToken ct)
    {
        if(!await db.UserRoles.AnyAsync(g=>g.RoleId==3&&g.ScopeType=="GLOBAL"&&g.RevokedAt==null&&g.User.Status=="Active"&&!g.User.ActivationPending,ct))
            Fail(409,"Phải giữ ít nhất một System Admin đang hoạt động.");
    }
    public Task<object> Mutate(int actor,int id,string operation,UserMutationRequest r,long? grantId=null,CancellationToken ct=default)=>Locked<object>(actor,async()=>
    {
        var user=await Load(id,r.Version,ct);
        var before=new{user.Status,user.PrimaryRoleId,Grants=user.RoleAssignments.Where(g=>g.RevokedAt==null).Select(g=>new{g.UserRoleId,g.RoleId,g.ScopeType,g.DepartmentId}).ToArray()};
        switch(operation)
        {
            case "status":
                if(r.Status is not ("Active" or "Locked"))Fail(400,"Trạng thái không hợp lệ.");
                if(id==actor)Fail(409,"Không thể tự thay đổi trạng thái tài khoản.");
                if(string.IsNullOrWhiteSpace(r.Reason)||r.Reason.Length>500)Fail(400,"Cần lý do, tối đa 500 ký tự.");
                user.Status=r.Status=="Active"&&user.ActivationPending?"Pending":r.Status!;
                if(user.Status=="Locked")foreach(var inv in await db.AccountInvitations.Where(x=>x.UserId==id&&x.UsedAt==null&&x.RevokedAt==null).ToListAsync(ct))inv.RevokedAt=DateTime.UtcNow;
                break;
            case "grant":
                if(r.Grant==null)Fail(400,"Chưa chọn role.");await AddGrant(actor,user,r.Grant!,ct);break;
            case "primary":
                if(!r.PrimaryRoleId.HasValue)Fail(400,"Chưa chọn role mặc định.");user.PrimaryRoleId=r.PrimaryRoleId!.Value;break;
            case "revoke":
                var grant=user.RoleAssignments.SingleOrDefault(x=>x.UserRoleId==grantId&&x.RevokedAt==null);
                if(grant==null)Fail(404,"Không tìm thấy quyền đang có hiệu lực.");
                if(id==actor&&grant!.RoleId==3)Fail(409,"Không thể tự thu hồi System Admin.");
                grant!.RevokedAt=DateTime.UtcNow;if(r.PrimaryRoleId.HasValue)user.PrimaryRoleId=r.PrimaryRoleId.Value;break;
            default: Fail(400,"Thao tác không hợp lệ.");break;
        }
        if(!user.RoleAssignments.Any(g=>g.RoleId==user.PrimaryRoleId&&g.RevokedAt==null))Fail(409,"Role mặc định phải có grant còn hiệu lực; hãy chọn role thay thế.");
        user.AdministrationVersion++; user.UpdatedAt=DateTime.UtcNow;await Invalidate(user,ct);
        Audit(actor,id,"USER_"+operation.ToUpperInvariant(),before,new{user.Status,user.PrimaryRoleId,r.Grant,r.Reason,grantId});
        await db.SaveChangesAsync(ct);await PreserveAdmins(ct);return new{success=true,version=user.AdministrationVersion};
    },ct);
    public Task<object> Update(int actor,int id,UpdateUserRequest r,CancellationToken ct=default)=>Locked<object>(actor,async()=>
    {
        var user=await Load(id,r.Version,ct);if(string.IsNullOrWhiteSpace(r.FullName))Fail(400,"Họ tên không được để trống.");
        var before=new{user.FullName,user.Phone};var phone=string.IsNullOrWhiteSpace(r.Phone)?null:r.Phone.Trim();
        if(phone!=null&&await db.Users.AnyAsync(x=>x.UserId!=id&&x.Phone==phone,ct))Fail(409,"Số điện thoại đã được sử dụng.");
        user.FullName=r.FullName.Trim();user.Phone=phone;user.UpdatedAt=DateTime.UtcNow;user.AdministrationVersion++;
        Audit(actor,id,"USER_PROFILE_UPDATED",before,new{user.FullName,user.Phone});return new{success=true,version=user.AdministrationVersion};
    },ct);

    public static string HashToken(string value)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public Task<object> Accept(AcceptInvitationRequest r,CancellationToken ct=default)=>Locked<object>(null,async()=>
    {
        if(r.NewPassword!=r.ConfirmPassword||r.NewPassword.Length<12||Encoding.UTF8.GetByteCount(r.NewPassword)>72)Fail(400,"Mật khẩu phải trùng khớp, từ 12 ký tự và tối đa 72 byte UTF-8.");
        var hash=HashToken(r.Token);var inv=await db.AccountInvitations.Include(x=>x.User).SingleOrDefaultAsync(x=>x.TokenHash==hash&&x.UsedAt==null&&x.RevokedAt==null,ct);
        if(inv==null||inv.ExpiresAt<=DateTime.UtcNow||!inv.User.ActivationPending||inv.User.Status!="Pending")Fail(400,"Lời mời không hợp lệ, đã dùng hoặc đã hết hạn.");
        var user=inv!.User;
        if(!await db.UserRoles.AnyAsync(g=>g.UserId==user.UserId&&g.RoleId==user.PrimaryRoleId&&g.RevokedAt==null,ct))Fail(409,"Tài khoản chưa được cấp role mặc định hợp lệ.");
        inv.UsedAt=DateTime.UtcNow;user.PasswordHash=hasher.HashPassword(r.NewPassword);user.ActivationPending=false;user.Status="Active";
        user.MustChangePwd=false;user.AdministrationVersion++;await Invalidate(user,ct);Audit(user.UserId,user.UserId,"INVITATION_ACCEPTED");
        return new{success=true,message="Đã kích hoạt tài khoản. Vui lòng đăng nhập."};
    },ct);

    public async Task<object> Catalog(int actor,CancellationToken ct=default)
    {
        await DemandManage(actor,ct);
        var roles=await db.Roles.AsNoTracking().OrderBy(x=>x.RoleId).Select(x=>new{x.RoleId,x.RoleName}).ToListAsync(ct);
        var permissions=await (from rp in db.RolePermissions join p in db.Permissions on rp.PermissionId equals p.PermissionId select new{rp.RoleId,p.Code,p.Description}).ToListAsync(ct);
        var departments=await db.Database.SqlQuery<DirectoryEntry>($"SELECT DepartmentId AS Id,Code,Name,IsActive FROM dbo.Departments ORDER BY Name").ToListAsync(ct);
        var positions=await db.Database.SqlQuery<DirectoryEntry>($"SELECT PositionId AS Id,Code,Name,IsActive FROM dbo.Positions ORDER BY Name").ToListAsync(ct);
        return new{roles,permissions,departments,positions};
    }
    public async Task<object> AuditEvents(int actor,int id,int skip,int take,CancellationToken ct=default)
    {
        await DemandManage(actor,ct);var key=id.ToString();var query=db.AuditLogs.AsNoTracking().Where(x=>x.EntityType=="User"&&x.EntityId==key);
        return new{total=await query.CountAsync(ct),items=await query.OrderByDescending(x=>x.CreatedAt).ThenByDescending(x=>x.AuditId).Skip(Math.Max(skip,0)).Take(Math.Clamp(take,1,100)).Select(x=>new{x.ActorUserId,x.Action,x.OldValue,x.NewValue,x.CreatedAt}).ToListAsync(ct)};
    }

    public Task<object> Appointment(int actor,int id,AppointmentRequest r,long? endId,CancellationToken ct=default)=>Locked<object>(actor,async()=>
    {
        var user=await Load(id,r.Version,ct);
        if(endId.HasValue)
        {
            var changed=await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE dbo.StaffAppointments SET ValidTo=SYSUTCDATETIME() WHERE AppointmentId={endId.Value} AND UserId={id} AND ValidTo IS NULL",ct);
            if(changed!=1)Fail(404,"Không tìm thấy bổ nhiệm đang có hiệu lực.");
        }
        else
        {
            if(r.EmploymentType is not ("FULL_TIME" or "PART_TIME" or "CONTRACTOR"))Fail(400,"Loại hình làm việc không hợp lệ.");
            if(!await db.Database.SqlQuery<int>($"SELECT DepartmentId AS Value FROM dbo.Departments WHERE DepartmentId={r.DepartmentId} AND IsActive=1").AnyAsync(ct)||
               !await db.Database.SqlQuery<int>($"SELECT PositionId AS Value FROM dbo.Positions WHERE PositionId={r.PositionId} AND IsActive=1").AnyAsync(ct))Fail(400,"Phòng ban hoặc chức danh không hợp lệ.");
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT dbo.StaffAppointments(UserId,DepartmentId,PositionId,EmploymentType) VALUES({id},{r.DepartmentId},{r.PositionId},{r.EmploymentType})",ct);
        }
        user.AdministrationVersion++;Audit(actor,id,endId.HasValue?"APPOINTMENT_ENDED":"APPOINTMENT_CREATED",after:new{endId,r.DepartmentId,r.PositionId,r.EmploymentType});return new{success=true};
    },ct);

    public Task<object> Directory(int actor,string kind,int? id,DirectoryRequest r,CancellationToken ct=default)=>Locked<object>(actor,async()=>
    {
        if(string.IsNullOrWhiteSpace(r.Name))Fail(400,"Tên không được để trống.");
        int changed;
        if(kind=="departments")changed=id.HasValue
            ?await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE dbo.Departments SET Name={r.Name.Trim()},IsActive={r.IsActive} WHERE DepartmentId={id.Value}",ct)
            :await db.Database.ExecuteSqlInterpolatedAsync($"INSERT dbo.Departments(Code,Name,IsActive) VALUES({r.Code},{r.Name.Trim()},{r.IsActive})",ct);
        else if(kind=="positions")changed=id.HasValue
            ?await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE dbo.Positions SET Name={r.Name.Trim()},IsActive={r.IsActive} WHERE PositionId={id.Value}",ct)
            :await db.Database.ExecuteSqlInterpolatedAsync($"INSERT dbo.Positions(Code,Name,IsActive) VALUES({r.Code},{r.Name.Trim()},{r.IsActive})",ct);
        else{Fail(404,"Danh mục không tồn tại.");return new{};}
        if(changed==0)Fail(404,"Không tìm thấy mục cần cập nhật.");
        db.AuditLogs.Add(new AuditLog{ActorUserId=actor,ActorType="User",Action="DIRECTORY_UPDATED",EntityType=kind,EntityId=id?.ToString(),NewValue=JsonSerializer.Serialize(r)});
        return new{success=true};
    },ct);
}
