using System.Text.Json;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Admin;
using TekyLearningHub.Domain.Entities;

namespace TekyLearningHub.Application.Services.Admin;

/// <summary>Appointments are the source of business grants. All public mutations use the identity transaction lock.</summary>
public sealed class StaffAccessService(IStaffAccessRepository db, IUserAdministrationRepository administration, IUnitOfWork unit) : IStaffAccessService
{
    private static readonly string[] EmploymentTypes = ["FULL_TIME", "PART_TIME", "CONTRACTOR"];
    private static void Fail(int status, string message) => throw new UserAdministrationException(status, message);
    private static RoleGrantRequest Grant(byte role, int? department) => new() { RoleId = role, ScopeType = department.HasValue ? "DEPARTMENT" : "GLOBAL", DepartmentId = department };
    private static string Key(RoleGrantRequest grant) => $"{grant.RoleId}:{grant.ScopeType}:{grant.DepartmentId}";
    private static RoleGrantRequest[] Unique(IEnumerable<RoleGrantRequest> grants) => grants.DistinctBy(Key).OrderBy(Key).ToArray();
    private static RoleGrantRequest[] Current(User user) => Unique(user.RoleAssignments.Where(x => x.RevokedAt == null).Select(x => Grant(x.RoleId, x.DepartmentId)));
    private static bool Live(UserRoleGrantSource source) => source.EndedAt == null &&
        (source.Kind != "APPOINTMENT" || source.Appointment is { ValidTo: null } && source.Appointment.PolicyId == source.PolicyId);

