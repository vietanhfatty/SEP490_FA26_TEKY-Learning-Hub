import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { changeAcademic, readAcademic } from "../api-client/academic";
import type {
  AcademicClass,
  AcademicCourse,
  AcademicEquipment,
  AcademicRegistration,
  AcademicSession,
  AcademicWorkspace,
} from "../api-client/academic";
import { getAdminCourse } from "../api-client/courses";
import type { AdminCourseDetail } from "../api-client/courses";
import { AdminCoursesView } from "./AdminCoursesView";
import { currency, localDay } from "../api-client/parentPortal";
import "./AcademicManagerView.css";

type Option = { value: number | string; label: string };
type Field = {
  name: string;
  label: string;
  type?: "number" | "date" | "time" | "textarea";
  options?: Option[];
  optional?: boolean;
  min?: number;
  max?: number;
};
type Editor = {
  title: string;
  path: string;
  values: Record<string, unknown>;
  fields: Field[];
  actionLabel?: string;
};
const labels: Record<string, string> = {
  Draft: "Bản nháp",
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Từ chối",
  Revision: "Cần chỉnh sửa",
  Published: "Công khai",
  Active: "Hoạt động",
  Archived: "Lưu trữ",
  Planned: "Dự kiến",
  Open: "Mở đăng ký",
  Closed: "Đóng đăng ký",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
  Scheduled: "Đã xếp lịch",
  Done: "Đã diễn ra",
  Accepted: "Đã tiếp nhận",
  Declined: "Từ chối",
  Paid: "Đã thanh toán",
  Unpaid: "Chưa thanh toán",
  Available: "Sẵn sàng",
  InUse: "Đang sử dụng",
  Damaged: "Hỏng",
  Maintenance: "Bảo trì",
  Lost: "Thất lạc",
  Retired: "Ngừng sử dụng",
  Inactive: "Ngừng hoạt động",
  Transferred: "Đã chuyển",
  Dropped: "Dừng học",
};
const titles: Record<string, string> = {
  kpi: "Academic Monitoring",
  courses: "Course & Curriculum",
  approval: "Course Approval",
  classes: "Class Management",
  teachers: "Teacher Management",
  timetable: "Timetable Management",
  registrations: "Registration Management",
  operations: "Academic Operations",
};
const stateOptions = (...values: string[]): Option[] =>
  values.map((value) => ({ value, label: labels[value] ?? value }));
