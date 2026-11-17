using TekyLearningHub.Application.Common;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.DTOs.Auth;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Admin;

public sealed class UserAdministrationException(int status, string message) : UseCaseException(status, message);

/// <summary>Identity administration checks live grants and serializes changes, including
/// invitation consumption, so concurrent administrators cannot remove the last admin.</summary>
public sealed class UserAdministrationService(IUserAdministrationRepository db, IUnitOfWork unit, IPasswordHasher hasher, IAccountEmailOutbox emailOutbox, AccountOptions options) : IUserAdministrationService
{
    [DoesNotReturn]
    private static void Fail(int status, string message) => throw new UserAdministrationException(status, message);
    public async Task DemandManage(int actor, CancellationToken ct = default)
    {
        var allowed = await db.CanManage(actor, ct);
        if (!allowed) Fail(403, "Bạn không có quyền quản lý tài khoản.");
    }

    private async Task<T> Locked<T>(int? actor, Func<Task<T>> operation, CancellationToken ct)
    {
        try
        {
            return await unit.ExecuteAsync(TransactionKind.IdentityAdministration, async () =>
            {
                if (actor.HasValue) await DemandManage(actor.Value, ct);
                return await operation();
            }, ct);
        }
        catch (PersistenceConflictException e) { throw new UserAdministrationException(409, e.Message); }
    }

    private void Audit(int actor, int target, string action, object? before = null, object? after = null) =>
        db.AddAudit(new AuditLog
        {
            ActorUserId = actor,
            ActorType = "User",
            Action = action,
            EntityType = "User",
            EntityId = target.ToString(),
            OldValue = before == null ? null : JsonSerializer.Serialize(before),
            NewValue = after == null ? null : JsonSerializer.Serialize(after),
            CreatedAt = DateTime.UtcNow
        });

    private async Task<User> Load(int id, int? version = null, CancellationToken ct = default)
    {
        var user = await db.Load(id, ct);
        if (user == null) Fail(404, "Không tìm thấy tài khoản.");
        if (version.HasValue && user!.AdministrationVersion != version.Value) Fail(409, "Dữ liệu vừa thay đổi. Hãy tải lại trước khi lưu.");
        return user!;
    }
    private static ManagedUserDto View(User u) => new(u.UserId, u.Email, u.FullName, u.Phone, u.Status, u.ActivationPending, u.PrimaryRoleId, u.PrimaryRole.RoleName, u.AdministrationVersion, u.CreatedAt, u.LastLoginAt,
        u.RoleAssignments.OrderBy(g => g.UserRoleId).Select(g => new ManagedGrantDto(g.UserRoleId, g.RoleId, g.Role.RoleName, g.ScopeType, g.DepartmentId, g.AssignedBy, g.AssignedAt, g.RevokedAt)).ToArray());

    public async Task<ManagedUserPage> List(int actor, string? q, string? status, byte? roleId, int? departmentId,
        int skip, int take, CancellationToken ct = default)
    {
        await DemandManage(actor, ct);
        var (total, users) = await db.List(q, status, roleId, departmentId, skip, take, ct);
        return new ManagedUserPage(total, users.Select(View).ToArray());
    }
    public async Task<ManagedUserDetail> Detail(int actor, int id, CancellationToken ct = default)
    {
        await DemandManage(actor, ct); var user = await Load(id, ct: ct);
        var appointments = await db.Appointments(id, ct);
        var invitation = await db.LatestInvitation(id, ct);
        var delivery = await db.LatestDelivery(user.Email, ct);
        return new ManagedUserDetail(View(user), appointments,
            invitation is null ? null : new InvitationView(invitation.CreatedAt, invitation.ExpiresAt, invitation.UsedAt, invitation.RevokedAt),
            delivery is null ? null : new DeliveryView(delivery.SentAt, delivery.Attempts, delivery.NextAttemptAt));
    }

