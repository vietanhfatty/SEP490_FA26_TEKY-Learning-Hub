# Product Context: TEKY Learning Hub

> **Project:** SEP490_FA26_TEKY-Learning-Hub  
> **One-Liner:** An Integrated Learning Management & Online Tutor Platform for TEKY STEAM Academy.  
> **Target Audience:** K-12 Students (ages 7–16), Parents, Tutors/Teachers, Academic Managers, and System Administrators.

---

## 1. Vision & Purpose

TEKY Learning Hub is designed as an end-to-end educational operating system and digital campus for TEKY Academy. It unifies classroom delivery, curriculum management, teacher scheduling, parent transparency, and student motivation into a coherent, high-craft platform:
- **For Students:** An engaging learning space to track curriculum milestones, submit coding/robotics projects, view teacher feedback, and attend live tutoring sessions.
- **For Parents:** Transparent oversight into their children’s learning journey, attendance, teacher evaluations, schedules, and tuition.
- **For Tutors / Teachers:** Effortless classroom orchestration, student attendance tracking, lesson delivery, assignment grading, and performance reporting.
- **For Academic Managers:** Complete command over course catalog, curriculum authoring, class scheduling, tutor allocation, workload balancing, and educational quality surveys.
- **For System Administrators:** Centralized control over user authentication, Role-Based Access Control (RBAC), security audit logs, branch centers, and system health.

---

## 2. Architecture & Screen Breakdown (Mô hình Điều hướng & Phân quyền)

> [!IMPORTANT]
> **Nguyên tắc cốt lõi về phân quyền:**
> - **Homepage & Đăng nhập là màn hình DÙNG CHUNG:** Không chia tách theo role ở tầng công cộng. Khách, học viên, phụ huynh, giáo viên đều truy cập chung 1 Homepage và 1 Cổng đăng nhập Universal Login duy nhất.
> - **CHỈ CÓ DASHBOARD MỚI CHIA THEO ROLE:** Sau khi đăng nhập thành công, hệ thống xác thực danh tính RBAC và tự động điều hướng người dùng vào đúng Bảng điều khiển (Dashboard) của vai trò đó.

### 🏠 1. Homepage (Trang chủ dùng chung)
- **Đối tượng:** Tất cả khách ghé thăm, phụ huynh tìm hiểu khóa học, học sinh chuẩn bị vào học.
- **Mục đích:** Cổng thông tin giới thiệu chung về học viện STEAM TEKY, tra cứu 4 lộ trình đào tạo, showcase dự án tiêu biểu của học viên và nút điều hướng tới Cổng đăng nhập dùng chung.
- **Key Modules:**
  - **Hero Section:** Tagline công nghệ truyền cảm hứng, nút *"Đăng nhập vào hệ thống"* (hoặc *"Vào Bảng điều khiển"* nếu đã đăng nhập) & *"Khám phá chương trình STEAM"*.
  - **STEAM Ecosystem Showcase:** 4 trục đào tạo (Lập trình & App, Robotics & IoT, Thiết kế 3D, AI & Data).
  - **Student Project Spotlight:** Bảng vàng dự án sáng tạo của học viên.
  - **Thống kê niềm tin:** 50.000+ học sinh, 100+ khóa học chuẩn CSTA Hoa Kỳ, 30+ cơ sở toàn quốc.

---

### 🔐 2. Authentication & Account Access (Cổng Đăng nhập dùng chung)
- **Đối tượng:** Cổng đăng nhập duy nhất cho tất cả 5 nhóm đối tượng (Học sinh, Phụ huynh, Giảng viên, Quản lý đào tạo, Quản trị hệ thống).
- **Mục đích:** Xác thực danh tính tập trung, tự động nhận diện Role từ tài khoản đăng nhập để chuyển tiếp vào Bảng điều khiển (Dashboard) tương ứng.
- **Key Features:**
  - **Universal Login Form:** Nhập Email/Username và mật khẩu, hỗ trợ Ghi nhớ đăng nhập và khôi phục mật khẩu OTP.
  - **RBAC Role Auto-Resolution:** Tự động điều hướng sau đăng nhập:
    - Tài khoản Học sinh ➜ **Student Dashboard**
    - Tài khoản Phụ huynh ➜ **Parent Dashboard**
    - Tài khoản Giảng viên ➜ **Teacher Dashboard**
    - Tài khoản Quản lý học thuật ➜ **Academic Manager Dashboard**
    - Tài khoản Quản trị hệ thống ➜ **System Admin Dashboard**
  - **Tài khoản mẫu thử nghiệm (Quick Demo Presets):** Hỗ trợ tiện ích điền nhanh thông tin của 5 vai trò phục vụ công tác kiểm thử và nghiệm thu đồ án.

---

### 📊 3. Role-Based Dashboards (Bảng điều khiển theo từng vai trò)

Chỉ khi truy cập vào Bảng điều khiển (Dashboard), giao diện mới phân nhánh sâu theo 5 vai trò nghiệp vụ:

### 🎒 3. Student Screen & Dashboard (Học sinh)
- **Aesthetic Archetype:** *STEAM EdTech & Inspiring* — Clean, vibrant, engaging, large touch targets ($\ge 44\text{px}$), motivating gamification badges.
- **Key Modules:**
  - **Upcoming Schedule & Live Class Access:** Countdown timer to the next session, class status (*"Đang diễn ra"*, *"Sắp bắt đầu"*), 1-click *"Vào lớp học ngay"* button.
  - **Course Progress & Curriculum Tracker:** Visual roadmap of completed, in-progress, and upcoming lessons with milestone badges.
  - **Project & Homework Submission:** Drag-and-drop submission for Scratch `.sb3`, Python `.py`, 3D `.stl`, or GitHub links with preview modal.
  - **Teacher Feedback & Trophy Showcase:** Real-time star ratings, badge collections (e.g. *"Python Master"*, *"Robo Innovator"*), and written tutor encouragement.
  - **Student Profile & Badges:** Gamified level-up bar, avatar selector, and learning streak counter.

