# Kiến trúc TEKY Learning Hub

Cập nhật: 2026-11-16. Backend dùng .NET 9 và được tách theo trách nhiệm của bốn tầng. Nhóm nghiệp vụ trong mỗi tầng là `Auth`, `Admin`, `Portal`, `Backoffice`.

## Trách nhiệm và dependency

- **Domain:** entity, enum, constant và chính sách role/grant thuần. Không tham chiếu Application, Infrastructure, EF Core, SQL Server hoặc ASP.NET Core.
- **Application:** thực thi use case; chứa `Services`, DTO, validator và interface repository/dịch vụ kỹ thuật. Chỉ tham chiếu project Domain; không phụ thuộc EF, SQL, SMTP, filesystem hoặc HTTP framework.
- **Infrastructure:** triển khai các interface Application bằng EF Core, SQL Server, JWT, BCrypt, Data Protection, SMTP, file storage và bộ nhớ. Tham chiếu Application và Domain.
- **Api:** controller tiếp nhận HTTP, lấy danh tính, gọi interface Application và ánh xạ response. Tham chiếu Application; sử dụng Infrastructure tại composition root để đăng ký adapter và khởi tạo host.

Luồng thực thi: controller nhận interface service Application qua DI; service kiểm tra nghiệp vụ và gọi repository/adapter interface; implementation Infrastructure truy cập tài nguyên bên ngoài. Service không phải lớp chuyển tiếp toàn bộ nghiệp vụ sang Infrastructure.

## Vị trí code

```text
backend/src/
  TekyLearningHub.Domain/
    Entities/                   Entity thuần, không có DbContext
    Enums/                      ID role và enum nghiệp vụ
    Constants/                  Trạng thái, loại audit actor
    Security/                   UserAuthorization, RoleNameNormalizer
  TekyLearningHub.Application/
    Services/
      Auth/                     Auth, account, shell transfer, session validation
      Admin/                    UserAdministrationService, CourseService
      Portal/                   StudentClassesService, StudentLearningService
      Backoffice/               ProjectReviewService
    Interfaces/
      Auth/                     Service/repository tài khoản, avatar, chuyển phiên
      Admin/                    Service/repository quản trị và khóa học
      Portal/                   Service/repository học tập và bài nộp
      Backoffice/               Service/repository duyệt bài
      Persistence.cs            Unit of work, transaction, lỗi persistence, email outbox
      IAcademicPermissionReader.cs
      IPasswordHasher.cs
      IJwtTokenGenerator.cs
    DTOs/                       Auth, Admin, Portal, Backoffice, Common
    Validators/Auth/
    Common/                     Lỗi use case dùng chung
    DependencyInjection.cs      AddApplication đăng ký service nghiệp vụ
  TekyLearningHub.Infrastructure/
    Data/                       Hai DbContext, mapping, seed, migration, UnitOfWork
    Repositories/               Auth, Admin, Portal, Backoffice
    Security/                   JWT, BCrypt, claim adapter, permission reader, ticket store
    Storage/                    AvatarStorage
    Services/Auth/              Email outbox và SMTP background worker
    ApplicationStartup.cs       Khởi tạo database Development
    DependencyInjection.cs      AddInfrastructure đăng ký adapter
  TekyLearningHub.Api/
    Controllers/                Auth, Admin, Portal, Backoffice
    Program.cs                  Composition root, xác thực và HTTP pipeline
```

`TekyLearningHubContext` được scaffold và `ApplicationDbContext` cùng nằm trong Infrastructure/Data. Giữ nguyên EF mapping hiện có; entity Domain không bị scaffold lại. Không còn `IApplicationDbContext` trả DbSet ở Application.

## Ranh giới nghiệp vụ và dữ liệu

Application quản lý điều kiện đăng nhập, lockout, role/scope, cấp quyền, lời mời, trạng thái khóa học, điều kiện nộp lại bài và đánh giá. Repository trả entity hoặc DTO đã truy vấn xong; không đưa DbContext, DbSet, IQueryable, SQL exception hay EF transaction ra ngoài Infrastructure.

`IUnitOfWork` giữ transaction trên cùng DbContext scoped với repository. Infrastructure thực hiện retry, isolation và SQL application lock. Transaction quản trị giữ khóa `Teky.UserAdministration`, kiểm tra quyền và admin cuối cùng trong cùng transaction; transaction nộp bài dùng Serializable. Duyệt bài dùng cập nhật có điều kiện để không chấm nhầm phiên bản. Xung đột EF/SQL được chuyển thành lỗi persistence trung lập và ánh xạ ra kết quả nghiệp vụ/HTTP như trước.

Application yêu cầu enqueue email qua outbox; Infrastructure mã hóa và ghi cùng dữ liệu nghiệp vụ, worker gửi SMTP riêng. Avatar được kiểm tra trong Application, đọc/ghi file qua `IAvatarStorage`. Ticket chuyển phiên có kho bộ nhớ singleton, giới hạn dung lượng và thao tác lấy/xóa nguyên tử; thời hạn, origin và PKCE được kiểm tra trong Application.

Controller không còn truy cập database, filesystem hoặc worker. `AccountController` và `ShellTransferController` gọi use case tương ứng. Xác thực JWT trích claim tại API rồi gọi `ISessionValidationService` với dữ liệu danh tính thuần; Application kiểm tra với tài khoản hiện tại. `SessionAuthorization` trong Infrastructure chỉ là adapter claim phục vụ kiểm tra tương thích.

HTTP route, JSON response, mã lỗi, rate limit và điều kiện phân quyền được giữ nguyên. Không thay schema hoặc thêm SQL migration cho lần tách tầng này.

## Frontend và database

Frontend giữ ba ứng dụng: công khai `5173`, Portal `3000` cho Student/Parent, Backoffice `3001` cho bốn role nhân sự. `frontend/shared/auth` quản lý xác thực, PKCE và đăng xuất về `${PUBLIC_ORIGIN}/login`. Xem [hướng dẫn frontend](../../frontend/README.md).

Migration nằm trong `database/migrations`, được nhúng trong Infrastructure. Development khởi tạo qua `ApplicationStartup`; Production/Staging không tự migrate/seed. Xem [quy ước migration](../../database/migrations/README.txt).

Kiểm thử backend gồm test use case bằng repository giả, test dependency/DI và test integration SQL Server. Xem [quy ước phát triển](conventions.md).