const Badge = ({ value }: { value: string }) => (
  <span className={`am-badge am-status-${value.toLowerCase()}`}>
    {labels[value] ?? value}
  </span>
);
const options = (rows: { id: number; name: string }[]) =>
  rows.map((row) => ({ value: row.id, label: row.name }));
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
const plusDay = (value: string, offset: number) => {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const monthRange = (value: string) => {
  const start = value.slice(0, 7) + "-01";
  const last = new Date(start + "T12:00:00Z");
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  return { from: start, to: last.toISOString().slice(0, 10), mode: "month" };
};
const time = (value: string) => value.slice(0, 5);
function Table({
  heads,
  children,
  empty,
}: {
  heads: string[];
  children: ReactNode;
  empty: boolean;
}) {
  return (
    <div className="am-table-scroll">
      <table>
        <thead>
          <tr>
            {heads.map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={heads.length}>
                <div className="am-empty">Chưa có dữ liệu phù hợp.</div>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
function AcademicModal({
  children,
  titleId,
  onClose,
  busy = false,
}: {
  children: ReactNode;
  titleId: string;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="am-native"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <section className="am-dialog">{children}</section>
    </dialog>
  );
}
function EditForm({
  editor,
  onSave,
  onClose,
  busy,
  error,
}: {
  editor: Editor;
  onSave: (body: Record<string, unknown>) => void;
  onClose: () => void;
  busy: boolean;
  error: string;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { ...editor.values };
    for (const field of editor.fields) {
      const raw = String(form.get(field.name) ?? "").trim();
      const numeric =
        field.type === "number" ||
        field.options?.some((option) => typeof option.value === "number");
      body[field.name] =
        raw === ""
          ? null
          : numeric
            ? Number(raw)
            : field.type === "time" && raw.length === 5
              ? raw + ":00"
              : raw;
    }
    onSave(body);
  }
  return (
    <AcademicModal titleId="am-editor-title" onClose={onClose} busy={busy}>
      <header>
        <h2 id="am-editor-title">{editor.title}</h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Đóng biểu mẫu"
        >
          ×
        </button>
      </header>
      <form onSubmit={submit}>
        <div className="am-fields">
          {editor.fields.map((field) => (
            <label key={field.name}>
              {field.label}
              {field.optional ? "" : " *"}
              {field.options ? (
                <select
                  name={field.name}
                  defaultValue={String(editor.values[field.name] ?? "")}
                  required={!field.optional}
                  disabled={busy}
                >
                  <option value="">Chọn…</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  maxLength={1000}
                  rows={3}
                  defaultValue={String(editor.values[field.name] ?? "")}
                  required={!field.optional}
                  disabled={busy}
                />
              ) : (
                <input
                  autoFocus={editor.fields[0] === field}
                  name={field.name}
                  type={field.type ?? "text"}
                  min={field.min}
                  max={field.max}
                  maxLength={
                    field.name === "classCode"
                      ? 30
                      : field.name === "roomName"
                        ? 50
                        : field.name === "code"
                          ? 40
                          : 150
                  }
                  defaultValue={String(editor.values[field.name] ?? "")}
                  required={!field.optional}
                  disabled={busy}
                />
              )}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="am-error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button className="am-primary" disabled={busy}>
            {busy ? "Đang lưu…" : (editor.actionLabel ?? "Lưu thay đổi")}
          </button>
        </footer>
      </form>
    </AcademicModal>
  );
}

export function AcademicManagerView({
  activeNavId = "kpi",
  onSelectNav,
}: {
  activeNavId?: string;
  onSelectNav?: (id: string) => void;
}) {
  const section = activeNavId in titles ? activeNavId : "kpi";
  const [range, setRange] = useState(() => ({
    from: today(),
    to: plusDay(today(), 6),
    mode: "week",
  }));
  const [resource, setResource] = useState<{
    key: string;
    data?: AcademicWorkspace;
    error?: string;
  }>();
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Editor>();
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<AdminCourseDetail>();
  const [previewError, setPreviewError] = useState("");
  const [roster, setRoster] = useState<number>();
  const [search, setSearch] = useSearchParams();
  const [teacherFilter, setTeacherFilter] = useState(
    () => search.get("teacherId") ?? "",
  );
  const [classFilter, setClassFilter] = useState("");
  const key = range.from + range.to + ":" + revision;
  useEffect(() => {
    const controller = new AbortController();
    readAcademic(range.from, range.to, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResource({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResource({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được dữ liệu.",
          });
      });
    return () => controller.abort();
  }, [key, range.from, range.to]);
  const data = resource?.key === key ? resource.data : undefined;
  const error = resource?.key === key ? resource.error : undefined;
  const loading = resource?.key !== key;
  const matches = (values: (string | number | null | undefined)[]) =>
    values
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(query.trim().toLocaleLowerCase("vi"));
  function open(next: Editor) {
    setEditError("");
    setNotice("");
    setEditor(next);
  }
  async function save(body: Record<string, unknown>) {
    if (!editor || busy) return;
    setBusy(true);
    setEditError("");
    try {
      await changeAcademic(editor.path, body);
      setEditor(undefined);
      setNotice("Đã lưu thay đổi.");
      setRevision((value) => value + 1);
    } catch (failure) {
      setEditError(
        failure instanceof Error ? failure.message : "Chưa lưu được.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function inspect(courseId: number) {
    setPreview(undefined);
    setPreviewError("");
    try {
      setPreview(await getAdminCourse(courseId));
    } catch (failure) {
      setPreviewError(
        failure instanceof Error
          ? failure.message
          : "Chưa mở được chương trình.",
      );
    }
  }
  function courseReview(course: AcademicCourse, action: string) {
    open({
      title: `${action === "Submit" ? "Gửi duyệt" : action === "Approve" ? "Duyệt" : action === "Reject" ? "Từ chối" : action === "RequestRevision" ? "Yêu cầu chỉnh sửa" : action === "Publish" ? "Xuất bản" : action === "Unpublish" ? "Ẩn" : "Lưu trữ"} · ${course.name}`,
      path: "courses/review",
      values: { id: course.courseId, action, version: course.version },
      fields: [
        {
          name: "comment",
          label: "Nhận xét / lý do",
          type: "textarea",
          optional: !["Reject", "RequestRevision"].includes(action),
        },
      ],
    });
  }
  if (section === "courses")
    return (
      <div className="am-view">
        <AdminCoursesView />
      </div>
    );
  const courseOptions = options(
    (data?.courses ?? [])
      .filter((c) => c.status !== "Archived")
      .map((c) => ({ id: c.courseId, name: `${c.courseCode} · ${c.name}` })),
  );
  const classOptions = options(
    (data?.classes ?? [])
      .filter((c) => c.status === "Open")
      .map((c) => ({ id: c.classId, name: `${c.classCode} · ${c.name}` })),
  );
  const sessionClassOptions = options(
    (data?.classes ?? [])
      .filter((c) => ["Planned", "Open", "Closed"].includes(c.status))
      .map((c) => ({ id: c.classId, name: `${c.classCode} · ${c.name}` })),
  );
  const teacherOptions = options(
    (data?.teachers ?? []).map((t) => ({ id: t.teacherId, name: t.name })),
  );
  const roomOptions = options(
    (data?.rooms ?? [])
      .filter(
        (r) =>
          r.status === "Active" &&
          (r.departmentId == null ||
            data?.canManageSharedResources ||
            data?.departments.some(
              (department) => department.departmentId === r.departmentId,
            )),
      )
      .map((r) => ({
        id: r.roomId,
        name: `${r.roomName} · ${r.capacity} chỗ`,
      })),
  );
  function editClass(row?: AcademicClass) {
    open({
      title: row ? "Chỉnh sửa lớp học" : "Tạo lớp học",
      path: "classes",
      values: row ? { ...row } : { maxStudents: 20, status: "Planned" },
      fields: [
        { name: "courseId", label: "Khóa học", options: courseOptions },
        { name: "classCode", label: "Mã lớp" },
        { name: "name", label: "Tên lớp" },
        {
          name: "maxStudents",
          label: "Sĩ số tối đa",
          type: "number",
          min: 1,
          max: 500,
        },
        {
          name: "teacherId",
          label: "Giảng viên",
          options: teacherOptions,
          optional: true,
        },
        {
          name: "startDate",
          label: "Ngày bắt đầu",
          type: "date",
          optional: true,
        },
        {
          name: "endDate",
          label: "Ngày kết thúc",
          type: "date",
          optional: true,
        },
        {
          name: "status",
          label: "Trạng thái",
          options: stateOptions(
            "Planned",
            "Open",
            "Closed",
            "Completed",
            "Cancelled",
          ),
        },
        {
          name: "reason",
          label: "Lý do thay đổi / hủy lớp",
          type: "textarea",
          optional: true,
        },
      ],
    });
  }
  function place(row?: AcademicClass, studentId?: number, source?: number) {
    open({
      title: source ? "Chuyển học sinh sang lớp khác" : "Thêm học sinh vào lớp",
      path: "placements",
      values: { classId: row?.classId, studentId, fromClassId: source },
      fields: [
        {
          name: "studentId",
          label: "Học sinh",
          options: options(
            (data?.students ?? []).map((s) => ({
              id: s.studentId,
              name: `${s.studentCode} · ${s.name}`,
            })),
          ),
        },
        { name: "classId", label: "Lớp đích", options: classOptions },
        {
          name: "reason",
          label: "Ghi chú xếp lớp",
          type: "textarea",
          optional: true,
        },
      ],
    });
  }
  function editSession(row?: AcademicSession) {
    open({
      title: row ? "Điều chỉnh buổi học" : "Tạo buổi học",
      path: "sessions",
      values: row
        ? { ...row, startsAt: time(row.startsAt), endsAt: time(row.endsAt) }
        : { date: range.from, startsAt: "09:00", endsAt: "10:30" },
      fields: [
        { name: "classId", label: "Lớp học", options: sessionClassOptions },
        {
          name: "lessonId",
          label: "Bài học (cùng khóa học của lớp)",
          options: options(
            (data?.lessons ?? []).map((l) => ({
              id: l.lessonId,
              name: `Bài ${l.orderNo} · ${l.title}`,
            })),
          ),
          optional: true,
        },
        {
          name: "roomId",
          label: "Phòng học",
          options: roomOptions,
          optional: true,
        },
        { name: "date", label: "Ngày học", type: "date" },
        { name: "startsAt", label: "Bắt đầu", type: "time" },
        { name: "endsAt", label: "Kết thúc", type: "time" },
        {
          name: "reason",
          label: "Lý do đổi lịch",
          type: "textarea",
          optional: !row,
        },
      ],
    });
  }
  const departmentOptions = options(
    (data?.departments ?? []).map((department) => ({
      id: department.departmentId,
      name: department.name,
    })),
  );
  function editRoom(row?: AcademicWorkspace["rooms"][number]) {
    open({
      title: row ? "Cập nhật phòng học" : "Thêm phòng học",
      path: "rooms",
      values: row
        ? { ...row }
        : {
            capacity: 20,
            status: "Active",
            departmentId: data?.canManageSharedResources
              ? null
              : data?.departments[0]?.departmentId,
          },
      fields: [
        { name: "roomName", label: "Tên phòng" },
        {
          name: "departmentId",
          label: "Phòng ban quản lý",
          options: departmentOptions,
          optional: data?.canManageSharedResources,
        },
        {
          name: "capacity",
          label: "Sức chứa",
          type: "number",
          min: 1,
          max: 500,
        },
        {
          name: "status",
          label: "Trạng thái",
          options: stateOptions("Active", "Inactive"),
        },
      ],
    });
  }
  function editEquipment(row?: AcademicEquipment) {
    open({
      title: row ? "Cập nhật thiết bị" : "Thêm thiết bị STEM",
      path: "equipment",
      values: row
        ? { ...row }
        : {
            status: "Available",
            departmentId: data?.canManageSharedResources
              ? null
              : data?.departments[0]?.departmentId,
            purchaseDate: today(),
            costVnd: 0,
            usefulLifeMonths: 36,
          },
      fields: [
        { name: "code", label: "Mã thiết bị" },
        {
          name: "departmentId",
          label: "Phòng ban quản lý",
          options: departmentOptions,
          optional: data?.canManageSharedResources,
        },
        { name: "name", label: "Tên thiết bị" },
        {
          name: "roomId",
          label: "Phòng được phân bổ",
          options: roomOptions,
          optional: true,
        },
        {
          name: "status",
          label: "Tình trạng",
          options: stateOptions(
            "Available",
            "InUse",
            "Damaged",
            "Maintenance",
            "Lost",
            "Retired",
          ),
        },
        { name: "purchaseDate", label: "Ngày mua", type: "date" },
        {
          name: "costVnd",
          label: "Nguyên giá (VND)",
          type: "number",
          min: 0,
          max: 2147483647,
        },
        {
          name: "usefulLifeMonths",
          label: "Thời gian khấu hao (tháng)",
          type: "number",
          min: 1,
          max: 600,
        },
        { name: "note", label: "Ghi chú", type: "textarea", optional: true },
      ],
    });
  }
  function registrationReview(row: AcademicRegistration, action: string) {
    open({
      title: `${action === "Approve" ? "Duyệt đăng ký" : action === "Assign" ? "Xếp lớp" : action === "Reject" ? "Từ chối" : "Yêu cầu bổ sung"} · ${row.studentName}`,
      path: "registrations/review",
      values: {
        requestId: row.requestId,
        classId: row.classId,
        action,
        version: row.version,
      },
      fields: [
        {
          name: "classId",
          label: "Lớp được xếp",
          options: options(
            (data?.classes ?? [])
              .filter((c) => c.courseId === row.courseId && c.status === "Open")
              .map((c) => ({
                id: c.classId,
                name: `${c.classCode} · ${c.students} + ${c.reserved}/${c.maxStudents}`,
              })),
          ),
        },
        {
          name: "comment",
          label: "Nhận xét điều kiện học tập / thông tin cần bổ sung",
          type: "textarea",
          optional: action === "Approve" || action === "Assign",
        },
      ],
    });
  }
  const classes =
    data?.classes.filter(
      (c) =>
        matches([c.classCode, c.name, c.courseName, c.teacherName]) &&
        (!status || c.status === status),
    ) ?? [];
  const courses =
    data?.courses.filter(
      (c) =>
        matches([c.courseCode, c.name]) &&
        (!status || c.reviewStatus === status),
    ) ?? [];
  const teachers =
    data?.teachers.filter((t) =>
      matches([t.teacherCode, t.name, t.specialty]),
    ) ?? [];
  const sessions =
    data?.sessions.filter(
      (s) =>
        matches([s.classCode, s.title, s.teacherName, s.roomName]) &&
        (!status || s.status === status) &&
        (!teacherFilter || s.teacherId === Number(teacherFilter)) &&
        (!classFilter || s.classId === Number(classFilter)),
    ) ?? [];
  const conflicts = new Map<number, Set<string>>();
  const scheduled =
    data?.sessions.filter((s) => s.status === "Scheduled") ?? [];
  for (let first = 0; first < scheduled.length; first++) {
    const a = scheduled[first];
    for (let second = first + 1; second < scheduled.length; second++) {
      const b = scheduled[second];
      if (a.date !== b.date || a.startsAt >= b.endsAt || b.startsAt >= a.endsAt)
        continue;
      const reasons = [];
      if (a.classId === b.classId) reasons.push("Lớp học");
      if (a.teacherId && a.teacherId === b.teacherId)
        reasons.push("Giảng viên");
      if (a.roomId && a.roomId === b.roomId) reasons.push("Phòng học");
      const studentsA = new Set(
        data?.enrollments
          .filter((e) => e.classId === a.classId && e.status === "Active")
          .map((e) => e.studentId),
      );
      if (
        data?.enrollments.some(
          (e) =>
            e.classId === b.classId &&
            e.status === "Active" &&
            studentsA.has(e.studentId),
        )
      )
        reasons.push("Học sinh");
      for (const session of [a, b]) {
        const current = conflicts.get(session.sessionId) ?? new Set<string>();
        for (const reason of reasons) current.add(reason);
        if (current.size) conflicts.set(session.sessionId, current);
      }
    }
  }
  const registrations =
    data?.registrations.filter(
      (r) =>
        matches([r.studentName, r.parentName, r.courseName, r.classCode]) &&
        (!status || r.status === status),
    ) ?? [];
  return (
    <div className="am-view">
      <header className="am-heading">
        <div>
          <h1>{titles[section]}</h1>
          <p>
            Quản lý đào tạo và theo dõi các thay đổi trong phạm vi được phân
            quyền.
          </p>
        </div>
        <button
          onClick={() => setRevision((value) => value + 1)}
          disabled={loading || busy}
        >
          Làm mới
        </button>
      </header>
      {notice && (
        <p className="am-notice" role="status">
          {notice}
        </p>
      )}
      {previewError && (
        <p className="am-error" role="alert">
          {previewError}
        </p>
      )}
      {error && (
        <div className="am-error" role="alert">
          <p>{error}</p>
          <button onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {loading && (
        <div className="am-loading" role="status" aria-live="polite">
          Đang tải dữ liệu đào tạo…
        </div>
      )}
      {data && (
        <>
          {["kpi", "timetable", "teachers", "operations"].includes(section) && (
            <div className="am-toolbar">
              <label>
                Từ ngày
                <input
                  type="date"
                  value={range.from}
                  onChange={(e) =>
                    e.target.value &&
                    setRange((r) => ({
                      ...r,
                      from: e.target.value,
                      to: plusDay(e.target.value, r.mode === "month" ? 30 : 6),
                    }))
                  }
                />
              </label>
              <label>
                Đến ngày
                <input
                  type="date"
                  value={range.to}
                  min={range.from}
                  max={plusDay(range.from, 93)}
                  onChange={(e) =>
                    e.target.value &&
                    setRange((r) => ({ ...r, to: e.target.value }))
                  }
                />
              </label>
              <button
                aria-pressed={range.mode === "week"}
                onClick={() =>
                  setRange((r) => ({
                    ...r,
                    mode: "week",
                    to: plusDay(r.from, 6),
                  }))
                }
              >
                Tuần
              </button>
              <button
                aria-pressed={range.mode === "month"}
                onClick={() => setRange((r) => monthRange(r.from))}
              >
                Tháng
              </button>
            </div>
          )}
          {section !== "kpi" && (
            <div className="am-toolbar">
              <label>
                Tìm kiếm
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Mã, tên, lớp hoặc giáo viên"
                />
              </label>
              {["classes", "approval", "timetable", "registrations"].includes(
                section,
              ) && (
                <label>
                  Trạng thái
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {(section === "classes"
                      ? stateOptions(
                          "Planned",
                          "Open",
                          "Closed",
                          "Completed",
                          "Cancelled",
                        )
                      : section === "approval"
                        ? stateOptions(
                            "Draft",
                            "Pending",
                            "Approved",
                            "Rejected",
                            "Revision",
                          )
                        : section === "timetable"
                          ? stateOptions("Scheduled", "Done", "Cancelled")
                          : stateOptions("Pending", "Accepted", "Declined")
                    ).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {section === "classes" && (
                <button className="am-primary" onClick={() => editClass()}>
                  Tạo lớp học
                </button>
              )}
              {section === "timetable" && (
                <>
                  <button className="am-primary" onClick={() => editSession()}>
                    Tạo buổi học
                  </button>
                  <label>
                    Lớp
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="">Tất cả lớp</option>
                      {data.classes.map((c) => (
                        <option key={c.classId} value={c.classId}>
                          {c.classCode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Giảng viên
                    <select
                      value={teacherFilter}
                      onChange={(e) => setTeacherFilter(e.target.value)}
                    >
                      <option value="">Tất cả giảng viên</option>
                      {teacherOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
          {section === "kpi" && (
            <>
              <div className="am-metrics">
                {[
                  [
                    "Khóa học công khai",
                    data.courses.filter((c) =>
                      ["Published", "Active"].includes(c.status),
                    ).length,
                    "approval",
                  ],
                  [
                    "Lớp đang mở",
                    data.classes.filter((c) => c.status === "Open").length,
                    "classes",
                  ],
                  [
                    "Học sinh đang theo học",
                    new Set(
                      data.enrollments
                        .filter((e) => e.status === "Active")
                        .map((e) => e.studentId),
                    ).size,
                    "classes",
                  ],
                  [
                    "Lớp chưa có giáo viên",
                    data.classes.filter(
                      (c) =>
                        ["Open", "Planned"].includes(c.status) && !c.teacherId,
                    ).length,
                    "teachers",
                  ],
                  [
                    "Đăng ký chờ duyệt",
                    data.registrations.filter((r) => r.status === "Pending")
                      .length,
                    "registrations",
                  ],
                  [
                    "Yêu cầu học bù",
                    data.makeupRequests.filter((m) => m.status === "Pending")
                      .length,
                    "operations",
                  ],
                ].map(([label, value, target]) => (
                  <button
                    key={label}
                    onClick={() => onSelectNav?.(String(target))}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </button>
                ))}
              </div>
              <h2>Tiến độ tổ chức lớp học</h2>
              <Table
                heads={[
                  "Lớp",
                  "Khóa học",
                  "Học sinh + giữ chỗ",
                  "Buổi đã diễn ra",
                  "Buổi bị hủy",
                  "Trạng thái",
                ]}
                empty={!data.classes.length}
              >
                {data.classes.map((c) => (
                  <tr key={c.classId}>
                    <td>{c.classCode}</td>
                    <td>{c.courseName}</td>
                    <td>
                      {c.students} + {c.reserved} / {c.maxStudents}
                    </td>
                    <td>
                      {c.doneSessions}/{c.totalSessions}
                      <progress
                        value={c.doneSessions}
                        max={Math.max(1, c.totalSessions)}
                        aria-label={`Tiến độ lớp ${c.classCode}`}
                      />
                    </td>
                    <td>{c.cancelledSessions}</td>
                    <td>
                      <Badge value={c.status} />
                    </td>
                  </tr>
                ))}
              </Table>
              <h2>Buổi học đã đổi lịch trong khoảng đang xem</h2>
              <Table
                heads={["Ngày", "Lớp", "Buổi học", "Lý do"]}
                empty={!data.sessions.some((s) => s.changeReason)}
              >
                {data.sessions
                  .filter((s) => s.changeReason)
                  .map((s) => (
                    <tr key={s.sessionId}>
                      <td>{localDay(s.date)}</td>
                      <td>{s.classCode}</td>
                      <td>{s.title ?? `#${s.sessionId}`}</td>
                      <td>{s.changeReason}</td>
                    </tr>
                  ))}
              </Table>
            </>
          )}
          {section === "approval" && (
            <Table
              heads={[
                "Khóa học",
                "Mục tiêu đầu ra",
                "Chương trình",
                "Kiểm duyệt",
                "Xuất bản",
                "Thao tác",
              ]}
              empty={!courses.length}
            >
              {courses.map((c) => (
                <tr key={c.courseId}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.courseCode}</small>
                  </td>
                  <td>{c.learningObjectives ?? "Chưa thiết lập"}</td>
                  <td>
                    <button onClick={() => void inspect(c.courseId)}>
                      Xem {c.lessons} bài học
                    </button>
                  </td>
                  <td>
                    <Badge value={c.reviewStatus} />
                    {c.comment && <small>{c.comment}</small>}
                  </td>
                  <td>
                    <Badge value={c.status} />
                  </td>
                  <td className="am-actions">
                    {["Draft", "Revision", "Rejected"].includes(
                      c.reviewStatus,
                    ) &&
                      c.status !== "Archived" && (
                        <button onClick={() => courseReview(c, "Submit")}>
                          Gửi duyệt
                        </button>
                      )}
                    {c.reviewStatus === "Pending" && (
                      <>
                        <button onClick={() => courseReview(c, "Approve")}>
                          Duyệt
                        </button>
                        <button onClick={() => courseReview(c, "Reject")}>
                          Từ chối
                        </button>
                        <button
                          onClick={() => courseReview(c, "RequestRevision")}
                        >
                          Yêu cầu sửa
                        </button>
                      </>
                    )}
                    {c.reviewStatus === "Approved" && c.status === "Draft" && (
                      <button onClick={() => courseReview(c, "Publish")}>
                        Xuất bản
                      </button>
                    )}
                    {["Published", "Active"].includes(c.status) && (
                      <button onClick={() => courseReview(c, "Unpublish")}>
                        Ẩn khóa học
                      </button>
                    )}
                    {c.status !== "Archived" && (
                      <button onClick={() => courseReview(c, "Archive")}>
                        Lưu trữ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
          {section === "classes" && (
            <>
              <Table
                heads={[
                  "Mã / Tên lớp",
                  "Khóa học",
                  "Giảng viên",
                  "Thời gian",
                  "Sĩ số",
                  "Trạng thái",
                  "Thao tác",
                ]}
                empty={!classes.length}
              >
                {classes.map((c) => (
                  <tr key={c.classId}>
                    <td>
                      <strong>{c.classCode}</strong>
                      <small>{c.name}</small>
                    </td>
                    <td>{c.courseName}</td>
                    <td>{c.teacherName ?? "Chưa phân công"}</td>
                    <td>
                      {localDay(c.startDate)} – {localDay(c.endDate)}
                    </td>
                    <td>
                      {c.students} + {c.reserved}/{c.maxStudents}
                    </td>
                    <td>
                      <Badge value={c.status} />
                    </td>
                    <td className="am-actions">
                      <button onClick={() => editClass(c)}>Sửa</button>
                      <button onClick={() => setRoster(c.classId)}>
                        Học sinh
                      </button>
                      {c.status === "Open" && (
                        <button onClick={() => place(c)}>Thêm học sinh</button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
              {roster && (
                <section>
                  <h2>
                    Học sinh ·{" "}
                    {data.classes.find((c) => c.classId === roster)?.classCode}
                  </h2>
                  <Table
                    heads={[
                      "Mã học sinh",
                      "Họ tên",
                      "Tiến độ",
                      "Trạng thái",
                      "Thao tác",
                    ]}
                    empty={!data.enrollments.some((e) => e.classId === roster)}
                  >
                    {data.enrollments
                      .filter((e) => e.classId === roster)
                      .map((e) => (
                        <tr key={e.enrollmentId}>
                          <td>{e.studentCode}</td>
                          <td>{e.studentName}</td>
                          <td>{e.progressPercent}%</td>
                          <td>
                            <Badge value={e.status} />
                          </td>
                          <td>
                            {e.status === "Active" && (
                              <button
                                onClick={() =>
                                  place(undefined, e.studentId, e.classId)
                                }
                              >
                                Chuyển lớp
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </Table>
                </section>
              )}
            </>
          )}
          {section === "teachers" && (
            <>
              <Table
                heads={[
                  "Giảng viên",
                  "Chuyên môn",
                  "Lớp phụ trách",
                  "Buổi trong khoảng xem",
                  "Giờ dạy",
                  "Có thể dạy",
                  "Thao tác",
                ]}
                empty={!teachers.length}
              >
                {teachers.map((t) => (
                  <tr key={t.teacherId}>
                    <td>
                      <strong>{t.name}</strong>
                      <small>{t.teacherCode}</small>
                    </td>
                    <td>{t.specialty ?? "Chưa cập nhật"}</td>
                    <td>{t.classes}</td>
                    <td>{t.sessions}</td>
                    <td>{(t.minutes / 60).toFixed(1)}</td>
                    <td>
                      {data.availability
                        .filter((a) => a.teacherId === t.teacherId)
                        .map((a) => (
                          <div key={a.availabilityId}>
                            {a.weekday === 7 ? "CN" : `T${a.weekday + 1}`}{" "}
                            {time(a.startsAt)}–{time(a.endsAt)}
                            {data.canManageSharedResources && (
                              <button
                                aria-label="Xóa khoảng thời gian"
                                onClick={() =>
                                  open({
                                    title: "Xóa thời gian có thể dạy",
                                    path: "teachers/availability",
                                    values: { ...a, delete: true },
                                    fields: [],
                                    actionLabel: "Xác nhận xóa",
                                  })
                                }
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      {!data.availability.some(
                        (a) => a.teacherId === t.teacherId,
                      ) && "Chưa khai báo"}
                    </td>
                    <td className="am-actions">
                      <button
                        onClick={() =>
                          setSearch({
                            tab: "timetable",
                            teacherId: String(t.teacherId),
                          })
                        }
                      >
                        Xem lịch dạy
                      </button>
                      {data.canManageSharedResources && (
                        <button
                          onClick={() =>
                            open({
                              title: `Thời gian có thể dạy · ${t.name}`,
                              path: "teachers/availability",
                              values: {
                                teacherId: t.teacherId,
                                startsAt: "08:00",
                                endsAt: "18:00",
                              },
                              fields: [
                                {
                                  name: "weekday",
                                  label: "Thứ",
                                  options: [1, 2, 3, 4, 5, 6, 7].map(
                                    (value) => ({
                                      value,
                                      label:
                                        value === 7
                                          ? "Chủ nhật"
                                          : `Thứ ${value + 1}`,
                                    }),
                                  ),
                                },
                                {
                                  name: "startsAt",
                                  label: "Từ giờ",
                                  type: "time",
                                },
                                {
                                  name: "endsAt",
                                  label: "Đến giờ",
                                  type: "time",
                                },
                              ],
                            })
                          }
                        >
                          Thêm khung giờ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
              <h2>Phân công giảng viên theo lớp</h2>
              <Table
                heads={["Lớp", "Giảng viên", "Trạng thái", "Thao tác"]}
                empty={!data.classes.length}
              >
                {data.classes.map((c) => (
                  <tr key={c.classId}>
                    <td>{c.classCode}</td>
                    <td>{c.teacherName ?? "Chưa phân công"}</td>
                    <td>
                      <Badge value={c.status} />
                    </td>
                    <td>
                      {!["Completed", "Cancelled"].includes(c.status) && (
                        <button
                          onClick={() =>
                            open({
                              title: `Phân công · ${c.classCode}`,
                              path: "teachers/assign",
                              values: {
                                classId: c.classId,
                                teacherId: c.teacherId,
                                version: c.version,
                              },
                              fields: [
                                {
                                  name: "teacherId",
                                  label: "Giảng viên phụ trách",
                                  options: teacherOptions,
                                  optional: true,
                                },
                              ],
                            })
                          }
                        >
                          {c.teacherId ? "Đổi giảng viên" : "Phân công"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </>
          )}
          {section === "timetable" && (
            <>
              <div className="am-calendar-wrap">
                <div className="am-calendar" aria-label="Lịch học">
                  {[
                    "Thứ 2",
                    "Thứ 3",
                    "Thứ 4",
                    "Thứ 5",
                    "Thứ 6",
                    "Thứ 7",
                    "Chủ nhật",
                  ].map((day) => (
                    <div key={day} className="am-calendar-heading">
                      {day}
                    </div>
                  ))}
                  {Array.from(
                    {
                      length:
                        (new Date(range.from + "T12:00:00Z").getUTCDay() + 6) %
                        7,
                    },
                    (_, index) => (
                      <div
                        key={`pad-${index}`}
                        className="am-calendar-day"
                        aria-hidden="true"
                      />
                    ),
                  )}
                  {Array.from(
                    {
                      length: Math.min(
                        94,
                        Math.round(
                          (Date.parse(range.to) - Date.parse(range.from)) /
                            86400000,
                        ) + 1,
                      ),
                    },
                    (_, index) => {
                      const date = plusDay(range.from, index);
                      return (
                        <div key={date} className="am-calendar-day">
                          <strong>
                            {date.slice(8, 10)}/{date.slice(5, 7)}
                          </strong>
                          {sessions
                            .filter((s) => s.date === date)
                            .map((s) => (
                              <button
                                key={s.sessionId}
                                className={
                                  conflicts.has(s.sessionId)
                                    ? "am-calendar-conflict"
                                    : undefined
                                }
                                disabled={s.status !== "Scheduled"}
                                onClick={() => editSession(s)}
                              >
                                <strong>
                                  {time(s.startsAt)}–{time(s.endsAt)}
                                </strong>
                                <span>{s.classCode}</span>
                                <small>
                                  {s.teacherName ?? "Chưa phân công"}
                                </small>
                                <small>
                                  {s.roomName ?? "Chưa xếp phòng"} ·{" "}
                                  {labels[s.status]}
                                </small>
                                {conflicts.has(s.sessionId) && (
                                  <small>
                                    Trùng{" "}
                                    {Array.from(
                                      conflicts.get(s.sessionId)!,
                                    ).join(", ")}
                                  </small>
                                )}
                              </button>
                            ))}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
              <p className="am-help">
                Kiểm tra khoảng giờ giao nhau cho lớp, giáo viên, phòng và học
                sinh khi lưu lịch.
              </p>
              <Table
                heads={[
                  "Ngày / Giờ",
                  "Lớp",
                  "Bài học",
                  "Giảng viên",
                  "Phòng",
                  "Trạng thái",
                  "Xung đột",
                  "Thao tác",
                ]}
                empty={!sessions.length}
              >
                {sessions.map((s) => (
                  <tr key={s.sessionId}>
                    <td>
                      <strong>{localDay(s.date)}</strong>
                      <small>
                        {time(s.startsAt)}–{time(s.endsAt)}
                      </small>
                    </td>
                    <td>{s.classCode}</td>
                    <td>
                      {s.title ?? "Chưa gắn bài học"}
                      <small>
                        Buổi #{s.sessionId}
                        {s.lessonId && ` · Bài #${s.lessonId}`}
                      </small>
                      {s.changeReason && <small>{s.changeReason}</small>}
                    </td>
                    <td>{s.teacherName ?? "Chưa phân công"}</td>
                    <td>{s.roomName ?? "Chưa xếp phòng"}</td>
                    <td>
                      <Badge value={s.status} />
                    </td>
                    <td>
                      {conflicts.has(s.sessionId) ? (
                        <span className="am-conflict">
                          {Array.from(conflicts.get(s.sessionId)!).join(" · ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="am-actions">
                      {s.status === "Scheduled" && (
                        <>
                          <button onClick={() => editSession(s)}>
                            Đổi lịch / phòng
                          </button>
                          <button
                            onClick={() =>
                              open({
                                title: `Hủy buổi học · ${s.classCode}`,
                                path: "sessions",
                                values: { ...s, cancel: true },
                                fields: [
                                  {
                                    name: "reason",
                                    label: "Lý do hủy",
                                    type: "textarea",
                                  },
                                ],
                                actionLabel: "Hủy buổi học",
                              })
                            }
                          >
                            Hủy buổi
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
              <div className="am-section-heading">
                <h2>Room Management</h2>
                {(data.canManageSharedResources ||
                  data.departments.length > 0) && (
                  <button onClick={() => editRoom()}>Thêm phòng</button>
                )}
              </div>
              <Table
                heads={["Phòng", "Sức chứa", "Trạng thái", "Thao tác"]}
                empty={!data.rooms.length}
              >
                {data.rooms.map((r) => (
                  <tr key={r.roomId}>
                    <td>{r.roomName}</td>
                    <td>{r.capacity}</td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                    <td>
                      {(data.canManageSharedResources ||
                        data.departments.some(
                          (d) => d.departmentId === r.departmentId,
                        )) && (
                        <button onClick={() => editRoom(r)}>Cập nhật</button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </>
          )}
          {section === "registrations" && (
            <>
              <p className="am-help">
                Duyệt điều kiện và chọn lớp cho học sinh. Ghi danh có hiệu lực
                khi học phí đã thanh toán hoặc khóa học miễn phí.
              </p>
              <Table
                heads={[
                  "Học sinh / Phụ huynh",
                  "Khóa học / Lớp",
                  "Điều kiện học tập",
                  "Thanh toán",
                  "Xử lý",
                  "Thao tác",
                ]}
                empty={!registrations.length}
              >
                {registrations.map((r) => (
                  <tr key={r.requestId}>
                    <td>
                      <strong>{r.studentName}</strong>
                      <small>{r.parentName}</small>
                    </td>
                    <td>
                      {r.courseName}
                      <small>{r.classCode}</small>
                    </td>
                    <td>
                      {r.gradeLevel ?? "Chưa có khối học"}
                      <small>{r.managerNote}</small>
                    </td>
                    <td>
                      <Badge value={r.paymentStatus} />
                      <small>
                        {r.tuitionVnd == null
                          ? "Học phí chưa công bố"
                          : currency.format(r.tuitionVnd)}
                      </small>
                    </td>
                    <td>
                      <Badge value={r.status} />
                      {r.enrolled && <small>Đã ghi danh</small>}
                    </td>
                    <td className="am-actions">
                      {!r.enrolled && (
                        <>
                          <button
                            onClick={() => registrationReview(r, "Approve")}
                          >
                            Duyệt / xếp lớp
                          </button>
                          <button
                            onClick={() => registrationReview(r, "RequestInfo")}
                          >
                            Yêu cầu bổ sung
                          </button>
                          <button
                            onClick={() => registrationReview(r, "Reject")}
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </>
          )}
          {section === "operations" && (
            <>
              <h2>Makeup Class Management</h2>
              <Table
                heads={[
                  "Học sinh",
                  "Lớp / Buổi vắng",
                  "Lý do",
                  "Trạng thái",
                  "Buổi học bù",
                  "Thao tác",
                ]}
                empty={!data.makeupRequests.length}
              >
                {data.makeupRequests
                  .filter((m) =>
                    matches([m.studentName, m.classCode, m.reason]),
                  )
                  .map((m) => (
                    <tr key={m.makeupId}>
                      <td>{m.studentName}</td>
                      <td>
                        {m.classCode}
                        <small>{localDay(m.absentDate)}</small>
                      </td>
                      <td>
                        {m.reason}
                        <small>{m.managerNote}</small>
                      </td>
                      <td>
                        <Badge value={m.status} />
                      </td>
                      <td>{m.sessionId ?? "Chưa xếp"}</td>
                      <td className="am-actions">
                        {m.status === "Pending" && (
                          <>
                            <button
                              onClick={() =>
                                open({
                                  title: `Duyệt và xếp buổi học bù · ${m.studentName}`,
                                  path: "makeup/review",
                                  values: {
                                    makeupId: m.makeupId,
                                    version: m.version,
                                    action: "Approve",
                                  },
                                  fields: [
                                    {
                                      name: "sessionId",
                                      label:
                                        "Buổi học bù (trong khoảng lịch đang xem)",
                                      options: options(
                                        data.sessions
                                          .filter(
                                            (s) =>
                                              s.status === "Scheduled" &&
                                              s.date >= today() &&
                                              (!m.lessonId ||
                                                s.lessonId === m.lessonId),
                                          )
                                          .map((s) => ({
                                            id: s.sessionId,
                                            name: `${s.classCode} · ${localDay(s.date)} ${time(s.startsAt)}`,
                                          })),
                                      ),
                                    },
                                    {
                                      name: "comment",
                                      label: "Ghi chú",
                                      type: "textarea",
                                      optional: true,
                                    },
                                  ],
                                })
                              }
                            >
                              Duyệt / xếp buổi
                            </button>
                            <button
                              onClick={() =>
                                open({
                                  title: "Từ chối học bù",
                                  path: "makeup/review",
                                  values: {
                                    makeupId: m.makeupId,
                                    version: m.version,
                                    action: "Reject",
                                  },
                                  fields: [
                                    {
                                      name: "comment",
                                      label: "Lý do từ chối",
                                      type: "textarea",
                                    },
                                  ],
                                })
                              }
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
              </Table>
              <div className="am-section-heading">
                <h2>STEM Equipment Management</h2>
                {(data.canManageSharedResources ||
                  data.departments.length > 0) && (
                  <button
                    className="am-primary"
                    onClick={() => editEquipment()}
                  >
                    Thêm thiết bị
                  </button>
                )}
              </div>
              {
                <>
                  <p className="am-help">
                    Giá trị còn lại được ước tính theo phương pháp đường thẳng
                    theo tháng.
                  </p>
                  <Table
                    heads={[
                      "Thiết bị",
                      "Phòng phân bổ",
                      "Tình trạng",
                      "Nguyên giá",
                      "Giá trị còn lại",
                      "Thao tác",
                    ]}
                    empty={!data.equipment.length}
                  >
                    {data.equipment
                      .filter((e) =>
                        matches([e.code, e.name, e.roomName, e.status]),
                      )
                      .map((e) => (
                        <tr key={e.equipmentId}>
                          <td>
                            <strong>{e.name}</strong>
                            <small>{e.code}</small>
                          </td>
                          <td>{e.roomName ?? "Chưa phân bổ"}</td>
                          <td>
                            <Badge value={e.status} />
                            <small>{e.note}</small>
                          </td>
                          <td>
                            {currency.format(e.costVnd)}
                            <small>
                              {localDay(e.purchaseDate)} · {e.usefulLifeMonths}{" "}
                              tháng
                            </small>
                          </td>
                          <td>{currency.format(e.bookValueVnd)}</td>
                          <td>
                            <button onClick={() => editEquipment(e)}>
                              Cập nhật
                            </button>
                          </td>
                        </tr>
                      ))}
                  </Table>
                </>
              }
            </>
          )}
        </>
      )}
      {preview && (
        <AcademicModal
          titleId="am-preview-title"
          onClose={() => setPreview(undefined)}
        >
          <div className="am-preview">
            <header>
              <h2 id="am-preview-title">{preview.name}</h2>
              <button
                autoFocus
                aria-label="Đóng chi tiết"
                onClick={() => setPreview(undefined)}
              >
                ×
              </button>
            </header>
            <p>{preview.description}</p>
            <h3>Mục tiêu đầu ra</h3>
            <p>{preview.learningObjectives ?? "Chưa thiết lập"}</p>
            <h3>Chương trình</h3>
            {preview.lessons.map((l) => (
              <section key={l.lessonId}>
                <h4>
                  Bài {l.orderNo} · {l.title} <small>#{l.lessonId}</small>
                </h4>
                <p>{l.content}</p>
                <ul>
                  {l.materials.map((m) => (
                    <li key={m.materialId}>
                      {/^https?:\/\//i.test(m.fileUrl) ? (
                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                          {m.title} · {m.materialType}
                        </a>
                      ) : (
                        m.title
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </AcademicModal>
      )}
      {editor && (
        <EditForm
          key={editor.title}
          editor={editor}
          onSave={(body) => void save(body)}
          onClose={() => setEditor(undefined)}
          busy={busy}
          error={editError}
        />
      )}
    </div>
  );
}
