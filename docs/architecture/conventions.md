# Quy ước phát triển

Áp dụng cùng [kiến trúc hiện tại](README.md). Cập nhật code và tài liệu trong cùng thay đổi khi di chuyển file, thêm nhóm nghiệp vụ hoặc thay đổi luồng xác thực.

## Backend

1. Chọn tầng theo trách nhiệm: entity/enum/constant ở Domain; DTO/interface/validator ở Application; triển khai EF/SQL/security/email và service ở Infrastructure; HTTP và cấu hình host ở Api.
2. Chọn nhóm nghiệp vụ sau khi chọn tầng: `Auth`, `Admin`, `Portal`, `Backoffice`. Chỉ tạo nhóm ở tầng có code thực tế. Hợp đồng persistence/security dùng chung có thể ở gốc `Application/Interfaces`; không đẩy hợp đồng nghiệp vụ vào đây.
3. Namespace phải khớp đường dẫn từ project. Ví dụ `Controllers/Portal/StudentClassesController.cs` dùng `TekyLearningHub.Api.Controllers.Portal`; implementation tương ứng dùng `TekyLearningHub.Infrastructure.Services.Portal`.
4. Mỗi controller có file cùng tên, đúng nhóm nghiệp vụ. Không gộp controller kích hoạt lời mời vào file controller quản trị, hoặc controller giáo viên vào file controller học sinh. DTO nhỏ liên quan trong cùng tính năng có thể cùng file.
5. Khi chuyển một tính năng, kiểm tra controller, DTO, interface, validator, service, `using`, tên type đầy đủ, DI và test. Đăng ký service có DbContext theo scoped trong `Infrastructure/DependencyInjection.cs`; không đăng ký lặp ở mỗi controller.
6. HTTP route là hợp đồng với frontend. Giữ route tường minh và kiểm tra `[Authorize]`, rate limit, permission, scope và ownership sau khi di chuyển; namespace/thư mục không tự phân quyền.
7. Thêm nghiệp vụ có truy cập dữ liệu vào service phù hợp và hợp đồng Application khi cần tái sử dụng. Không mở rộng việc controller tự xử lý persistence; các endpoint Account/ShellTransfer còn truy cập DbContext trực tiếp được ghi rõ trong tài liệu kiến trúc hiện tại.
8. Không thêm tham chiếu ngược từ Application/Domain tới Api/Infrastructure. Thay đổi context được scaffold phải đồng bộ với mapping EF và SQL migration; không tự scaffold đè toàn bộ model chỉ để sắp thư mục.
9. Role/scope lấy từ tài khoản và grant còn hiệu lực. Quyền không dựa trên thứ tự số role. Dùng normalizer và kiểm tra permission/session hiện có; không tạo bảng ánh xạ role riêng trong từng tính năng.
10. Thêm migration mới khi đổi schema, không sửa SQL migration đã áp dụng. Giữ audit, transaction, concurrency và điều kiện phân quyền trong service khi tách code.

## Frontend và xác thực

- Trang theo vai trò nằm trong app sở hữu giao diện; code dùng chung ở `frontend/shared`. Ứng dụng công khai tại `5173` không render dashboard.
- Origin lấy từ `shared/auth/shellConfig.ts` và `VITE_PUBLIC_ORIGIN`, `VITE_PORTAL_ORIGIN`, `VITE_BACKOFFICE_ORIGIN`. Không hardcode cổng trong callback của từng role.
- Tất cả hành động đăng xuất, kể cả sau đổi mật khẩu, gọi `AuthProvider.logout()`. Luồng điều hướng nằm ở `shared/auth/logout.ts`; không thêm `navigate('/login')` hoặc `location.assign('/login')` sau `await logout()` vì có thể giữ người dùng ở sai cổng.
- API client chỉ thực hiện API và quản lý dữ liệu phiên; AuthProvider phối hợp state và luồng đăng xuất dùng chung. Xóa session trước khi chờ request; session cũ ở origin công khai được xóa trước khi restore khi nhận dấu đăng xuất.
- Dùng mã một lần và PKCE khi chuyển origin; không đặt access/refresh token trong URL. Verify identity/role bằng API, giữ lựa chọn ghi nhớ đăng nhập và ngăn response refresh/logout cũ ghi đè phiên mới.
- Khi sửa xác thực, kiểm tra cả 6 role, cả localStorage/sessionStorage, chuyển cổng, API lỗi và response chậm. Thay đổi role phải đồng bộ enum, normalizer, claims, DTO và shell mapping.

## Kiểm tra trước khi hoàn tất

Chạy từ gốc repository; PowerShell có thể dùng `pnpm.cmd` nếu execution policy chặn `pnpm.ps1`.

```powershell
dotnet build backend/TekyLearningHub.sln
dotnet test backend/tests/TekyLearningHub.Application.Tests/TekyLearningHub.Application.Tests.csproj
pnpm.cmd --filter frontend test:rbac
pnpm.cmd --filter frontend --filter @teky/portal --filter @teky/backoffice build
git diff --check
```

Nếu API đang chạy và khóa DLL trong `bin/Debug`, có thể kiểm tra backend bằng output riêng mà không dừng server:

```powershell
dotnet test backend/tests/TekyLearningHub.Application.Tests/TekyLearningHub.Application.Tests.csproj --no-restore -p:BaseOutputPath=bin/Verification/
```

Các test SQL Server chỉ chạy khi có `TEKY_MIGRATION_TEST_CONNECTION` trỏ đến SQL Server phát triển có quyền tạo/xóa database test. Báo rõ test bị skip khi chưa cấu hình; không báo test integration đã chạy chỉ dựa vào build thành công.

Tài liệu chuẩn trong `docs/architecture` được theo dõi bằng Git. Ghi chú nghiên cứu/sinh tự động khác trong `docs` vẫn theo `.gitignore`. Các rule theo phạm vi nằm trong `.cursor/rules`; phải đồng bộ với tài liệu này.