    private async Task<T> Locked<T>(int actor, Func<Task<T>> operation, CancellationToken ct)
    {
        try { return await unit.ExecuteAsync(TransactionKind.IdentityAdministration, async () => { await Demand(actor, ct); return await operation(); }, ct); }
        catch (PersistenceConflictException exception) { throw new UserAdministrationException(409, exception.Message); }
    }
    private async Task Demand(int actor, CancellationToken ct) { if (!await administration.CanManage(actor, ct)) Fail(403, "Bạn không có quyền quản lý nhân sự và cấu hình quyền."); }
    private async Task<User> Load(int id, int? version, CancellationToken ct)
    {
        var user = await db.User(id, ct);
        if (user == null) throw new UserAdministrationException(404, "Không tìm thấy tài khoản.");
        if (version.HasValue && user.AdministrationVersion != version.Value) Fail(409, "Tài khoản vừa thay đổi. Hãy tải lại trước khi lưu.");
        return user;
    }
    private static void Staff(User user) { if (user.PrimaryRoleId is 1 or 4) Fail(409, "Học viên và Phụ huynh không được bổ nhiệm nhân sự."); }
    private static void Managed(User user)
    {
        Staff(user);
        if (!user.StaffAccessManaged && user.RoleAssignments.Any(x => x.RevokedAt == null && x.RoleId is 2 or 5 or 6))
            Fail(409, "Cần đối soát vai trò và chức danh trước khi thay đổi bổ nhiệm. Quyền cũ được giữ đến khi đối soát.");
    }
    private static PositionPolicyView View(Position position, int count)
    {
        var latest = position.Policies.OrderByDescending(x => x.Version).FirstOrDefault();
        var active = position.Policies.SingleOrDefault(x => x.IsPublished);
        return new(position.PositionId, position.DepartmentId, position.Name, position.Department.Name,
            position.IsActive && position.Department.IsActive, latest?.Version ?? 0, latest?.IsPublished ?? false,
            latest?.Roles.Select(x => (int)x.RoleId).Order().ToArray() ?? [], latest?.EmploymentTypes.Split(',') ?? EmploymentTypes, count,
            active?.Version, active?.Roles.Select(x => (int)x.RoleId).Order().ToArray(), active?.EmploymentTypes.Split(','),
            latest?.Permissions.Select(x => x.Permission.Code).Order().ToArray() ?? [],
            active?.Permissions.Select(x => x.Permission.Code).Order().ToArray() ?? [],
            position.Department.FunctionCode,
            active == null ? null : PositionTemplates.Match(position.Department.FunctionCode,
                active.Roles.Select(x => (int)x.RoleId), active.Permissions.Select(x => x.Permission.Code)));
    }
    public async Task<PositionPolicyView[]> Policies(int actor, CancellationToken ct = default)
    {
        await Demand(actor, ct);
        var positions = await db.Positions(ct);
        var counts = await db.AppointmentCounts(ct);
        return positions.Select(position => View(position, counts.GetValueOrDefault(position.PositionId))).ToArray();
    }
    private static void ValidatePolicy(PolicyRequest request)
    {
        if (request.RoleIds.Length > 3 || request.RoleIds.Any(x => x is not (2 or 5 or 6)) || request.RoleIds.Distinct().Count() != request.RoleIds.Length)
            Fail(400, "Chức danh chỉ cấp các vai trò Giáo viên, Nhân sự chuyên môn hoặc Quản lý chuyên môn.");
        if (request.Publish && request.RoleIds.Length == 0)
            Fail(400, "Chọn ít nhất một vai trò hệ thống để quyền của chức danh có hiệu lực khi bổ nhiệm.");
        if (request.PermissionCodes.Distinct().Count() != request.PermissionCodes.Length)
            Fail(400, "Danh sách quyền có mã trùng nhau.");
        if (request.PermissionCodes.Length == 0)
            Fail(400, "Chọn ít nhất một quyền cho chức danh.");
        if (request.EmploymentTypes.Length == 0 || request.EmploymentTypes.Any(x => !EmploymentTypes.Contains(x)) || request.EmploymentTypes.Distinct().Count() != request.EmploymentTypes.Length)
            Fail(400, "Loại hình làm việc không hợp lệ.");
    }
    private async Task SavePermissions(PositionAccessPolicy policy, string[] permissionCodes, CancellationToken ct)
    {
        var known = await db.ExistingPermissionCodes(ct);
        var unknown = permissionCodes.Where(code => !known.Contains(code)).ToArray();
        if (unknown.Length > 0) Fail(400, $"Quyền không tồn tại: {string.Join(", ", unknown)}.");
        await db.SavePermissions(policy, permissionCodes, ct);
    }
    private async Task<(Position Position, List<StaffAppointment> Appointments)> PolicyContext(int id, PolicyRequest request, CancellationToken ct)
    {
        ValidatePolicy(request);
        var position = await db.Position(id, ct) ?? throw new UserAdministrationException(404, "Không tìm thấy chức danh.");
        if ((position.Policies.Select(x => x.Version).DefaultIfEmpty(0).Max()) != request.Version) Fail(409, "Cấu hình chức danh vừa thay đổi. Hãy tải lại.");
        if (request.Publish && (!position.IsActive || !position.Department.IsActive)) Fail(409, "Không áp dụng cấu hình cho chức danh hoặc phòng ban đã ngừng sử dụng.");
        var appointments = await db.PositionAppointments(id, ct);
        if (appointments.Any(x => x.PolicyId != null && !request.EmploymentTypes.Contains(x.EmploymentType)))
            Fail(409, "Loại hình mới không phù hợp với bổ nhiệm hiện tại. Hãy chuyển bổ nhiệm trước.");
        if (appointments.Select(x => x.UserId).Distinct().Count() > 100) Fail(409, "Cấu hình ảnh hưởng quá 100 tài khoản; cần chia đợt áp dụng trước khi lưu.");
        return (position, appointments);
    }
    private static RoleGrantRequest[] Remaining(User user, Func<UserRoleGrantSource, bool> remove) => Unique(user.RoleAssignments
        .Where(grant => grant.RevokedAt == null && (grant.Sources.Count == 0 || grant.Sources.Any(source => Live(source) && !remove(source))))
        .Select(grant => Grant(grant.RoleId, grant.DepartmentId)));
    public async Task<StaffPreview> PolicyPreview(int actor, int positionId, PolicyRequest request, CancellationToken ct = default)
    {
        await Demand(actor, ct);
        var (position, appointments) = await PolicyContext(positionId, request, ct);
        var changes = new List<UserAccessImpact>();
        foreach (var group in appointments.Where(x => x.PolicyId != null).GroupBy(x => x.UserId))
        {
            var user = await Load(group.Key, null, ct);
            var ids = group.Select(x => x.AppointmentId).ToHashSet();
            var after = Unique(Remaining(user, source => source.AppointmentId.HasValue && ids.Contains(source.AppointmentId.Value))
                .Concat(request.RoleIds.Select(role => Grant((byte)role, position.DepartmentId))));
            changes.Add(new(user.UserId, user.FullName, Current(user), request.Publish ? after : Current(user)));
        }
        var warnings = new List<string>();
        if (appointments.Any(x => x.PolicyId == null))
            warnings.Add("Bổ nhiệm cũ chưa đối soát sẽ giữ quyền hiện tại; cần đối soát riêng trước khi nhận cấu hình mới.");
        var active = position.Policies.SingleOrDefault(policy => policy.IsPublished);
        var currentCodes = active?.Permissions.Select(permission => permission.Permission.Code).Order().ToArray() ?? [];
        var granted = request.PermissionCodes.Order().ToArray();
        var removed = currentCodes.Except(granted).ToArray();
        var added = granted.Except(currentCodes).ToArray();
        if (removed.Length > 0) warnings.Add($"Quyền bị thu hồi: {string.Join(", ", removed)}.");
        if (added.Length > 0) warnings.Add($"Quyền được cấp thêm: {string.Join(", ", added)}.");
        return new([], [], [], warnings.ToArray(),
            changes.Select(x => x.UserId).ToArray(), changes.ToArray());
    }
    public Task<PositionPolicyView> SavePolicy(int actor, int positionId, PolicyRequest request, CancellationToken ct = default) =>
        Locked(actor, () => SavePolicyCore(actor, positionId, request, ct), ct);

