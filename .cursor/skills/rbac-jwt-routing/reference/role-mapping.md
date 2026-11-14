# Role mapping sites in detail

The role ID to name mapping exists in several places. They must all agree, or users land on the wrong dashboard.

## Canonical source

`backend/src/TekyLearningHub.Domain/Enums/UserRole.cs`

```csharp
public enum UserRole : byte
{
    Student = 1,
    Teacher = 2,
    Admin = 3,
    Parent = 4,
    Staff = 5,
    AcademicManager = 6
}
```

## Backend sites

### `RoleNameNormalizer.cs` (canonical helper)

Single place that owns both directions:

- `Normalize(string? rawRoleName)` — PascalCase from the `Roles` table to snake_case for claims and DTOs. Handles aliases (`tutor`, `gv`, `administrator`, `guardian`, `giao_vu`, `academicmanager`, `manager`).
- `FromRoleId(byte roleId)` — enum-driven fallback when `user.Role` is not loaded.

### `JwtTokenGenerator.cs`

Emits the claims:

```csharp
var roleName = RoleNameNormalizer.Normalize(user.Role?.RoleName) ?? RoleNameNormalizer.FromRoleId(user.RoleId);

var claims = new List<Claim>
{
    new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
    new(ClaimTypes.Email, user.Email),
    new(ClaimTypes.Name, user.FullName),
    new(ClaimTypes.Role, roleName),
    new("role_id", user.RoleId.ToString()),
    new("role_name", roleName),
    new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
};
```

`role` and `role_name` carry the same snake_case value, so the frontend never has to guess.

### `AuthService.cs`

`MapToUserDto` sets `UserDto.Role`. It must use the same normalizer, otherwise the login response body and the token claim disagree.

## Frontend sites

### `frontend/shared/auth/jwt.ts`

`ROLE_ID_MAP` mirrors the enum:

```typescript
const ROLE_ID_MAP: Record<number, UserRole> = {
  1: 'student',
  2: 'teacher',
  3: 'admin',
  4: 'parent',
  5: 'staff',
  6: 'academic_manager',
};
```

`roleFromClaims` prefers `role_id`, then falls back to `role_name`, then `role`. All three go through `normalizeRoleString`.

### `frontend/shared/api-client/auth.ts`

`normalizeRole(backendRole)` handles the raw role string from the API. It maps both names and numeric IDs.

### `frontend/src/services/auth.ts`

An app-root copy of the same function. Must be edited in lockstep with the shared one.

## Verifying they agree

After any role change, decode a real token and check the claims:

```bash
# with a live token
echo "$TOKEN" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null
```

Expect:

```json
{
  "role_id": "2",
  "role": "teacher",
  "role_name": "teacher"
}
```

For `manager@teky.edu.vn` (role_id 6), expect `academic_manager` in both `role` and `role_name`.

Then confirm the login response body agrees:

```json
{
  "data": {
    "user": {
      "roleId": 6,
      "role": "academic_manager"
    }
  }
}
```

If `roleId` and `role` disagree, `AuthService.MapToUserDto` is out of sync.

## Historical drift (fixed)

Before the fix, `JwtTokenGenerator` and `shared/api-client/auth.ts` both used this wrong table:

| RoleId | Correct | Was |
|---|---|---|
| 1 | student | student |
| 2 | teacher | parent |
| 3 | admin | teacher |
| 4 | parent | academic_manager |
| 5 | staff | admin |
| 6 | academic_manager | missing |

Effect: a teacher logged into the Parent Dashboard, and admins landed on the Teacher Dashboard.
