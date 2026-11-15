# Quản trị tài khoản

Trong backoffice, đăng nhập SystemAdmin và chọn **Users**. Trang quản trị dùng dữ liệu API thật, có tìm kiếm, lọc, phân trang và chi tiết quyền.

Chức năng: tạo tài khoản và mời đặt mật khẩu; cấp/thu hồi role theo GLOBAL hoặc DEPARTMENT; đổi role mặc định; khóa/mở khóa; bổ nhiệm/kết thúc chức danh trong phòng; quản lý danh mục phòng/chức danh; xem audit.

Tài khoản mới có Status=Pending và ActivationPending=1. Khóa quản trị dùng Status=Locked và thu hồi lời mời còn hiệu lực. Mở khóa tài khoản chưa kích hoạt trả về Pending; cần gửi lại lời mời. Link kích hoạt có hạn 24 giờ, gửi lại cách nhau 60 giây. Token chỉ lưu hash; email chứa link được mã hóa trong outbox. Không trả token qua API quản trị.

Quyền quản trị cần identity.manage ở scope GLOBAL và tài khoản Active. Role không tạo quan hệ kế thừa; position không tự cấp quyền. Role/khóa thay đổi làm tăng SecurityVersion và vô hiệu session. Mutations yêu cầu version hiện tại; dữ liệu cũ trả 409. Không được tự khóa/tự thu hồi SystemAdmin; mọi mutation giữ ít nhất một SystemAdmin Active. App lock trong transaction tuần tự hóa thay đổi quản trị và tiêu thụ lời mời.

## Cấu hình

- Account:InvitationBaseUrl: origin frontend nơi mở link (Development mặc định http://localhost:3001). Production cần cấu hình đúng domain HTTPS.
- Smtp:Host, Port, EnableSsl, Username, Password, From: theo dịch vụ email. Chưa có SMTP thì email nằm trong queue; UI không khẳng định đã gửi.
- Migration mới: database/migrations/20261116_account_administration.sql. Dùng runner migrate-only hiện có; không chạy seed SQL cũ. Đã áp dụng trên database Development ngày 2026-11-15.

## Xác minh

73 backend tests pass, gồm hai SQL integration tests mới cho tạo/kích hoạt, token dùng một lần, chuẩn hóa email, duplicate, permission, cập nhật version cũ và vô hiệu session. Build backoffice, portal, frontend gốc và shared typecheck thành công. Frontend gốc có cảnh báo bundle >500 kB.

Chưa kiểm chứng giao email qua SMTP thực tế hoặc thao tác trực tiếp bằng trình duyệt. Cần khởi động lại backend/frontend đang chạy để dùng code mới. Số liệu overview cũ vẫn là dữ liệu minh họa có nhãn; tab Users dùng dữ liệu thật.