    private async Task<PositionPolicyView> SavePolicyCore(int actor, int positionId, PolicyRequest request, CancellationToken ct)
    {
        var (position, appointments) = await PolicyContext(positionId, request, ct);
        if (request.Publish && appointments.Any(x => x.PolicyId != null) && string.IsNullOrWhiteSpace(request.Reason)) Fail(400, "Nhập lý do thay đổi quyền của các bổ nhiệm đang hiệu lực.");
        if (request.Publish)
        {
            foreach (var old in position.Policies.Where(x => x.IsPublished)) old.IsPublished = false;
            await unit.SaveChangesAsync(ct);
        }
        var policy = new PositionAccessPolicy { Position = position, PositionId = positionId, Version = request.Version + 1,
            IsPublished = request.Publish, EmploymentTypes = string.Join(',', request.EmploymentTypes), CreatedBy = actor, CreatedAt = DateTime.UtcNow };
        policy.Roles = request.RoleIds.Select(role => new PositionPolicyRole { Policy = policy, RoleId = (byte)role }).ToList();
        db.AddPolicy(policy); await unit.SaveChangesAsync(ct);
        await SavePermissions(policy, request.PermissionCodes, ct);
        if (request.Publish)
        {
            foreach (var group in appointments.Where(x => x.PolicyId != null).GroupBy(x => x.UserId))
            {
                var user = await Load(group.Key, null, ct);
                var before = Current(user);
                foreach (var appointment in group)
                {
                    EndSources(user, source => source.AppointmentId == appointment.AppointmentId);
                    appointment.Policy = policy; appointment.PolicyId = policy.PolicyId; appointment.Version++;
                    await AddSources(actor, user, appointment, policy, ct);
                }
                await Finish(actor, user, null, false, request.Reason, "POSITION_ACCESS_CHANGED", ct, before);
            }
        }
        Audit(actor, null, "POSITION_POLICY_SAVED", new { positionId, request.Publish, policy.Version, request.RoleIds, request.PermissionCodes, request.Reason });
        return View(position, appointments.Count);
    }

