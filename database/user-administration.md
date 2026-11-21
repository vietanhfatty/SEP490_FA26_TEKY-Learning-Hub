# Quản trị tài khoản

Trong backoffice, đăng nhập SystemAdmin và chọn **Users**. Trang quản trị dùng dữ liệu API thật, có tìm kiếm, lọc, phân trang và chi tiết quyền.

Chức năng: tạo tài khoản và mời đặt mật khẩu; tạo hàng loạt nhân sự bằng danh sách email hoặc file Excel; cấp/thu hồi role theo GLOBAL hoặc DEPARTMENT; đổi role mặc định; khóa/mở khóa; bổ nhiệm/kết thúc chức danh trong phòng; quản lý danh mục phòng/chức danh; xem audit.

Tài khoản mới có Status=Pending và ActivationPending=1. Khóa quản trị dùng Status=Locked và thu hồi lời mời còn hiệu lực. Mở khóa tài khoản chưa kích hoạt trả về Pending; cần gửi lại lời mời. Link kích hoạt có hạn 24 giờ, gửi lại cách nhau 60 giây. Token chỉ lưu hash; email chứa link được mã hóa trong outbox. Không trả token qua API quản trị.

Quyền quản trị cần identity.manage ở scope GLOBAL và tài khoản Active. Role không tạo quan hệ kế thừa. Chức danh cấp bộ quyền tùy chỉnh khi có bổ nhiệm gắn với cấu hình đã công bố; grant vẫn mang role hệ thống để nhận diện giao diện. Role/khóa thay đổi làm tăng SecurityVersion và vô hiệu session. Mutations yêu cầu version hiện tại; dữ liệu cũ trả 409. Không được tự khóa/tự thu hồi SystemAdmin; mọi mutation giữ ít nhất một SystemAdmin Active. App lock trong transaction tuần tự hóa thay đổi quản trị và tiêu thụ lời mời.

## Danh mục và tạo hàng loạt

`GET /api/admin/directory` trả phòng ban, chức danh, số bổ nhiệm đang hiệu lực, khả năng xóa cùng lý do chặn và danh sách permission có thể chọn. Chức danh lưu cấu hình role hệ thống, permission và loại hình làm việc theo phiên bản; thay đổi cấu hình đã công bố cần xem trước ảnh hưởng. `DELETE /api/admin/directory/{kind}/{id}` chỉ xóa khi không còn tham chiếu, nếu không trả 409 và cần ngừng sử dụng mục đó.

`POST /api/admin/users/bulk` nhận tối đa 200 dòng `email, Họ tên` cho một phòng ban và chức danh đang hoạt động có policy đã công bố. Mỗi dòng hợp lệ tạo tài khoản Pending, bổ nhiệm, grant theo policy và lời mời trong outbox; kết quả trả trạng thái từng dòng để xử lý email trùng hoặc sai. `POST /api/admin/users/bulk-preview` đọc file Excel để xem trước; `GET /api/admin/users/bulk-template` tải mẫu `.xlsx`. Tài khoản chỉ có hiệu lực sau khi nhận lời mời và kích hoạt.

## Cấu hình

- Account:InvitationBaseUrl: origin frontend nơi mở link (Development mặc định http://localhost:3001). Production cần cấu hình đúng domain HTTPS.
- Smtp:Host, Port, EnableSsl, Username, Password, From: theo dịch vụ email. Chưa có SMTP thì email nằm trong queue; UI không khẳng định đã gửi.
- Các migration quản trị tài khoản và quyền chức danh: `20261116_account_administration.sql`, `20261126_position_authorization.sql`, `20261127_job_title_permissions.sql`, `20261128_pending_activation_permission_guard.sql`. Dùng runner migrate-only hiện có; không chạy seed SQL cũ. Migration 20261127 backfill quyền từ role cho các policy đã có.

## Xác minh

Ngày 2026-11-18: 123/123 backend tests pass khi chạy tuần tự trên SQL Server local; 8 test chuyên biệt xác minh quyền theo chức danh, backfill, xóa danh mục, tạo hàng loạt và payload action directory. Build backend Release, backoffice, portal, frontend gốc và shared typecheck thành công. Journal database Development đã có migration 20261126-20261128. Backoffice có cảnh báo bundle >500 kB.

Chưa kiểm chứng giao email qua SMTP thực tế. Cần khởi động lại backend đang chạy để dùng code mới. Số liệu overview cũ vẫn là dữ liệu minh họa có nhãn; tab Users dùng dữ liệu thật.
