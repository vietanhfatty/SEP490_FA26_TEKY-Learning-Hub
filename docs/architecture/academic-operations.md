# Academic Manager

Academic Manager vận hành chương trình và các lớp cụ thể từ cùng một Backoffice.
Quyền `course.manage` điều khiển biên soạn khóa học. Quyền `academic.manage`
điều khiển duyệt và tổ chức đào tạo. Cả hai theo scope của grant đang có hiệu lực.

## Các nhóm chức năng

| Mục | Dữ liệu và thao tác |
| --- | --- |
| Course & Curriculum | Danh mục, metadata, học phí, mục tiêu đầu ra, bài học và liên kết tài liệu/video |
| Course Approval | Gửi duyệt, xem chương trình, duyệt, từ chối, yêu cầu sửa, xuất bản, ẩn, lưu trữ |
| Class Management | Tạo lớp, sửa khóa học trước khi có dữ liệu vận hành, sĩ số, học sinh, chuyển lớp, đóng/kết thúc/hủy |
| Teacher Management | Danh sách, chuyên môn, khung giờ có thể dạy, số lớp và giờ dạy, phân công và đổi giảng viên |
| Timetable Management | Lịch tuần/tháng, tạo/đổi/hủy buổi, xếp phòng, kiểm tra khoảng giờ trùng |
| Registration Management | Danh sách yêu cầu Parent, hồ sơ học sinh, chọn lớp, duyệt/từ chối và yêu cầu bổ sung |
| Academic Operations | Học bù, số liệu tổ chức lớp, thay đổi lịch, thiết bị STEM và giá trị còn lại |

## Khóa học và kiểm duyệt

Khóa học định nghĩa mục tiêu, chương trình, học phí và nội dung dùng chung.
Lớp học gắn khóa học với giáo viên, học sinh, phòng và các buổi học theo ngày.
Hai đối tượng giữ mã định danh riêng.

`Courses.Status` giữ trạng thái danh mục hiện có. `CourseApprovals.ReviewStatus`
theo dõi Draft → Pending → Approved, hoặc Rejected/Revision. Xuất bản chỉ được
thực hiện sau khi duyệt. Gửi/duyệt yêu cầu mục tiêu đầu ra và ít nhất một bài học.
Sửa nội dung của chương trình đã duyệt qua quy trình mới sẽ đưa về Revision và ẩn
khỏi danh mục để duyệt lại. Các khóa Published/Active từ dữ liệu cũ được tiếp nhận
với trạng thái Approved để tương thích dữ liệu hiện hữu.

Lưu trữ khóa học giữ bài học và lịch sử học sinh. Xóa bài học là soft delete qua
chức năng biên soạn đã có. Tài liệu và video được quản lý dưới dạng liên kết.

## Đăng ký, thanh toán và ghi danh

Parent có thể gửi yêu cầu xếp lớp để Academic Manager xem hồ sơ, chỗ trống và học
phí. Chấp nhận yêu cầu ghi nhận Accepted. Ghi danh được tạo khi khóa miễn phí hoặc
đã có payment Paid cho học sinh và khóa học đó. RequestInfo giữ Pending và gửi
nhận xét cho Parent. Parent xem nhận xét trong danh sách yêu cầu của mình.

Luồng mua QR đã triển khai tự tạo enrollment khi backend đối soát thành công.
Các lớp đang mở là lựa chọn đã được học vụ tổ chức. Quyết định học thuật gần nhất từ chối hoặc yêu cầu bổ sung sẽ chặn việc tạo đơn QR mới cho đến khi được xét duyệt lại. Yêu cầu cùng lớp được cập nhật
Accepted khi thanh toán thành công. Academic Manager dùng chuyển lớp để đổi một
ghi danh đã hiệu lực và ghi nhận lịch sử điều phối.

Sĩ số tính cả enrollment Active và các chỗ đang giữ cho đơn QR. Đổi lớp chỉ thực
hiện trong cùng khóa học và giữ tiến độ cũ. Việc chuyển, kiểm tra lịch và ghi danh
được commit trong một transaction.

## Lịch và tài nguyên

Khoảng giờ được coi là trùng nếu startA < endB và startB < endA trong cùng ngày.
Kiểm tra lớp, giáo viên, phòng, học sinh, đơn QR giữ chỗ và buổi học bù đã xếp.
Hai buổi liên tiếp có giờ kết thúc/bắt đầu bằng nhau được phép.

Giảng viên đã khai báo availability chỉ được xếp trong các khoảng này. Chưa khai
báo được hiển thị rõ để người điều phối kiểm tra. Phòng phải Active và đủ sức chứa
cho sĩ số tối đa của lớp. Dữ liệu phiên bản ngăn ghi đè thay đổi mới hơn.

Khóa giao dịch `Teky.AcademicOperations` cùng khóa lớp của checkout điều phối việc
đổi lịch, ghi danh và giữ chỗ. Payment settlement và enrollment cùng transaction.

Phòng và thiết bị có phòng ban quản lý. Manager được tạo/cập nhật tài nguyên
thuộc phòng ban trong scope, đồng thời xem phòng dùng chung để phân công.
Tài nguyên có DepartmentId rỗng dùng grant GLOBAL để chỉnh sửa. Khung giờ giảng
dạy dùng chung theo giáo viên được cập nhật bằng grant GLOBAL.

Closed đóng tiếp nhận học sinh. Completed yêu cầu hoàn tất/hủy các buổi còn lịch
và chuyển enrollment Active sang Completed. Cancelled cần lý do, hủy các buổi còn
lịch, dừng ghi danh và tạo yêu cầu hoàn học phí cho payment QR Paid của lớp.
Lớp có đơn QR đang đối soát phải xử lý đơn trước khi hoàn tất/hủy. Yêu cầu hoàn
tiền đi qua Payment Management.

Học bù được duyệt vào buổi tương lai cùng khóa học/bài học, đủ chỗ và không trùng
lịch học sinh. Bảng MakeupSessionAssignments lưu người học và buổi được xếp. Student xem danh sách học bù trong My Classes và mở đúng buổi đã được duyệt, kể cả khi buổi đó thuộc lớp khác.

Thiết bị ghi nhận từng tài sản với mã riêng, phòng được phân bổ, trạng thái,
nguyên giá và thời gian sử dụng. BookValueVnd là ước tính đường thẳng theo tháng
để demo vận hành.

## Chạy demo

Khởi động API trong Development để áp dụng `20261126_academic_operations.sql`.
Startup seed khóa `DEMO-AM-STEM`, lớp `DEMO-AM-01` và `DEMO-AM-02`, bài học,
yêu cầu Parent và học bù. Chạy lại startup giữ các thao tác đã thực hiện.

Đăng nhập ở cổng 5173 bằng `manager@teky.edu.vn` với mật khẩu demo hiện có.
Backoffice được mở ở origin cấu hình cho role. Tài khoản demo mặc định có scope
phòng chuyên môn và quản lý các lớp demo thuộc phòng này. Grant GLOBAL được quản
trị bằng luồng cấp quyền sẵn có.

## Kiểm tra

`AcademicOperationsTests` dùng database SQL Server tạm. Các tình huống trọng tâm
gồm quyền truy cập, vòng đời duyệt, sửa chương trình sau duyệt, lịch trùng giáo viên,
phòng và học sinh, sĩ số, rollback ghi danh thất bại, chuyển lớp và duyệt đăng ký.
Chạy cùng các bài kiểm tra migration, layer boundary, account access và checkout.
