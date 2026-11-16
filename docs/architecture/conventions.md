# Quy ước phát triển

Áp dụng cùng [kiến trúc hiện tại](README.md). Khi đổi cấu trúc/dependency phải cập nhật code, test, tài liệu và rule trong cùng thay đổi.

## Backend

1. Domain chỉ chứa model và chính sách thuần. Application thực thi nghiệp vụ và định nghĩa cổng. Infrastructure triển khai persistence/tích hợp. API xử lý HTTP và composition root.
2. Service nghiệp vụ nằm trong `Application/Services/{Auth,Admin,Portal,Backoffice}`. Chỉ service kỹ thuật như outbox/SMTP được ở Infrastructure. Không tạo service Application chỉ để đổi tên một lời gọi nghiệp vụ sang Infrastructure.
3. Interface use case/repository nằm trong Application, implementation repository nằm trong Infrastructure/Repositories. Dùng thao tác theo nghiệp vụ; không dùng generic repository hoặc trả DbSet/IQueryable để Application tiếp tục viết truy vấn EF.
4. Namespace khớp thư mục. Mỗi controller có file đúng tên và đúng nhóm nghiệp vụ. DTO có kiểu rõ ràng tại ranh giới tầng; không dùng anonymous object hoặc `Task<object>` làm hợp đồng service/repository. Anonymous payload nội bộ cho audit và ánh xạ HTTP vẫn được phép.
5. Không đưa EF, SQL client, SMTP, Data Protection, IConfiguration hoặc ASP.NET type vào Domain/Application. Cấu hình Application nhận bằng lớp options thuần. Adapter nhận cấu hình và đăng ký options tại Infrastructure.
6. Controller chỉ inject interface Application và dịch vụ HTTP/logging; không inject repository, DbContext, worker hoặc concrete service Infrastructure. Infrastructure chỉ được dùng tại phần cấu hình host/DI.
7. `AddApplication` đăng ký use case; `AddInfrastructure` đăng ký adapter. DbContext, repository, outbox và unit of work cùng scoped; ticket store và avatar adapter không giữ trạng thái request.
8. Không làm mất transaction/lock khi tách repository: quản trị quyền phải giữ kiểm tra quyền, version, admin cuối cùng và audit trong cùng transaction; nộp lại bài giữ Serializable; duyệt bài giữ điều kiện phiên bản và ownership trong cập nhật nguyên tử.
9. Repository chuyển lỗi EF/SQL thành lỗi persistence trung lập. Application ánh xạ sang lỗi nghiệp vụ; API giữ nguyên mã lỗi/JSON. Cancellation phải được truyền tiếp; không biến hủy request thành lỗi nghiệp vụ.
10. Email được enqueue cùng dữ liệu nghiệp vụ, gửi SMTP ngoài transaction/retry. File và ticket truy cập qua cổng; giữ kiểm tra định dạng, giới hạn dung lượng, origin, TTL và chống replay.
11. ID role theo enum Domain; dùng normalizer/policy dùng chung. Role/scope dựa trên grant còn hiệu lực, không suy quyền từ thứ tự ID.
12. Schema thay đổi bằng migration mới. Không sửa migration đã áp dụng, scaffold lại entity hoặc thay mapping khi chỉ refactor tầng.

## Frontend và xác thực

- Các app tiếp tục dùng `frontend/shared/auth`. Origin lấy từ shellConfig và các biến VITE tương ứng.
- Mọi role và luồng đổi mật khẩu gọi `AuthProvider.logout()`. Luồng dùng chung xóa phiên và chuyển toàn trang về PUBLIC_ORIGIN; không bổ sung relative navigation sau logout.
- Chuyển origin bằng mã một lần và PKCE; token không được xuất hiện trong URL. Xác minh vai trò qua API, giữ remember-me và ngăn response cũ khôi phục/ghi đè phiên mới.
- Trang công khai xử lý dấu đăng xuất trước khi khôi phục session. Kiểm tra sáu role, hai chế độ storage, API lỗi và response chậm khi sửa auth.

## Kiểm tra

Chạy tại gốc repository:

```powershell
dotnet build backend/TekyLearningHub.sln
dotnet test backend/tests/TekyLearningHub.Application.Tests/TekyLearningHub.Application.Tests.csproj
pnpm.cmd --filter frontend test:rbac
pnpm.cmd --filter frontend --filter @teky/portal --filter @teky/backoffice build
git diff --check
```

Solution hiện chỉ chứa bốn project source, vì vậy phải chạy test `.csproj` trực tiếp. `LayerBoundaryTests` kiểm tra dependency tầng, cổng persistence, DI/controller và use case chạy bằng repository giả.

Khi API đang khóa DLL mặc định, thêm `-p:BaseOutputPath=bin/LayerVerification/` vào lệnh test/build. SQL integration test cần `TEKY_MIGRATION_TEST_CONNECTION`, tạo/xóa database tạm có tên `Teky_MigrationTests_*`; không dùng database ứng dụng làm database test. Báo rõ test skip hoặc timeout và kết quả chạy lại.

Tài liệu chuẩn trong `docs/architecture` được theo dõi bằng Git; ghi chú nghiên cứu khác tuân theo `.gitignore`. Rule phạm vi backend nằm trong `.cursor/rules/backend-architecture.mdc`.