    /// <summary>Saves the job title and its role policy in one transaction, including affected appointments.</summary>
    public Task<PositionPolicyView> SavePosition(int actor, int? positionId, PositionSaveRequest request, CancellationToken ct = default) => Locked(actor, async () =>
    {
        if (string.IsNullOrWhiteSpace(request.Name)) Fail(400, "Tên chức danh không được để trống.");
        request.Policy.Publish = true;
        ValidatePolicy(request.Policy);
        var department = await db.Department(request.DepartmentId, ct) ?? throw new UserAdministrationException(400, "Phòng ban không tồn tại.");
        Position position;
        if (positionId.HasValue)
        {
            position = await db.Position(positionId.Value, ct) ?? throw new UserAdministrationException(404, "Không tìm thấy chức danh.");
            if (position.Policies.Select(policy => policy.Version).DefaultIfEmpty(0).Max() != request.Policy.Version)
                Fail(409, "Chức danh vừa thay đổi. Hãy tải lại trước khi lưu.");
            if (position.DepartmentId != department.DepartmentId && await administration.HasPositionAppointments(position.PositionId, ct))
                Fail(409, "Chức danh đã có lịch sử bổ nhiệm. Hãy tạo chức danh ở phòng đích và chuyển bổ nhiệm.");
            if (!department.IsActive && position.DepartmentId != department.DepartmentId) Fail(400, "Phòng ban đã ngừng sử dụng.");
        }
        else
        {
            if (!department.IsActive) Fail(400, "Phòng ban đã ngừng sử dụng.");
            if (request.Policy.Version != 0) Fail(409, "Chức danh mới không có phiên bản cấu hình trước đó.");
            position = new Position();
            db.AddPosition(position);
        }
        var code = positionId.HasValue ? position.Code : string.IsNullOrWhiteSpace(request.Code)
            ? UserAdministrationService.BuildPositionCode(department.Code, request.Name) : request.Code.Trim();
        if ((!positionId.HasValue || position.DepartmentId != department.DepartmentId) &&
            await administration.DirectoryCodeExists("positions", code, department.DepartmentId, ct))
            Fail(409, "Mã chức danh đã tồn tại trong phòng ban. Hãy dùng mã khác.");
        var previous = new { position.Name, position.DepartmentId, position.IsActive };
        position.Name = request.Name.Trim(); position.Code = code; position.Department = department;
        position.DepartmentId = department.DepartmentId;
        var active = position.Policies.SingleOrDefault(policy => policy.IsPublished);
        var changed = active == null || !active.Roles.Select(role => (int)role.RoleId).Order().SequenceEqual(request.Policy.RoleIds.Order()) ||
            !active.EmploymentTypes.Split(',').Order().SequenceEqual(request.Policy.EmploymentTypes.Order()) ||
            !active.Permissions.Select(permission => permission.Permission.Code).Order().SequenceEqual(request.Policy.PermissionCodes.Order());
        // A policy can only be published on an active job title, so deactivation is applied after the policy.
        if (request.IsActive || changed) position.IsActive = true;
        await unit.SaveChangesAsync(ct);
        if (changed && !position.Department.IsActive) Fail(409, "Không áp dụng cấu hình quyền cho phòng ban đã ngừng sử dụng.");
        var result = changed ? await SavePolicyCore(actor, position.PositionId, request.Policy, ct)
            : View(position, (await db.PositionAppointments(position.PositionId, ct)).Count);
        if (!request.IsActive && position.IsActive)
        {
            position.IsActive = false;
            await unit.SaveChangesAsync(ct);
            result = result with { IsActive = false };
        }
        administration.AddAudit(new AuditLog { ActorUserId = actor, ActorType = "User", Action = "DIRECTORY_UPDATED", EntityType = "positions",
            EntityId = position.PositionId.ToString(), OldValue = JsonSerializer.Serialize(previous),
            NewValue = JsonSerializer.Serialize(new { position.Name, position.DepartmentId, position.IsActive, request.Policy.RoleIds, request.Policy.PermissionCodes }), CreatedAt = DateTime.UtcNow });
        return result;
    }, ct);

