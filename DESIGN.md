# Design System: TEKY Learning Hub

> **Aesthetic Direction:** Modern STEAM EdTech — Vibrant, inspiring, high-trust, and precision-engineered.  
> **Design Intelligence:** Sourced via `ui-ux-pro-max` (BM25 Hybrid Intelligence) & polished to `impeccable` Craft Floor standards.  
> **Dual Archetype Philosophy:**
> 1. **Student & Parent Archetype:** *STEAM EdTech & Inspiring* — Warm, engaging, accessible, touch targets $\ge 44\text{px}$, Bento Grid modules, gamified achievement badges.
> 2. **Staff & Admin Archetype:** *Analytics & Data-Dense* — High information density, compact table rows (36–40px), sticky headers, conflict matrix, tabular numerals, advanced filter toolbars.

---

## 1. Color System & Semantic Tokens

### Core Brand Tokens
- **TEKY Blue (Primary - Innovation & Trust):**
  - `primary-50`: `#EFF6FF` (Subtle tint for selected rows & badges)
  - `primary-100`: `#DBEAFE`
  - `primary-500`: `#3B82F6`
  - `primary-600`: `#2563EB` (Primary Brand Call-To-Action)
  - `primary-700`: `#1D4ED8` (Hover / Active state)
  - `primary-900`: `#1E3A8A` (High-contrast text on blue tints)
- **TEKY Orange / Amber (Secondary / Accent - STEAM Energy & Gamification):**
  - `accent-50`: `#FFF7ED`
  - `accent-100`: `#FFEDD5`
  - `accent-500`: `#F97316` (Streak counters, trophies, milestone highlights)
  - `accent-600`: `#EA580C`
- **TEKY Cyan / Sky (Sub-accent - Robotics & Exploration):**
  - `cyan-500`: `#06B6D4`
  - `sky-500`: `#0EA5E9` (Live class indicators, online video markers)

### Functional & Status Tokens
- **Success / Attendance Present:** Emerald (`#10B981` / `#059669`)
  - Background: `#ECFDF5`, Border: `#A7F3D0`, Text: `#065F46`
- **Warning / Late / Conflict:** Amber (`#F59E0B` / `#D97706`)
  - Background: `#FFFBEB`, Border: `#FDE68A`, Text: `#92400E`
- **Danger / Absent / Canceled / Conflict:** Rose (`#EF4444` / `#DC2626`)
  - Background: `#FEF2F2`, Border: `#FECACA`, Text: `#991B1B`
- **Draft / Inactive:** Slate (`#64748B`)
  - Background: `#F1F5F9`, Border: `#CBD5E1`, Text: `#334155`

### Surface & Neutral Scales (Light & Dark Mode)
- **Light Mode (Primary Educational Canvas):**
  - App Canvas Background: `#F8FAFC` (Slate-50)
  - Card & Surface: `#FFFFFF` (Pure White)
  - Subtle Surface: `#F1F5F9` (Slate-100)
  - Border Default: `#E2E8F0` (Slate-200)
  - Text Primary: `#0F172A` (Slate-900 — contrast $\ge 12:1$)
  - Text Secondary: `#475569` (Slate-600 — contrast $\ge 5:1$)
  - Text Muted: `#64748B` (Slate-500 — contrast $\ge 4.5:1$)
- **Dark Mode (Developer / Evening Coding Canvas):**
  - App Canvas Background: `#0F172A` (Slate-900)
  - Card & Surface: `#1E293B` (Slate-800)
  - Subtle Surface: `#334155` (Slate-700)
  - Border Default: `#334155` (Slate-700)
  - Text Primary: `#F8FAFC`
  - Text Secondary: `#94A3B8`

> **Impeccable Law:** Never use unstyled raw neutral gray on colored surfaces. On a blue or orange banner, secondary text must be tinted with that same hue to maintain optical clarity.

---

## 2. Typography Hierarchy

### Typefaces
- **Headings & Display:** `Plus Jakarta Sans` or `Lexend` — modern, friendly geometric curves, high clarity for young learners.
- **Body & Data:** `Be Vietnam Pro` or `Inter` — complete, flawless Vietnamese diacritics rendering.
- **Code & Timetable Data:** `JetBrains Mono` — for Scratch/Python code blocks, timetable slot times, and student IDs.

### Modular Scale (Major Third - 1.25)
- **Display Hero:** `2.5rem` (40px) | Line-height: `1.2` | Tracking: `-0.025em` | Weight: `700`
- **H1 (Page Header):** `1.875rem` (30px) | Line-height: `1.25` | Tracking: `-0.02em` | Weight: `700`
- **H2 (Section Header):** `1.5rem` (24px) | Line-height: `1.3` | Tracking: `-0.015em` | Weight: `600`
- **H3 (Card / Modal Title):** `1.125rem` (18px) | Line-height: `1.4` | Weight: `600`
- **Body Large:** `1rem` (16px) | Line-height: `1.5` | Weight: `400 / 500`
- **Body Default:** `0.875rem` (14px) | Line-height: `1.5` | Weight: `400 / 500`
- **Caption / Meta:** `0.75rem` (12px) | Line-height: `1.4` | Weight: `500`