    private async Task ValidateGrant(RoleGrantRequest g, CancellationToken ct)
    {
        if (g.RoleId is < 1 or > 6 || g.ScopeType is not ("GLOBAL" or "DEPARTMENT") ||
            (g.ScopeType == "GLOBAL" && g.DepartmentId != null) || (g.ScopeType == "DEPARTMENT" && g.DepartmentId == null) ||
            (g.RoleId == 3 && g.ScopeType != "GLOBAL")) Fail(400, "Role hoặc phạm vi không hợp lệ.");
        if (g.DepartmentId.HasValue && !await db.DepartmentExists(g.DepartmentId.Value, ct))
            Fail(400, "Phòng ban không tồn tại hoặc đã ngừng hoạt động.");
    }
    private Task EnsureProfile(User user, byte role, CancellationToken ct) => role switch
    {
        1 => db.EnsureStudentProfile(user.UserId, "ST-" + user.UserId, ct),
        2 => db.EnsureTeacherProfile(user.UserId, "TC-" + user.UserId, ct),
        3 => db.EnsureAdminProfile(user.UserId, "AD-" + user.UserId, ct),
        4 => db.EnsureParentProfile(user.UserId, ct),
        _ => Task.CompletedTask
    };
    private static bool IsPersonal(byte role) => role is 1 or 4;
    private static bool IsStaff(byte role) => role is 2 or 3 or 5 or 6;
    private static void ValidateAccountRoles(byte primary, IEnumerable<RoleGrantRequest> grants, int status)
    {
        var roles = grants.ToArray();
        var valid = IsPersonal(primary)
            ? roles.Length == 1 && roles[0].RoleId == primary && roles[0].ScopeType == "GLOBAL" && roles[0].DepartmentId == null
            : IsStaff(primary) && roles.Length > 0 && roles.All(g => IsStaff(g.RoleId)) && roles.Any(g => g.RoleId == primary);
        if (!valid) Fail(status, "Học viên và Phụ huynh phải dùng tài khoản riêng với một vai trò duy nhất. Tài khoản nhân sự chỉ được cấp vai trò nhân sự.");
    }
    private static RoleGrantRequest[] ActiveGrants(User user) => user.RoleAssignments
        .Where(g => g.RevokedAt == null).Select(g => new RoleGrantRequest { RoleId = g.RoleId, ScopeType = g.ScopeType, DepartmentId = g.DepartmentId }).ToArray();
    private async Task AddGrant(int actor, User user, RoleGrantRequest g, CancellationToken ct)
    {
        await ValidateGrant(g, ct);
        ValidateAccountRoles(IsStaff(user.PrimaryRoleId) ? g.RoleId : user.PrimaryRoleId, ActiveGrants(user).Append(g), 409);
        if (user.RoleAssignments.Any(x => x.RoleId == g.RoleId && x.ScopeType == g.ScopeType && x.DepartmentId == g.DepartmentId && x.RevokedAt == null))
            Fail(409, "Role trong phạm vi này đã được cấp.");
        user.RoleAssignments.Add(new UserRoleAssignment { RoleId = g.RoleId, ScopeType = g.ScopeType, DepartmentId = g.DepartmentId, AssignedBy = actor });
        await EnsureProfile(user, g.RoleId, ct);
    }
    public Task<CreatedUserResult> Create(int actor, CreateUserRequest r, CancellationToken ct = default) => Locked<CreatedUserResult>(actor, async () =>
    {
        if (string.IsNullOrWhiteSpace(r.FullName) || r.Grants.Length == 0 || r.Grants.Length > 20 || !r.Grants.Any(x => x.RoleId == r.PrimaryRoleId)) Fail(400, "Tên, role hoặc role mặc định không hợp lệ.");
        ValidateAccountRoles(r.PrimaryRoleId, r.Grants, 400);
        foreach (var g in r.Grants) await ValidateGrant(g, ct);
        var email = r.Email.Trim().ToLowerInvariant();
        if (await db.EmailExists(email, ct)) Fail(409, "Email đã tồn tại.");
        var user = new User
        {
            Email = email,
            FullName = r.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(r.Phone) ? null : r.Phone.Trim(),
            PasswordHash = hasher.HashPassword(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))),
            PrimaryRoleId = r.PrimaryRoleId,
            Status = "Pending",
            ActivationPending = true,
            ThemeMode = "Light",
            CreatedAt = DateTime.UtcNow
        };
        db.AddUser(user); await unit.SaveChangesAsync(ct);
        foreach (var g in r.Grants) await AddGrant(actor, user, g, ct);
        await Invite(actor, user, ct); Audit(actor, user.UserId, "USER_CREATED", after: new { user.Email, user.FullName, r.PrimaryRoleId, r.Grants });
        return new CreatedUserResult(user.UserId, "Pending", "Đã tạo tài khoản; lời mời đang chờ gửi email.");
    }, ct);

    private async Task Invite(int actor, User user, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        if (await db.RecentInvitation(user.UserId, now, ct)) Fail(409, "Vui lòng chờ 60 giây trước khi gửi lại.");
        foreach (var old in await db.OpenInvitations(user.UserId, ct)) old.RevokedAt = now;
        // Flush revocations before inserting a replacement under the filtered unique index.
        await unit.SaveChangesAsync(ct);
        var origin = options.InvitationBaseUrl;
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https") || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
            Fail(503, "Chưa cấu hình địa chỉ kích hoạt tài khoản. Liên hệ quản trị hệ thống.");
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        db.AddInvitation(new AccountInvitation { UserId = user.UserId, TokenHash = HashToken(token), ExpiresAt = now.AddHours(24), CreatedBy = actor, CreatedAt = now });
        emailOutbox.Enqueue(user.Email, "TEKY - Kích hoạt tài khoản",
            $"Xin chào {user.FullName},\nĐặt mật khẩu tại: {origin!.TrimEnd('/')}/accept-invitation#token={token}\nLiên kết có hiệu lực 24 giờ, chỉ sử dụng một lần.");
    }
    public Task<AdministrationMessage> Resend(int actor, int id, UserMutationRequest r, CancellationToken ct = default) => Locked<AdministrationMessage>(actor, async () =>
    {
        var user = await Load(id, r.Version, ct); if (!user.ActivationPending || user.Status != "Pending") Fail(409, "Chỉ gửi lời mời cho tài khoản đang chờ kích hoạt.");
        await Invite(actor, user, ct); user.AdministrationVersion++; Audit(actor, id, "INVITATION_RESENT"); return new AdministrationMessage(true, "Lời mời mới đang chờ gửi email.");
    }, ct);

    private async Task Invalidate(User user, CancellationToken ct)
    {
        user.SecurityVersion++;
        foreach (var s in await db.ActiveSessions(user.UserId, ct)) { s.IsActive = false; s.LogoutAt = DateTime.UtcNow; }
        foreach (var otp in await db.UnusedOtps(user.UserId, ct)) otp.UsedAt = DateTime.UtcNow;
    }
    private async Task PreserveAdmins(CancellationToken ct)
    {
        if (!await db.HasActiveAdmin(ct))
            Fail(409, "Phải giữ ít nhất một System Admin đang hoạt động.");
    }
    public Task<AdministrationVersion> Mutate(int actor, int id, string operation, UserMutationRequest r, long? grantId = null, CancellationToken ct = default) => Locked<AdministrationVersion>(actor, async () =>
    {
        var user = await Load(id, r.Version, ct);
        var before = new { user.Status, user.PrimaryRoleId, Grants = user.RoleAssignments.Where(g => g.RevokedAt == null).Select(g => new { g.UserRoleId, g.RoleId, g.ScopeType, g.DepartmentId }).ToArray() };
        switch (operation)
        {
            case "status":
                if (r.Status is not ("Active" or "Locked")) Fail(400, "Trạng thái không hợp lệ.");
                if (id == actor) Fail(409, "Không thể tự thay đổi trạng thái tài khoản.");
                if (string.IsNullOrWhiteSpace(r.Reason) || r.Reason.Length > 500) Fail(400, "Cần lý do, tối đa 500 ký tự.");
                user.Status = r.Status == "Active" && user.ActivationPending ? "Pending" : r.Status!;
                if (user.Status == "Locked") foreach (var inv in await db.OpenInvitations(id, ct)) inv.RevokedAt = DateTime.UtcNow;
                break;
            case "grant":
                if (r.Grant == null) Fail(400, "Chưa chọn role."); await AddGrant(actor, user, r.Grant!, ct); break;
            case "primary":
                if (IsPersonal(user.PrimaryRoleId) || !r.PrimaryRoleId.HasValue || !IsStaff(r.PrimaryRoleId.Value)) Fail(409, "Không thể thay đổi loại tài khoản bằng vai trò mặc định.");
                if (!r.PrimaryRoleId.HasValue) Fail(400, "Chưa chọn role mặc định."); user.PrimaryRoleId = r.PrimaryRoleId!.Value; break;
            case "revoke":
                if (IsPersonal(user.PrimaryRoleId)) Fail(409, "Không thể thu hồi vai trò duy nhất. Hãy khóa tài khoản để ngừng truy cập.");
                if (r.PrimaryRoleId.HasValue && !IsStaff(r.PrimaryRoleId.Value)) Fail(409, "Không thể thay đổi loại tài khoản.");
                var grant = user.RoleAssignments.SingleOrDefault(x => x.UserRoleId == grantId && x.RevokedAt == null);
                if (grant == null) Fail(404, "Không tìm thấy quyền đang có hiệu lực.");
                if (id == actor && grant!.RoleId == 3) Fail(409, "Không thể tự thu hồi System Admin.");
                grant!.RevokedAt = DateTime.UtcNow; if (r.PrimaryRoleId.HasValue) user.PrimaryRoleId = r.PrimaryRoleId.Value; break;
            default: Fail(400, "Thao tác không hợp lệ."); break;
        }
        if (!user.RoleAssignments.Any(g => g.RoleId == user.PrimaryRoleId && g.RevokedAt == null)) Fail(409, "Role mặc định phải có grant còn hiệu lực; hãy chọn role thay thế.");
        if (operation != "status") ValidateAccountRoles(user.PrimaryRoleId, ActiveGrants(user), 409);
        user.AdministrationVersion++; user.UpdatedAt = DateTime.UtcNow; await Invalidate(user, ct);
        Audit(actor, id, "USER_" + operation.ToUpperInvariant(), before, new { user.Status, user.PrimaryRoleId, r.Grant, r.Reason, grantId });
        await unit.SaveChangesAsync(ct); await PreserveAdmins(ct); return new AdministrationVersion(true, user.AdministrationVersion);
    }, ct);
    public Task<AdministrationVersion> Update(int actor, int id, UpdateUserRequest r, CancellationToken ct = default) => Locked<AdministrationVersion>(actor, async () =>
    {
        var user = await Load(id, r.Version, ct); if (string.IsNullOrWhiteSpace(r.FullName)) Fail(400, "Họ tên không được để trống.");
        var before = new { user.FullName, user.Phone }; var phone = string.IsNullOrWhiteSpace(r.Phone) ? null : r.Phone.Trim();
        if (phone != null && await db.PhoneExists(id, phone, ct)) Fail(409, "Số điện thoại đã được sử dụng.");
        user.FullName = r.FullName.Trim(); user.Phone = phone; user.UpdatedAt = DateTime.UtcNow; user.AdministrationVersion++;
        Audit(actor, id, "USER_PROFILE_UPDATED", before, new { user.FullName, user.Phone }); return new AdministrationVersion(true, user.AdministrationVersion);
    }, ct);

    public static string HashToken(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public Task<AdministrationMessage> Accept(AcceptInvitationRequest r, CancellationToken ct = default) => Locked<AdministrationMessage>(null, async () =>
    {
        if (r.NewPassword != r.ConfirmPassword || r.NewPassword.Length < 12 || Encoding.UTF8.GetByteCount(r.NewPassword) > 72) Fail(400, "Mật khẩu phải trùng khớp, từ 12 ký tự và tối đa 72 byte UTF-8.");
        var hash = HashToken(r.Token); var inv = await db.FindInvitation(hash, ct);
        if (inv == null || inv.ExpiresAt <= DateTime.UtcNow || !inv.User.ActivationPending || inv.User.Status != "Pending") Fail(400, "Lời mời không hợp lệ, đã dùng hoặc đã hết hạn.");
        var user = inv!.User;
        if (!await db.HasPrimaryGrant(user, ct)) Fail(409, "Tài khoản chưa được cấp role mặc định hợp lệ.");
        inv.UsedAt = DateTime.UtcNow; user.PasswordHash = hasher.HashPassword(r.NewPassword); user.ActivationPending = false; user.Status = "Active";
        user.MustChangePwd = false; user.AdministrationVersion++; await Invalidate(user, ct); Audit(user.UserId, user.UserId, "INVITATION_ACCEPTED");
        return new AdministrationMessage(true, "Đã kích hoạt tài khoản. Vui lòng đăng nhập.");
    }, ct);

    public async Task<AdministrationCatalog> Catalog(int actor, CancellationToken ct = default)
    {
        await DemandManage(actor, ct);
        return await db.Catalog(ct);
    }
    public async Task<AuditPage> AuditEvents(int actor, int id, int skip, int take, CancellationToken ct = default)
    {
        await DemandManage(actor, ct); return await db.AuditEvents(id, skip, take, ct);
    }

    public Task<AdministrationSuccess> Appointment(int actor, int id, AppointmentRequest r, long? endId, CancellationToken ct = default) => Locked<AdministrationSuccess>(actor, async () =>
    {
        var user = await Load(id, r.Version, ct);
        if (endId.HasValue)
        {
            var changed = await db.EndAppointment(id, endId.Value, ct);
            if (changed != 1) Fail(404, "Không tìm thấy bổ nhiệm đang có hiệu lực.");
        }
        else
        {
            if (!IsStaff(user.PrimaryRoleId)) Fail(409, "Chỉ tài khoản nhân sự mới được bổ nhiệm phòng ban và chức danh.");
            if (r.EmploymentType is not ("FULL_TIME" or "PART_TIME" or "CONTRACTOR")) Fail(400, "Loại hình làm việc không hợp lệ.");
            if (!await db.DepartmentExists(r.DepartmentId, ct) ||
               !await db.PositionExists(r.PositionId, ct)) Fail(400, "Phòng ban hoặc chức danh không hợp lệ.");
            // A position is scoped to one department, so the appointment must match.
            if (!await db.PositionBelongsToDepartment(r.PositionId, r.DepartmentId, ct))
                Fail(400, "Chức danh không thuộc phòng ban đã chọn.");
            await db.AddAppointment(id, r, ct);
        }
        user.AdministrationVersion++; Audit(actor, id, endId.HasValue ? "APPOINTMENT_ENDED" : "APPOINTMENT_CREATED", after: new { endId, r.DepartmentId, r.PositionId, r.EmploymentType }); return new AdministrationSuccess(true);
    }, ct);

    public Task<AdministrationSuccess> Directory(int actor, string kind, int? id, DirectoryRequest r, CancellationToken ct = default) => Locked<AdministrationSuccess>(actor, async () =>
    {
        if (string.IsNullOrWhiteSpace(r.Name)) Fail(400, "Tên không được để trống.");
        if (kind is not ("departments" or "positions")) Fail(404, "Danh mục không tồn tại.");
        var duplicateMessage = kind == "departments"
            ? "Mã phòng ban đã tồn tại. Hãy dùng mã khác hoặc cập nhật phòng ban hiện có."
            : "Mã chức danh đã tồn tại. Hãy dùng mã khác hoặc cập nhật chức danh hiện có.";
        var code = r.Code?.Trim() ?? "";

        if (kind == "departments")
        {
            if (code.Length == 0) Fail(400, "Mã phòng ban không được để trống.");
        }
        else
        {
            // A position always belongs to one department so accounts can be grouped by it.
            var departmentId = r.DepartmentId ?? 0;
            if (departmentId == 0) Fail(400, "Vui lòng chọn phòng ban cho chức danh.");
            if (!await db.DepartmentExists(departmentId, ct)) Fail(400, "Phòng ban không hợp lệ.");
            // The code is generated from the department code unless the admin supplied one.
            if (code.Length == 0)
            {
                var departmentCode = await db.DepartmentCode(departmentId, ct);
                if (string.IsNullOrWhiteSpace(departmentCode)) Fail(400, "Phòng ban không hợp lệ.");
                code = BuildPositionCode(departmentCode!, r.Name);
            }
        }

        r.Code = code;
        if (!id.HasValue)
        {
            // Include inactive entries: deactivation does not release a directory code.
            var exists = await db.DirectoryCodeExists(kind, r.Code, r.DepartmentId, ct);
            if (exists) Fail(409, duplicateMessage);
        }
        int changed;
        try
        {
            changed = await db.WriteDirectory(kind, id, r, ct);
        }
        // Keep the existing business conflict message for duplicate directory codes.
        catch (PersistenceConflictException ex) when (ex.Duplicate)
        { throw new UserAdministrationException(409, duplicateMessage); }
        if (changed == 0) Fail(404, "Không tìm thấy mục cần cập nhật.");
        db.AddAudit(new AuditLog { ActorUserId = actor, ActorType = "User", Action = "DIRECTORY_UPDATED", EntityType = kind, EntityId = id?.ToString(), NewValue = JsonSerializer.Serialize(r) });
        return new AdministrationSuccess(true);
    }, ct);

    /// <summary>Builds a position code as DEPT_NAME, for example ACADEMIC_GIAO_VIEN.</summary>
    internal static string BuildPositionCode(string departmentCode, string name)
    {
        var normalized = RemoveDiacritics(name).ToUpperInvariant();
        var builder = new StringBuilder(normalized.Length);
        var lastWasSeparator = false;
        foreach (var character in normalized)
        {
            if (char.IsAsciiLetterOrDigit(character))
            {
                builder.Append(character);
                lastWasSeparator = false;
            }
            else if (!lastWasSeparator && builder.Length > 0)
            {
                builder.Append('_');
                lastWasSeparator = true;
            }
        }
        var suffix = builder.ToString().Trim('_');
        if (suffix.Length == 0) suffix = "POSITION";
        // The directory code is limited to 40 characters, so the budget depends on the prefix.
        var budget = Math.Max(4, 40 - departmentCode.Length - 1);
        if (suffix.Length > budget) suffix = suffix[..budget].TrimEnd('_');
        if (suffix.Length == 0) suffix = "POSITION";
        return $"{departmentCode.ToUpperInvariant()}_{suffix}";
    }

    private static string RemoveDiacritics(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark) builder.Append(character);
        }
        return builder.ToString().Normalize(NormalizationForm.FormC);
    }
}
