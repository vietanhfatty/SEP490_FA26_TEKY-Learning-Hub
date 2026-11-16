# Kiến trúc TEKY Learning Hub

Cập nhật: 2026-11-16. Tài liệu này mô tả source đang triển khai; khi đổi vị trí file hoặc ranh giới nghiệp vụ, cập nhật cùng thay đổi code.

## Backend

Backend dùng .NET 9, ASP.NET Core, EF Core và SQL Server, gồm bốn project:

- `TekyLearningHub.Domain`: entity, enum, constant và context được scaffold từ database.
- `TekyLearningHub.Application`: DTO, hợp đồng service, hợp đồng truy cập dữ liệu/bảo mật và validator.
- `TekyLearningHub.Infrastructure`: triển khai service, persistence, security, email và SQL migration.
- `TekyLearningHub.Api`: HTTP controller, xác thực/phân quyền, ánh xạ response và cấu hình ứng dụng.

Tham chiếu project hiện tại: Application tham chiếu Domain; Infrastructure tham chiếu Application và Domain; Api tham chiếu Application và Infrastructure. DI được đăng ký qua `AddApplication()` và `AddInfrastructure()` trong `Program.cs`.

Đây là kiến trúc phân lớp hiện tại. `Domain/Entities/TekyLearningHubContext.cs` còn là EF context được scaffold; `Infrastructure/Data/ApplicationDbContext.cs` mở rộng mapping của context này. `AccountController` và `ShellTransferController` hiện còn dùng DbContext trực tiếp cho hồ sơ, khôi phục mật khẩu và chuyển phiên. Các điểm này chưa tách hoàn toàn theo Clean Architecture; việc nhóm lại thư mục không thay đổi ranh giới phụ thuộc đó.

### Các nhóm nghiệp vụ

- `Auth`: đăng nhập, đăng xuất, refresh token, hồ sơ/bảo mật tài khoản dùng chung cho mọi role, kích hoạt lời mời và chuyển phiên giữa các ứng dụng.
- `Admin`: quản lý tài khoản, role/scope, phòng ban, chức danh, bổ nhiệm, khóa học và học liệu.
- `Portal`: lớp học, bài học và nộp dự án của học sinh. Chỉ thêm phần phụ huynh khi có nghiệp vụ thực tế.
- `Backoffice`: nghiệp vụ giáo viên/nhân sự ngoài quản trị hệ thống; hiện có duyệt dự án của giáo viên.

Tên thư mục thể hiện nơi sở hữu nghiệp vụ. Quyền truy cập vẫn do `[Authorize]`, permission, scope và kiểm tra dữ liệu ở backend quyết định. Ví dụ `Auth/AccountController` phục vụ hồ sơ mọi role, còn `Backoffice/ProjectReviewsController` chỉ cho giáo viên được phân công.

### Vị trí source

```text
backend/
  src/
    TekyLearningHub.Api/
      Controllers/
        Admin/       AdminCoursesController, AdminUsersController
        Auth/        AuthController, AccountController,
                     InvitationController, ShellTransferController
        Portal/      StudentClassesController, StudentLearningController,
                     StudentProjectsController
        Backoffice/  ProjectReviewsController
      Program.cs
    TekyLearningHub.Application/
      DTOs/
        Admin/       CourseDtos, UserAdministrationRequests
        Auth/        Login, refresh, logout, account, invitation và user DTO
        Portal/      StudentClassesDto, StudentProjectDto
        Common/      ApiResponse
      Interfaces/
        Admin/       ICourseService
        Auth/        IAuthService
        Portal/      IStudentClassesService
        IApplicationDbContext.cs
        IJwtTokenGenerator.cs
        IPasswordHasher.cs
      Validators/Auth/LoginRequestValidator.cs
      DependencyInjection.cs
    TekyLearningHub.Infrastructure/
      Services/
        Admin/       CourseService, UserAdministrationService
        Auth/        AuthService, AccountEmailWorker
        Portal/      StudentClassesService, StudentLearningService
        Backoffice/  ProjectReviewService
      Data/          ApplicationDbContext, DbInitializer, Migrations/
      Security/      JWT, password hashing, role/permission/session checks
      DependencyInjection.cs
    TekyLearningHub.Domain/
      Entities/
      Enums/
      Constants/
  tests/TekyLearningHub.Application.Tests/
database/
  migrations/
```