    private async Task<(Position Position, PositionAccessPolicy Policy)> ResolveOne(AppointmentInput input, CancellationToken ct)
    {
        var position = await db.Position(input.PositionId, ct) ?? throw new UserAdministrationException(400, "Không tìm thấy chức danh.");
        if (!position.IsActive || !position.Department.IsActive || position.DepartmentId != input.DepartmentId)
            Fail(400, "Chức danh không thuộc phòng ban đã chọn hoặc đã ngừng sử dụng.");
        var policy = position.Policies.SingleOrDefault(x => x.IsPublished) ?? throw new UserAdministrationException(409, "Chức danh cần cấu hình quyền trước khi bổ nhiệm.");
        if (input.PolicyVersion != policy.Version) Fail(409, "Quyền của chức danh vừa thay đổi. Hãy xem lại trước khi lưu.");
        if (!policy.EmploymentTypes.Split(',').Contains(input.EmploymentType)) Fail(400, "Loại hình làm việc không phù hợp với chức danh.");
        return (position, policy);
    }
    public async Task<RoleGrantRequest[]> Resolve(AppointmentInput[] appointments, CancellationToken ct = default)
    {
        if (appointments.Length > 20 || appointments.Select(x => x.PositionId).Distinct().Count() != appointments.Length) Fail(400, "Bổ nhiệm bị trùng hoặc vượt quá 20 chức danh.");
        var grants = new List<RoleGrantRequest>();
        foreach (var input in appointments)
        {
            var (position, policy) = await ResolveOne(input, ct);
            grants.AddRange(policy.Roles.Select(role => Grant(role.RoleId, position.DepartmentId)));
        }
        return Unique(grants);
    }
    public async Task<StaffPreview> PreviewNew(int actor, AppointmentInput[] appointments, CancellationToken ct = default)
    {
        await Demand(actor, ct);
        var grants = await Resolve(appointments, ct);
        return new([], grants, grants.Select(x => (int)x.RoleId).Distinct().ToArray(), [], []);
    }
    public async Task Assign(int actor, User user, AppointmentInput input, CancellationToken ct = default)
    {
        Staff(user);
        var (position, policy) = await ResolveOne(input, ct);
        if ((await db.Appointments(user.UserId, ct)).Any(x => x.PositionId == position.PositionId && x.ValidTo == null)) Fail(409, "Người dùng đang có bổ nhiệm chức danh này.");
        var appointment = new StaffAppointment { UserId = user.UserId, DepartmentId = position.DepartmentId, Position = position,
            PositionId = position.PositionId, EmploymentType = input.EmploymentType, Policy = policy, PolicyId = policy.PolicyId,
            CreatedBy = actor, ValidFrom = DateTime.UtcNow };
        db.AddAppointment(appointment); await unit.SaveChangesAsync(ct);
        await AddSources(actor, user, appointment, policy, ct);
    }
    private async Task AddSources(int actor, User user, StaffAppointment appointment, PositionAccessPolicy policy, CancellationToken ct)
    {
        foreach (var role in policy.Roles)
        {
            var grant = user.RoleAssignments.SingleOrDefault(x => x.RoleId == role.RoleId && x.DepartmentId == appointment.DepartmentId && x.RevokedAt == null);
            if (grant == null)
            {
                grant = new UserRoleAssignment { UserId = user.UserId, RoleId = role.RoleId, ScopeType = "DEPARTMENT", DepartmentId = appointment.DepartmentId, AssignedBy = actor };
                user.RoleAssignments.Add(grant);
            }
            grant.Sources.Add(new UserRoleGrantSource { Grant = grant, Appointment = appointment, AppointmentId = appointment.AppointmentId,
                PolicyId = policy.PolicyId, Kind = "APPOINTMENT", CreatedBy = actor, CreatedAt = DateTime.UtcNow });
            await administration.EnsureProfileForRole(user.UserId, role.RoleId, ct);
        }
    }
    private static void EndSources(User user, Func<UserRoleGrantSource, bool> match)
    {
        var now = DateTime.UtcNow;
        foreach (var source in user.RoleAssignments.SelectMany(x => x.Sources).Where(x => x.EndedAt == null && match(x))) source.EndedAt = now;
    }
    private void Audit(int actor, int? target, string action, object after) => administration.AddAudit(new AuditLog {
        ActorUserId = actor, ActorType = "User", Action = action, EntityType = target.HasValue ? "User" : "Position",
        EntityId = target?.ToString(), NewValue = JsonSerializer.Serialize(after), CreatedAt = DateTime.UtcNow });
    private async Task Finish(int actor, User user, byte? primary, bool disable, string reason, string action, CancellationToken ct, RoleGrantRequest[]? before = null)
    {
        var now = DateTime.UtcNow;
        foreach (var grant in user.RoleAssignments.Where(x => x.RevokedAt == null && x.Sources.Count > 0 && !x.Sources.Any(Live))) grant.RevokedAt = now;
        var remaining = user.RoleAssignments.Where(x => x.RevokedAt == null).Select(x => x.RoleId).Distinct().Order().ToArray();
        if (remaining.Length == 0)
        {
            if (!disable) Fail(409, "Đây là nguồn quyền cuối cùng. Thêm bổ nhiệm thay thế hoặc xác nhận ngừng truy cập.");
            if (user.UserId == actor) Fail(409, "Không thể tự ngừng truy cập tài khoản của mình.");
            user.Status = "Locked";
        }
        else
        {
            var chosen = primary ?? (remaining.Contains(user.PrimaryRoleId) ? user.PrimaryRoleId : remaining[0]);
            if (!remaining.Contains(chosen)) Fail(400, "Trang mở sau đăng nhập phải thuộc vai trò còn hiệu lực.");
            user.PrimaryRoleId = chosen;
        }
        user.StaffAccessManaged = true; user.AdministrationVersion++; user.SecurityVersion++; user.UpdatedAt = now;
        await db.InvalidateSessions(user.UserId, now, ct);
        administration.AddAudit(new AuditLog {
            ActorUserId = actor, ActorType = "User", Action = action, EntityType = "User", EntityId = user.UserId.ToString(),
            OldValue = JsonSerializer.Serialize(new { Grants = before ?? [] }),
            NewValue = JsonSerializer.Serialize(new { Grants = Current(user), Reason = reason, user.PrimaryRoleId, Status = user.Status }), CreatedAt = now
        });
        await unit.SaveChangesAsync(ct);
        if (!await administration.HasActiveAdmin(ct)) Fail(409, "Phải giữ ít nhất một Quản trị hệ thống đang hoạt động.");
    }
    public async Task<StaffAccessState> State(int userId, CancellationToken ct = default)
    {
        var user = await Load(userId, null, ct);
        var appointments = await db.Appointments(userId, ct);
        return new(user.StaffAccessManaged,
            user.RoleAssignments.Any(x => x.RevokedAt == null && x.RoleId is 2 or 5 or 6 && (!user.StaffAccessManaged || !x.Sources.Any(Live) || x.Sources.Any(s => s.Kind == "LEGACY" && s.EndedAt == null))) ||
            appointments.Any(x => x.ValidTo == null && x.PolicyId == null),
            appointments.Select(x => new AppointmentAccessView(x.AppointmentId, x.DepartmentId, x.PositionId, x.Position.Department.Name,
                x.Position.Name, x.EmploymentType, x.ValidFrom, x.ValidTo, x.Policy?.Version ?? 0, x.Policy?.Roles.Select(r => (int)r.RoleId).Order().ToArray() ?? [])).ToArray(),
            user.RoleAssignments.Where(x => x.RevokedAt == null).SelectMany(grant => grant.Sources.Where(Live).Select(source =>
                new GrantSourceView(grant.UserRoleId, source.SourceId, source.Kind, source.AppointmentId, source.Appointment?.Position.Name,
                    source.Appointment?.Position.Department.Name, source.Reason))).ToArray());
    }
    private async Task<StaffPreview> ChangePreview(int userId, StaffChangeRequest request, CancellationToken ct)
    {
        var user = await Load(userId, request.Version, ct); Managed(user);
        var appointments = await db.Appointments(userId, ct);
        if (appointments.Any(x => x.ValidTo == null && x.PolicyId == null)) Fail(409, "Cần đối soát các bổ nhiệm cũ trước khi thêm hoặc chuyển chức danh.");
        if (request.EndAppointmentId.HasValue && !appointments.Any(x => x.AppointmentId == request.EndAppointmentId && x.ValidTo == null))
            Fail(404, "Không tìm thấy bổ nhiệm đang hiệu lực.");
        if (!request.EndAppointmentId.HasValue && request.Appointment == null) Fail(400, "Chọn bổ nhiệm cần thêm hoặc kết thúc.");
        var extra = request.Appointment == null ? [] : await Resolve([request.Appointment], ct);
        var after = Unique(Remaining(user, source => request.EndAppointmentId.HasValue && source.AppointmentId == request.EndAppointmentId).Concat(extra));
        return new(Current(user), after, after.Select(x => (int)x.RoleId).Distinct().ToArray(),
            after.Length == 0 ? ["Tài khoản sẽ ngừng truy cập nếu không có bổ nhiệm thay thế."] : [], [userId]);
    }
    public async Task<StaffPreview> Preview(int actor, int userId, StaffChangeRequest request, CancellationToken ct = default) { await Demand(actor, ct); return await ChangePreview(userId, request, ct); }
    public Task<AdministrationVersion> Change(int actor, int userId, StaffChangeRequest request, CancellationToken ct = default) => Locked<AdministrationVersion>(actor, async () =>
    {
        var preview = await ChangePreview(userId, request, ct);
        var user = await Load(userId, request.Version, ct);
        if (request.EndAppointmentId.HasValue)
        {
            var appointment = (await db.Appointments(userId, ct)).Single(x => x.AppointmentId == request.EndAppointmentId);
            EndSources(user, source => source.AppointmentId == appointment.AppointmentId);
            appointment.ValidTo = DateTime.UtcNow > appointment.ValidFrom ? DateTime.UtcNow : appointment.ValidFrom.AddTicks(1);
            appointment.EndedBy = actor; appointment.EndReason = request.Reason; appointment.Version++;
            await unit.SaveChangesAsync(ct);
        }
        if (request.Appointment != null) await Assign(actor, user, request.Appointment, ct);
        await Finish(actor, user, request.PrimaryRoleId, request.DisableAccess, request.Reason,
            request.EndAppointmentId.HasValue ? request.Appointment == null ? "APPOINTMENT_ENDED" : "APPOINTMENT_TRANSFERRED" : "APPOINTMENT_CREATED", ct, preview.Before);
        return new(true, user.AdministrationVersion);
    }, ct);

