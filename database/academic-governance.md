# Phân quyền và quy trình nội dung

Áp dụng cho SQL Server của LMS TEKY. [ERD từ schema thực tế](academic-governance-erd.md).

## Mô hình role mới

| ID | Role trong database | Role trong JWT/frontend |
|---|---|---|
| 1 | Student | student |
| 2 | Teacher | teacher |
| 3 | SystemAdmin | system_admin |
| 4 | Parent | parent |
| 5 | AcademicStaff | academic_staff |
| 6 | AcademicManager | academic_manager |

Users.PrimaryRoleId chỉ là role mặc định để chọn giao diện; tài khoản phải có grant còn hiệu lực cho role đó để đăng nhập. UserRoles quản lý nhiều role và scope GLOBAL/DEPARTMENT. JWT phát đầy đủ role; mỗi request xác thực lại role và trạng thái tài khoản từ database. Permission và scope luôn được kiểm tra trực tiếp khi xử lý nghiệp vụ, không chỉ dựa vào role trên JWT.

StaffAppointments lưu chức danh và thành viên phòng theo thời gian. Không dùng position để tự động cấp quyền. Phân công EDITOR/COMMENTER đặt trong ContentAssignments; danh sách APPROVER nằm trong ApprovalParticipants của từng vòng.

## Ràng buộc database

- UserRoles: không trùng grant đang có hiệu lực theo user/role/scope; SystemAdmin chỉ có scope GLOBAL.
- ContentVersions: UNIQUE(ContentId,VersionNo); tối đa một DRAFT mỗi nội dung; FROZEN không được sửa/xóa. RowVersion hỗ trợ chống ghi đè khi nhiều người sửa.
- Contents: FK ghép bảo đảm candidate/published thuộc đúng nội dung. CourseId/LessonId/MaterialId là FK thực, có unique filtered index và CHECK loại nội dung; không dùng khóa ngoại đa hình không được kiểm soát.
- ContentAssignments: tối đa một phân công đang có hiệu lực theo content/user/type.
- ContentComments: trả lời chỉ tham chiếu bình luận trong cùng phiên bản.
- ApprovalParticipants và ApprovalDecisions: PK ghép (RoundId,UserId); decision có FK ghép tới participant.
- Mở vòng phải có danh sách đầy đủ thành viên phòng tại OpenedAt; không tự bỏ tài khoản đang khóa. Danh sách cố định sau khi OPEN. Không có thành viên thì không mở được vòng.
- APPROVED cần tất cả người bắt buộc đồng ý. Không phản hồi không được tính đồng ý. Phiếu append-only; sửa nội dung sau khi gửi duyệt phải tạo phiên bản và vòng mới.
- ContentPublications có FK ghép tới đúng content/version/round, UNIQUE RoundId, append-only. Công bố phải có quyền content.publish, vòng APPROVED và phiên bản vẫn là candidate.
- AuditLogs dùng lại bảng hiện có, append-only. EntityType/EntityId là tham chiếu nhật ký đa hình, không phải FK.

## Stored procedures

ActorId phải lấy từ phiên đăng nhập đã xác thực ở backend, không tin giá trị do client gửi.

- OpenContentApproval @ContentId,@ActorId: khóa candidate, chụp danh sách thành viên cùng tên/chức danh, mở vòng.
- SubmitContentDecision @RoundId,@ActorId,@Decision,@Comment: ghi một quyết định; REQUEST_CHANGES phải có lý do. Tự kết thúc vòng khi có yêu cầu sửa hoặc đủ mọi phiếu APPROVE.
- PublishAcademicContent @RoundId,@ActorId: kiểm tra quyền và phiên bản, ghi lịch sử, cập nhật published pointer trong cùng transaction.

AcademicPermissionService kiểm tra grant/scope còn hiệu lực; CanEditAsync còn yêu cầu phân công EDITOR và candidate DRAFT. Các chức năng HTTP chỉnh sửa nội dung mới phải dùng kiểm tra này và tham số hóa truy vấn.

## Chuyển đổi database cũ

Migration 20261115_academic_governance.sql giữ nguyên ID role, đổi Admin thành SystemAdmin và Staff thành AcademicStaff theo yêu cầu thay role cũ. Users.RoleId đổi tên thành PrimaryRoleId; membership cũ chuyển sang UserRoles. Grant AcademicStaff/AcademicManager được giới hạn ở phòng ACADEMIC. Tăng SecurityVersion để token cũ không còn hợp lệ. Không xóa tài khoản, mật khẩu, phiên đăng nhập, khóa học hoặc bài học.

Không tự suy đoán chức danh, loại hình làm việc hoặc thành viên phòng: StaffAppointments cần được điền từ danh sách nhân sự thực tế trước khi mở vòng đồng thuận. Có sẵn 11 position và phòng ACADEMIC.

Courses/Lessons/LessonMaterials được giữ nguyên. Nội dung cũ chưa được tự chuyển thành phiên bản đã duyệt vì không có bằng chứng phê duyệt. Cần tạo Contents và bản nháp tương ứng khi đưa vào quy trình mới. Các giao diện nhập position, giao việc và xét duyệt chưa thuộc thay đổi database này. API CRUD khóa học hiện có vẫn là chức năng riêng, không phải API xét duyệt mới.

Sau khi cập nhật code và database, khởi động lại backend và đăng nhập lại. Không chạy lại script tạo/seed database cũ; script đó dùng schema lịch sử.

```powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project backend/src/TekyLearningHub.Api --no-launch-profile -- --migrate-only true
```

Lệnh trên chạy runner/journal/checksum hiện có, không khởi động HTTP server và không seed tài khoản. Khi tạo database mới, runner tự tạo baseline và áp dụng tất cả migration. Khi phát triển schema tiếp, thêm migration mới; không sửa migration đã áp dụng.

```powershell
$env:TEKY_MIGRATION_TEST_CONNECTION='Server=.\SQLEXPRESS;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'
dotnet test backend/tests/TekyLearningHub.Application.Tests/TekyLearningHub.Application.Tests.csproj
python database/tools/export_governance_erd.py
```

Integration tests chỉ tạo/xóa database tạm có tên Teky_MigrationTests_<guid>; không reset database ứng dụng.
