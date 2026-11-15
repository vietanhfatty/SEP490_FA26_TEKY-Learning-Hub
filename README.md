# SEP490_FA26_TEKY-Learning-Hub
An Integrated Learning Management and Online Tutor Platform for TEKY

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