    private async Task<StaffPreview> ReconciliationPreview(int userId, ReconcileStaffRequest request, CancellationToken ct)
    {
        var user = await Load(userId, request.Version, ct); Staff(user);
        var retained = user.RoleAssignments.Where(x => x.RevokedAt == null && (x.RoleId == 3 || request.RetainGrantIds.Contains(x.UserRoleId))).ToArray();
        if (request.RetainGrantIds.Any(id => !user.RoleAssignments.Any(x => x.UserRoleId == id && x.RevokedAt == null))) Fail(400, "Quyền giữ lại không thuộc tài khoản này.");
        var derived = await Resolve(request.Appointments, ct);
        var after = Unique(retained.Select(x => Grant(x.RoleId, x.DepartmentId)).Concat(derived));
        return new(Current(user), after, after.Select(x => (int)x.RoleId).Distinct().ToArray(),
            ["Quyền cũ không được giữ lại sẽ bị thu hồi. Quyền bổ sung cần ghi lý do và được lưu nguồn riêng.",
             "Quyền Giáo viên theo phòng chỉ truy cập lớp được giao có khóa học thuộc phòng đó. Kiểm tra phòng phụ trách của khóa học cũ trước khi thu hẹp quyền toàn hệ thống."], [userId]);
    }
    public async Task<StaffPreview> ReconcilePreview(int actor, int userId, ReconcileStaffRequest request, CancellationToken ct = default) { await Demand(actor, ct); return await ReconciliationPreview(userId, request, ct); }
    public Task<AdministrationVersion> Reconcile(int actor, int userId, ReconcileStaffRequest request, CancellationToken ct = default) => Locked<AdministrationVersion>(actor, async () =>
    {
        var preview = await ReconciliationPreview(userId, request, ct);
        if (string.IsNullOrWhiteSpace(request.Reason)) Fail(400, "Nhập lý do xác nhận bổ nhiệm và quyền được giữ lại.");
        var user = await Load(userId, request.Version, ct);
        foreach (var grant in user.RoleAssignments.Where(x => x.RevokedAt == null))
        {
            foreach (var source in grant.Sources.Where(x => x.EndedAt == null)) source.EndedAt = DateTime.UtcNow;
            if (grant.RoleId == 3 || request.RetainGrantIds.Contains(grant.UserRoleId)) grant.Sources.Add(new UserRoleGrantSource {
                Grant = grant, Kind = grant.RoleId == 3 ? "SYSTEM_ADMIN" : "EXCEPTION", Reason = request.Reason, CreatedBy = actor, CreatedAt = DateTime.UtcNow });
            else grant.RevokedAt = DateTime.UtcNow;
        }
        foreach (var appointment in (await db.Appointments(userId, ct)).Where(x => x.ValidTo == null))
        {
            appointment.ValidTo = DateTime.UtcNow > appointment.ValidFrom ? DateTime.UtcNow : appointment.ValidFrom.AddTicks(1);
            appointment.EndedBy = actor; appointment.EndReason = request.Reason; appointment.Version++;
        }
        await unit.SaveChangesAsync(ct);
        foreach (var input in request.Appointments) await Assign(actor, user, input, ct);
        await Finish(actor, user, request.PrimaryRoleId, request.DisableAccess, request.Reason, "STAFF_ACCESS_RECONCILED", ct, preview.Before);
        return new(true, user.AdministrationVersion);
    }, ct);

