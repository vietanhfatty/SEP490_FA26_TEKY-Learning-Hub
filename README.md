# SEP490_FA26_TEKY-Learning-Hub
An Integrated Learning Management and Online Tutor Platform for TEKY

## Kiến trúc và quy ước

- [Kiến trúc và cấu trúc source hiện tại](docs/architecture/README.md): bốn project backend, nhóm nghiệp vụ và ba ứng dụng frontend.
- [Quy ước phát triển](docs/architecture/conventions.md): vị trí đặt file, namespace, DI, xác thực, migration và kiểm thử.
- [Chạy frontend](frontend/README.md): cổng công khai `5173`, Portal `3000`, Backoffice `3001`.

Controller, DTO, interface và service được nhóm theo nghiệp vụ `Auth`, `Admin`, `Portal`, `Backoffice`. Service nghiệp vụ nằm trong Application; Infrastructure triển khai repository, EF/SQL và tích hợp ngoài; Domain giữ model/chính sách thuần; API gọi interface Application. Đăng xuất ở mọi role trở về trang đăng nhập công khai tại cổng `5173`.

## Cập nhật database sau khi pull

Backend tự chạy các SQL migration còn thiếu trước khi phục vụ request ở môi trường Development.
Team không cần chạy thủ công từng file SQL hoặc tạo lại database.

```powershell
# Cấu hình SQL Server của từng máy (ví dụ Windows authentication).
$env:ConnectionStrings__DefaultConnection='Server=.\SQLEXPRESS;Database=Teky_Learning_Hub;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'

# Cập nhật database rồi chạy API.
dotnet run --project backend/src/TekyLearningHub.Api --launch-profile http

# Hoặc chỉ cập nhật database, không chạy HTTP server và không seed demo.
dotnet run --project backend/src/TekyLearningHub.Api --launch-profile migrate
```

Migration được đóng gói cùng backend, ghi lịch sử/checksum trong `dbo.__TekySchemaMigrations`,
chỉ chạy một lần và giữ dữ liệu hiện có. Database chưa tồn tại được tạo nếu tài khoản SQL có quyền.
Production/Staging không tự migrate hoặc seed.

Danh sách và quy ước thêm migration: [database/migrations/README.txt](database/migrations/README.txt).