### Reading Constraints
- **Line Length:** Paragraphs constrained to `65ch–75ch` (`max-w-prose`) to prevent eye fatigue.
- **Tabular Figures:** Always apply `font-variant-numeric: tabular-nums` to financial data, attendance stats, and timetable slot hours.

---

## 3. Spatial System & Elevation

### Spacing Scale (4px/8px Grid)
- `space-1`: 4px | `space-2`: 8px | `space-3`: 12px | `space-4`: 16px
- `space-6`: 24px | `space-8`: 32px | `space-12`: 48px | `space-16`: 64px
- **Heading Whitespace Ratio:** Always provide at least **2x more whitespace above a heading than below it** to visually anchor the heading to its content block.

### Elevation & Shadows (Realistic Light Source)
- **Subtle Surface:** `0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)`
- **Hover / Interactive Card:** `0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)` with `translate-y-[-2px]`
- **Floating Modal / Dropdown:** `0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`

### Border Radius
- `rounded-lg`: 8px (Buttons, badges, compact table controls)
- `rounded-xl`: 12px (Cards, input fields, popovers)
- `rounded-2xl`: 16px (Bento grid panels, modals, student achievement cards)
- `rounded-full`: Avatars, pill badges, notification counters

---

## 4. Screen Layout & Architecture (Thông tin & Bố cục phân tầng)

### 🌐 Public & Shared Screens (Màn hình dùng chung)

#### 🏠 Homepage (Public Gateway)
- **Đối tượng:** Tất cả khách ghé thăm, học sinh, phụ huynh và đối tác (không phân role).
- **Layout:** High-impact landing page with sticky navigation header, container max-width `1280px`.
- **Craft Details:** High-contrast text overlays, responsive grid showcasing 4 STEAM tracks, student showcase carousel with smooth touch scroll.

#### 🔐 Universal Login (Cổng đăng nhập dùng chung)
- **Đối tượng:** 1 form đăng nhập tập trung duy nhất cho cả 5 roles.
- **Layout:** Split-screen layout (desktop: 50/50). Left: Inspirational STEAM artwork & student showcase; Right: High-contrast universal login card.
- **Form UX:** Floating labels, show/hide password toggle, clear error alerts, keyboard Enter submission, recovery links, tiện ích chọn nhanh tài khoản mẫu thử nghiệm phân quyền.

---

### 📊 Role-Divided Dashboards (Chỉ chia theo Role ở Bảng điều khiển)

Chỉ khi đã xác thực đăng nhập, giao diện Bảng điều khiển (Dashboard) mới phân nhánh theo RBAC:

#### 🎒 Student Dashboard (Học sinh)
- **Layout:** Bento Grid with 3 primary columns on desktop; single-column stacked on mobile.
- **Touch Targets:** Large clickable buttons $\ge 44\text{px} \times 44\text{px}$.
- **Gamification:** Animated streak counter (`accent-500`), trophy badges, star ratings for completed projects.

#### 👨‍👩‍👧 Parent Dashboard (Phụ huynh)
- **Layout:** High-trust summary cards (Attendance, Performance Radar, Invoices).
- **Multi-Child Switcher:** Pill-based child selector at top of dashboard.
- **Visuals:** Clean radar chart for 5 STEAM competencies, printable attendance report.

#### 👨‍🏫 Teacher Dashboard (Giảng viên)
- **Layout:** Two-column split: Left 70% weekly teaching timetable; Right 30% today's quick attendance & remarks.
- **Interaction:** 1-click bulk attendance ("All Present"), inline rating modal for student feedback.

#### 📋 Academic Manager Dashboard (Quản lý đào tạo)
- **Layout:** Analytics dashboard with KPI metric cards, searchable/filterable data tables, sticky headers.
- **Timetable Matrix:** Color-coded conflict grid flagging tutor over-allocation or room shortages.
- **Density:** Compact table rows (36–40px) with tabular numbers.

#### ⚙️ System Admin Dashboard (Quản trị hệ thống)
- **Layout:** System command center with sidebar navigation, security audit log table, user status toggles.
- **Audit Table:** Monospace timestamp, IP address, user role, action badge (Success/Failure/Warning).

---

## 5. Strict Anti-Pattern Bans (No AI Slop)

1. ❌ **No indiscriminate purple-to-blue gradient cards:** Use solid, high-contrast surfaces (`#FFFFFF` in light mode, `#1E293B` in dark mode).
2. ❌ **No cards-inside-cards recursion:** Group sub-sections with light background shifts (`bg-slate-50` / `bg-slate-100`) or whitespace dividers instead of nested boxed borders.
3. ❌ **No unstyled gray text on colored backgrounds:** Secondary text on tinted cards must carry the tint of that hue to avoid dirty optical artifacts.
4. ❌ **No unblurred neon outlines:** All shadows must have vertical offsets and soft blurs mimicking real light.
5. ❌ **No tiny tap targets on student views:** Interactive elements for young students must have touch/click targets $\ge 44\text{px} \times 44\text{px}$.
6. ❌ **No low-contrast placeholders:** All input placeholders must meet the $4.5:1$ contrast requirement.
