# Role mapping and shell routing

Keep this reference synchronized with `docs/architecture/README.md`, `docs/architecture/conventions.md` and `frontend/README.md`. Paths below are relative to the repository root.

## Canonical roles

The source of role IDs is `backend/src/TekyLearningHub.Domain/Enums/UserRole.cs`.

| ID | Domain enum | Claim/DTO/frontend role | App and dashboard |
| --- | --- | --- | --- |
| 1 | Student | student | Portal 3000 `/student` |
| 2 | Teacher | teacher | Backoffice 3001 `/teacher` |
| 3 | SystemAdmin | system_admin | Backoffice 3001 `/admin` |
| 4 | Parent | parent | Portal 3000 `/parent` |
| 5 | AcademicStaff | academic_staff | Backoffice 3001 `/staff` |
| 6 | AcademicManager | academic_manager | Backoffice 3001 `/academic-manager` |

`admin` and `staff` are legacy aliases; emitted claims and shared frontend types use `system_admin` and `academic_staff`. Role IDs do not express a permission hierarchy.

## Backend ownership

- `Infrastructure/Security/RoleNameNormalizer.cs` normalizes aliases and maps IDs to canonical strings.
- `Infrastructure/Security/JwtTokenGenerator.cs` takes `role_id` and `role_name` from `PrimaryRoleId`. The `role` claim contains all active role memberships and can be an array. It also emits `security_version`.
- `Infrastructure/Security/UserAuthorization.cs` validates active grants and primary-role membership. `SessionAuthorization.cs` compares JWT authorization with the current account.
- `Infrastructure/Services/Auth/AuthService.cs` maps `PrimaryRole`/`PrimaryRoleId` and active role memberships into `UserDto`.
- Auth controllers are in `Api/Controllers/Auth`; administrative controllers are in `Api/Controllers/Admin`; student controllers are in `Api/Controllers/Portal`; teacher reviews are in `Api/Controllers/Backoffice`.

## Frontend ownership

- `frontend/shared/auth/jwt.ts` decodes claims and normalizes roles. A supplied unknown `role_id` fails closed; it must not fall back to a privileged role string.
- `frontend/shared/api-client/auth.ts` verifies identity and the complete set of role memberships with `/api/auth/me`. Cached role/profile values do not authorize a session.
- `frontend/src/services/auth.ts` re-exports the shared API client. Do not introduce a second implementation.
- `frontend/shared/auth/shellConfig.ts` owns app origins and role-to-dashboard mapping. Origins are configurable using `VITE_PUBLIC_ORIGIN`, `VITE_PORTAL_ORIGIN`, `VITE_BACKOFFICE_ORIGIN`.
- `shellTransfer.ts` and `shellHandshake.ts` transfer sessions using a one-use code and PKCE; tokens must not appear in URLs.
- `AuthProvider.logout()` calls `frontend/shared/auth/logout.ts` for every role and password-change flow. It clears/revokes the current session and replaces the page with public login at port 5173 by default. The public app consumes `?loggedOut=1` and clears its own stale session before restoration.

## Verification

Run `pnpm.cmd --filter frontend test:rbac` and build the public, Portal and Backoffice apps. Check all six roles with remember-me enabled and disabled, logout return to the public origin, failed API calls and delayed responses. Run backend tests against the test `.csproj`; SQL integration tests require `TEKY_MIGRATION_TEST_CONNECTION` and use disposable databases.