`InvitationController` có file riêng trong Auth và dùng luồng kích hoạt của `UserAdministrationService`. `AcceptInvitationRequest` ở `DTOs/Auth`; các request quản trị nằm ở `DTOs/Admin`. Service quản trị tái sử dụng `Auth/AccountEmailWorker` để enqueue email.

`StudentLearningService` chỉ xử lý việc học của học sinh. `ProjectReviewService` sở hữu truy vấn và đánh giá bài nộp của giáo viên; được đăng ký scoped riêng. Các HTTP route và điều kiện phân quyền được giữ nguyên khi chuyển thư mục.

Các interface dùng chung cho persistence và security được giữ ở gốc `Application/Interfaces`. Không tạo thư mục nghiệp vụ trống để dự đoán tính năng chưa có.

`Application/Services` trước đây chỉ có `.gitkeep` và đã được bỏ. Implementation hiện tại dùng EF/SQL nên nằm trong `Infrastructure/Services`; Application giữ hợp đồng, DTO và validator. Các placeholder không dùng cho repository, middleware và Domain/Common cũng đã được bỏ khỏi Git.

`Application/Services` trước đây chỉ có `.gitkeep` và đã được bỏ. Implementation hiện tại dùng EF/SQL nên nằm trong `Infrastructure/Services`; Application giữ hợp đồng, DTO và validator. Các placeholder không dùng cho repository, middleware và Domain/Common cũng đã được bỏ khỏi Git.

## Frontend và phiên đăng nhập

Frontend dùng pnpm workspace, React, TypeScript và Vite:

- `frontend/`: ứng dụng công khai tại `5173`, gồm trang chủ, khóa học, đăng nhập và khôi phục mật khẩu.
- `frontend/portal/`: ứng dụng tại `3000`, gồm Student (`/student`) và Parent (`/parent`).
- `frontend/backoffice/`: ứng dụng tại `3001`, gồm Teacher (`/teacher`), AcademicStaff (`/staff`), AcademicManager (`/academic-manager`) và SystemAdmin (`/admin`).
- `frontend/shared/`: xác thực, API client, UI và nghiệp vụ dùng lại giữa các ứng dụng.

`shared/auth/shellConfig.ts` định nghĩa origin và ánh xạ role sang ứng dụng. ID role lấy theo `Domain/Enums/UserRole.cs`; frontend dùng tên chuẩn `student`, `teacher`, `system_admin`, `parent`, `academic_staff`, `academic_manager`. Quyền được xác minh qua `/api/auth/me`, không tin role lưu trong browser.

Đăng nhập từ cổng công khai chuyển phiên bằng mã một lần và PKCE. Khi đăng xuất, tất cả role gọi `AuthProvider.logout()`; `shared/auth/logout.ts` thu hồi/xóa phiên ở cổng hiện tại và chuyển về `${PUBLIC_ORIGIN}/login?loggedOut=1`. Trước khi AuthProvider khôi phục phiên, trang công khai xóa session cũ của chính origin đó và gỡ dấu đăng xuất khỏi URL. HTTP lỗi hoặc mất kết nối không ngăn việc kết thúc phiên cục bộ; response đăng xuất chậm không được ngắt một phiên đăng nhập mới.

## Database và kiểm thử

SQL migration nằm trong `database/migrations`, được nhúng trong Infrastructure. Development chạy migration còn thiếu trước khi phục vụ HTTP; Production/Staging không tự migrate hoặc seed. Xem [quy ước migration](../../database/migrations/README.txt).

Kiểm thử backend nằm trong `backend/tests/TekyLearningHub.Application.Tests`. Các test SQL Server dùng database tạm và yêu cầu `TEKY_MIGRATION_TEST_CONNECTION`; khi thiếu biến này, test integration được đánh dấu skip. Chạy trực tiếp file `.csproj` của test vì solution hiện chỉ chứa bốn project source.

Lệnh kiểm tra và nguyên tắc thay đổi code: [quy ước phát triển](conventions.md). Hướng dẫn cổng và cấu hình môi trường: [frontend](../../frontend/README.md).
