# TEKY frontend

Chạy từ thư mục gốc repository:

```powershell
pnpm install
pnpm dev
```

Ba ứng dụng có cổng cố định. Vite sẽ báo lỗi nếu cổng đang bận, để tránh chuyển phiên sang nhầm ứng dụng.

- **5173 — Trang công khai:** trang chủ, danh sách khóa học, đăng nhập, khôi phục mật khẩu và nhận lời mời.
- **3000 — Portal:** Học sinh (`/student`) và Phụ huynh (`/parent`).
- **3001 — Backoffice:** Giáo viên (`/teacher`), Chuyên môn (`/staff`), Quản lý học thuật (`/academic-manager`) và Quản trị hệ thống (`/admin`). Trang Phòng ban & chức danh nằm ở `/admin/directory`.

Mở `http://localhost:5173` để bắt đầu. Sau khi đăng nhập, ứng dụng xác thực vai trò với API rồi tự chuyển đến Portal hoặc Backoffice. Cổng 5173 không hiển thị dashboard. Các URL cũ `/dashboard/*` tại cổng này chuyển tiếp sang ứng dụng theo vai trò; liên kết `/dashboard/admin/directory` được chuyển đến `/admin/directory` cho quản trị viên.

Phiên đăng nhập được chuyển bằng mã dùng một lần và PKCE; access token và refresh token không xuất hiện trong URL. Lựa chọn **Ghi nhớ đăng nhập** được giữ khi đổi cổng. API của mỗi ứng dụng được proxy từ `/api` tới `http://localhost:5268`.

Nếu dùng domain hoặc cổng khác, đặt cùng các giá trị `VITE_PUBLIC_ORIGIN`, `VITE_PORTAL_ORIGIN` và `VITE_BACKOFFICE_ORIGIN` trong môi trường chạy/build của cả ba ứng dụng. Khi dùng file `.env.local`, đặt file trong từng thư mục ứng dụng (`frontend/`, `frontend/portal/`, `frontend/backoffice/`). Backend cũng cần `Shells__PortalOrigin`, `Shells__BackofficeOrigin` và cấu hình CORS tương ứng.

Kiểm tra từ thư mục gốc:

```powershell
pnpm --filter frontend --filter @teky/portal --filter @teky/backoffice build
pnpm --filter frontend test:rbac
```