    public async Task<StaffPreview> ExceptionPreview(int actor, int userId, StaffExceptionRequest request, CancellationToken ct = default)
    {
        await Demand(actor, ct);
        var user = await Load(userId, request.Version, ct); Managed(user);
        var grant = request.Grant;
        if (string.IsNullOrWhiteSpace(request.Reason) || grant.RoleId is not (2 or 5 or 6) ||
            !(grant.ScopeType == "GLOBAL" && grant.DepartmentId == null || grant.ScopeType == "DEPARTMENT" && grant.DepartmentId.HasValue))
            Fail(400, "Quyền bổ sung cần vai trò nghiệp vụ, phạm vi hợp lệ và lý do cụ thể.");
        if (grant.DepartmentId.HasValue && !await administration.DepartmentExists(grant.DepartmentId.Value, ct)) Fail(400, "Phòng ban không tồn tại hoặc đã ngừng sử dụng.");
        if (user.RoleAssignments.Any(existing => existing.RevokedAt == null && existing.RoleId == grant.RoleId && existing.DepartmentId == grant.DepartmentId &&
            existing.Sources.Any(source => source.Kind == "EXCEPTION" && source.EndedAt == null))) Fail(409, "Quyền bổ sung trong phạm vi này đã được cấp.");
        var after = Unique(Current(user).Append(grant));
        return new(Current(user), after, after.Select(x => (int)x.RoleId).Distinct().ToArray(),
            [grant.ScopeType == "GLOBAL" ? "Ngoại lệ này cấp quyền toàn hệ thống và được lưu lý do riêng." : "Quyền này được giữ riêng ngoài các chức danh đang có."], [userId]);
    }
    public Task<AdministrationVersion> GrantException(int actor, int userId, StaffExceptionRequest request, CancellationToken ct = default) => Locked<AdministrationVersion>(actor, async () =>
    {
        var preview = await ExceptionPreview(actor, userId, request, ct);
        var user = await Load(userId, request.Version, ct);
        var grant = user.RoleAssignments.SingleOrDefault(x => x.RevokedAt == null && x.RoleId == request.Grant.RoleId && x.DepartmentId == request.Grant.DepartmentId);
        if (grant == null) { grant = new UserRoleAssignment { RoleId = request.Grant.RoleId, ScopeType = request.Grant.ScopeType, DepartmentId = request.Grant.DepartmentId, AssignedBy = actor }; user.RoleAssignments.Add(grant); }
        grant.Sources.Add(new() { Grant = grant, Kind = "EXCEPTION", Reason = request.Reason, CreatedBy = actor, CreatedAt = DateTime.UtcNow });
        await administration.EnsureProfileForRole(user.UserId, grant.RoleId, ct);
        await Finish(actor, user, null, false, request.Reason, "STAFF_EXCEPTION_GRANTED", ct, preview.Before);
        return new(true, user.AdministrationVersion);
    }, ct);
}
