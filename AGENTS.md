# AGENTS.md — TEKY Learning Hub Agent Guidelines

> **Project:** SEP490_FA26_TEKY-Learning-Hub  
> **Repository Scope:** Integrated Learning Management & Online Tutor Platform for TEKY STEAM Academy.  
> **Target Audience:** K-12 Students (Ages 7–16), Parents, Tutors/Teachers, Academic Managers, System Administrators.

---

## 1. System Architecture & Tech Stack

### Backend (.NET 9 Clean Architecture)
- **Solution:** `backend/TEKY_LearningHub.sln`
- **Layers & Dependency Rule (Inward only):**
  - `TEKY_LearningHub.Domain`: Pure core entities, enums, value objects, domain exceptions. Zero external framework dependencies.
  - `TEKY_LearningHub.Application`: CQRS (MediatR), DTOs, FluentValidation, AutoMapper, interfaces (`IApplicationDbContext`, `ICurrentUserService`).
  - `TEKY_LearningHub.Infrastructure`: EF Core, SQL Server `ApplicationDbContext`, entity configurations, interceptors (`AuditableEntityInterceptor`).
  - `TEKY_LearningHub.API`: ASP.NET Core Web API controllers, Swagger/OpenAPI, global exception handling middleware.

### Frontend (Modern React & Tailwind CSS)
- **Stack:** React 18/19 (Vite) + TypeScript + Tailwind CSS v3/v4 + Lucide React + Radix UI / Shadcn UI primitives.
- **State & Data Fetching:** TanStack Query (React Query) for server state, Zustand or Context API for client auth/theme state.
- **Icons:** `lucide-react` with consistent 18–20px sizing and optical center alignment.

---

## 2. UI/UX & Design Directives (Impeccable & UI/UX Pro Max)

Every agent designing or implementing frontend interfaces **MUST** adhere to the following standards:

### A. Dual Archetype System
1. **Student & Parent Surfaces (STEAM EdTech & Inspiring):**
   - High legibility, friendly rounded corners (`rounded-xl` to `rounded-2xl`).
   - Touch/click targets $\ge 44\text{px} \times 44\text{px}$ on all interactive controls.
   - Primary: TEKY Blue (`#2563EB`), Accent: TEKY Orange (`#F97316`) for achievements and milestones.
   - Micro-interactions: smooth 150-200ms ease-out transitions.
2. **Staff Surfaces (Teacher, Academic Manager, System Admin — Analytics & Data-Dense):**
   - High information density, compact table rows (36–40px), sticky headers, status badges.
   - Advanced filter toolbars, timetable conflict visualization matrix.
   - Tabular numerals (`tabular-nums`) for all times, dates, codes, and metrics.

### B. Anti-Pattern Bans (Strictly No AI Slop)
- ❌ **No indiscriminate purple-to-blue gradient cards:** Use solid, high-contrast surfaces (`#FFFFFF` in light mode, `#1E293B` in dark mode).
- ❌ **No cards-inside-cards recursion:** Use subtle background shifts (`bg-slate-50` / `bg-slate-100`) or whitespace dividers instead of nested boxed borders.
- ❌ **No unstyled gray text on colored backgrounds:** Secondary text on tinted cards must carry the tint of that hue to avoid dirty optical artifacts.
- ❌ **No unblurred neon outlines:** All shadows must have vertical offsets and soft blurs mimicking real light.

### C. The 8 Mandatory Component States
Every interactive control and page view must provide:
1. `Default` | 2. `Hover` | 3. `Active/Pressed` | 4. `Focus-Visible` (accessible ring) | 5. `Disabled` | 6. `Loading` (skeleton/shimmer, CLS = 0) | 7. `Empty` (illustrated with primary action) | 8. `Error` (actionable recovery message).

---

## 3. Mandatory Pages & Role Breakdown

The platform implements 8 core page / dashboard groups:
1. **Homepage:** Public STEAM academy showcase, featured courses, value proposition for parents/students, primary login/register CTAs.
2. **Authentication (Login / Password Recovery):** Secure RBAC login (Student, Parent, Teacher, Academic Manager, Admin), password reset flow, session guard.
3. **Student Dashboard & Screens:** Timetable, upcoming classes, join live online classroom, lesson materials & project submission, gamified achievements & tutor feedback.
4. **Parent Dashboard & Screens:** Child progress overview, real-time attendance, post-session teacher comments, STEAM competency report, tuition & invoices.
5. **Teacher Dashboard & Screens:** Weekly teaching schedule, one-click classroom attendance, curriculum lesson plans, student grading & remarks, substitution requests.
6. **Academic Manager Dashboard & Screens:** Course & curriculum editor, class creation & student enrollment, teacher availability matcher, timetable conflict resolver, teacher KPI & survey analytics.
7. **System Admin Dashboard & Screens:** User management & RBAC assignments, center branch configuration, system audit logs, health & backup monitoring.
8. **Shared Shell:** Responsive navigation, role-swapping / session menu, notification center, light/dark mode toggle.

---

## 4. Coding & Workflow Rules for Agents

1. **Verify Before Coding:** Always read [`PRODUCT.md`](file:///d:/KLTN/SEP490_FA26_TEKY-Learning-Hub/PRODUCT.md) and [`DESIGN.md`](file:///d:/KLTN/SEP490_FA26_TEKY-Learning-Hub/DESIGN.md) before implementing or modifying screens.
2. **Consult Tools:** Use `search.py` from `.agent/skills/ui-ux-pro-max/scripts/search.py` to retrieve palette or layout recommendations for specific features.
3. **Run Polish:** Review code against `.agent/skills/impeccable/reference/craft-floor.md` to guarantee contrast ratios ($\ge 4.5:1$ body, $\ge 3:1$ headings).
4. **Preserve Integrity:** Keep all existing comments, docstrings, and architecture boundaries intact unless explicitly instructed otherwise.