---

### 👨‍👩‍👧 4. Parent Screen & Dashboard (Phụ huynh)
- **Aesthetic Archetype:** *High-Trust & Reassuring* — Clean layout, generous whitespace, high-contrast summaries, transparent progress tracking.
- **Key Modules:**
  - **Child Switcher:** Multi-child selector for families with more than one student enrolled at TEKY.
  - **Real-Time Attendance & Schedule:** Calendar view of child's timetable with clear color-coded indicators (Present / Absent / Makeup / Scheduled).
  - **Teacher Feedback Timeline:** Instant post-lesson comments from tutors after each session, detailing child's comprehension and classroom participation.
  - **STEAM Competency Report:** Visual radar / bar chart evaluating 5 core dimensions: Logical Thinking, Problem Solving, Creative Design, Teamwork, and Coding Proficiency.
  - **Tuition & Payment Invoices:** Billing history, upcoming tuition reminders, online payment integration (VNPay/MoMo/Banking), and receipt downloads.

---

### 👨‍🏫 5. Teacher Screen & Dashboard (Giảng viên / Tutor)
- **Aesthetic Archetype:** *Efficient & Functional* — Fast data entry, keyboard-friendly actions, clear status badges, zero administrative friction.
- **Key Modules:**
  - **Weekly Teaching Timetable:** Grid/agenda view showing assigned classes, room codes/meeting URLs, student headcount, and class status.
  - **Class Roster & Quick Attendance:** 1-click bulk attendance tool (All Present, mark Absent/Late with reason notes).
  - **Lesson Curriculum & Teaching Materials:** Direct access to lesson slides, starter code repositories, teacher guides, and homework rubrics.
  - **Student Evaluation Entry Form:** Quick student scoring (1-5 stars) and pre-templated qualitative remarks for each student after class.
  - **Schedule Adjustment & Substitute Request:** Form to request schedule swaps, submit leave notice, or volunteer for substitute teaching shifts.

---

### 📋 6. Academic Manager Screen & Dashboard (Quản lý học thuật)
- **Aesthetic Archetype:** *Analytics & Data-Dense* — Compact rows (36–40px), sticky headers, conflict matrix, tabular numerals, advanced filter toolbars.
- **Key Modules:**
  - **Academic KPI Overview:** Total active courses, classes running, tutor utilization rate, student attendance rate, and curriculum completion stats.
  - **Course & Curriculum Management:** CRUD catalog for courses (Scratch, Python, Web, Robotics), lesson builder, syllabus editor, and draft/publish workflow.
  - **Class Scheduling & Timetable Matrix:** Conflict detection engine flagging tutor double-booking, room shortages, or schedule overlaps.
  - **Tutor Allocation & Availability Matcher:** Smart matcher searching for available teachers matching course subject, age group expertise, and slot free time.
  - **Teacher Evaluation & Performance Hub:** Comparative performance graphs, student feedback scores, punctuality logs, and peer reviews.
  - **Quality Surveys & Reports:** Student/parent satisfaction survey builder, response aggregation charts, and exportable academic reports (PDF/Excel).

---

### ⚙️ 7. System Admin Screen & Dashboard (Quản trị hệ thống)
- **Aesthetic Archetype:** *Security & Control* — High-contrast slate/dark elements, strict auditing indicators, system metric cards.
- **Key Modules:**
  - **User & RBAC Management:** Comprehensive user list with role assignment, status toggles (Active, Locked, Suspended), password reset triggers, and account creation.
  - **Center & Branch Configuration:** Management of physical TEKY campuses and virtual online branches (classrooms, branch managers, contact info).
  - **System Audit Logs & Security:** Real-time log table tracking authentication attempts, sensitive data modifications, role updates, and IP addresses.
  - **System Health & Integrations:** Database status, background worker queues, external API health (Email service, Video conferencing, Payment gateways).

---

## 3. Technology & Architecture Boundaries

- **Frontend:** React (Vite) + TypeScript + Tailwind CSS + Lucide React + Radix UI Primitives / Shadcn UI.
- **Backend:** .NET 9 Clean Architecture (`backend/TEKY_LearningHub.sln`):
  - Domain (Entities, Enums, Exceptions)
  - Application (CQRS, MediatR, FluentValidation, DTOs)
  - Infrastructure (EF Core, SQL Server, Interceptors)
  - API (Controllers, OpenAPI/Swagger)
- **Display Modes:** Light Mode as default educational standard, with a meticulously calibrated Dark Mode option.
- **Accessibility:** Strict WCAG 2.1 AA conformance across all roles.

---

## 4. Product Quality Directives (Anti-AI Slop)

1. **Consistent Visual Language:** Unified brand tokens across student, parent, teacher, manager, and admin screens while adapting density to role intent.
2. **Tabular Numerals:** Always apply `font-variant-numeric: tabular-nums` to financial data, attendance stats, and timetable hours.
3. **Responsive Rhythm:** Mobile-first layout for student and parent interfaces (360px+); desktop-first optimization with responsive collapse for manager and admin tables.
4. **Resilient States:** Every view must handle empty state (no classes, no students, no results) with helpful contextual guidance and zero cumulative layout shift.
