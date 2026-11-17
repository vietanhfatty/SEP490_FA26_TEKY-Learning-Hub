import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  archiveAdminCourse,
  changeCourseStatus,
  createAdminCourse,
  courseStatusLabels,
  courseStatuses,
  deleteAdminLesson,
  deleteAdminMaterial,
  getAdminCourse,
  getAdminCourses,
  getCourseDepartments,
  updateAdminCourse,
  upsertAdminLesson,
} from '../api-client/courses';
import type {
  AdminCourse,
  AdminCourseDetail,
  AdminLesson,
  CourseStatus,
  CourseUpsertPayload,
  LessonUpsertPayload,
} from '../api-client/courses';
import { Badge } from './Badge';
import { useAuth } from '../auth/authContext';
import { allowsPermission } from '../auth/accountAccess';
import type { BadgeVariant } from './Badge';
import { IconBookOpen, IconPlus, IconSearch, IconX } from './Icons';
import './AdminCoursesView.css';

const statusVariant: Record<CourseStatus, BadgeVariant> = {
  Draft: 'warning',
  Published: 'success',
  Active: 'info',
  Archived: 'neutral',
};

const materialTypes = ['Slide', 'Document', 'AssemblyGuide', 'Video'];

type MaterialDraft = {
  materialId?: number | null;
  materialType: string;
  title: string;
  fileUrl: string;
  isDownloadable: boolean;
  sortOrder: number;
};

type LessonDraft = {
  lessonId: number | null;
  title: string;
  content: string;
  orderNo: number;
  materials: MaterialDraft[];
};

const emptyLesson = (orderNo: number): LessonDraft => ({
  lessonId: null,
  title: '',
  content: '',
  orderNo,
  materials: [],
});

export function AdminCoursesView() {
  const { user } = useAuth();
  const isGlobal = allowsPermission(user?.access, 'course.manage');
  const [departments, setDepartments] = useState<{id: number; name: string}[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'All'>('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  const [courseDialog, setCourseDialog] = useState<{ mode: 'create' | 'edit'; course?: AdminCourse } | null>(null);
  const [courseForm, setCourseForm] = useState<CourseUpsertPayload>({ courseCode: '', name: '', description: '', levelCode: '', status: 'Draft' });
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<AdminCourseDetail | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);

  const courseDialogRef = useRef<HTMLDialogElement>(null);
  const lessonsDialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const pendingArchive = useRef<AdminCourse | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [page, availableDepartments] = await Promise.all([getAdminCourses({ take: 200 }), getCourseDepartments()]);
      setCourses(page.items);
      setDepartments(availableDepartments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getAdminCourses({ take: 200 }), getCourseDepartments()])
      .then(([page, departments]) => { if (active) { setCourses(page.items); setDepartments(departments); } })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Không thể tải danh sách khóa học.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi');
    return courses.filter((course) => {
      const matchesStatus = statusFilter === 'All' || course.status === statusFilter;
      const matchesTerm = !term
        || course.name.toLocaleLowerCase('vi').includes(term)
        || course.courseCode.toLocaleLowerCase('vi').includes(term);
      const matchesDepartment = departmentFilter === 'All' || (departmentFilter === 'Shared'
        ? course.departmentId == null : course.departmentId === Number(departmentFilter));
      return matchesStatus && matchesTerm && matchesDepartment;
    });
  }, [courses, query, statusFilter, departmentFilter]);

  const openCourseDialog = (mode: 'create' | 'edit', course?: AdminCourse) => {
    setNotice('');
    setCourseForm(mode === 'edit' && course
      ? { departmentId: course.departmentId, courseCode: course.courseCode, name: course.name, description: '', levelCode: course.levelCode ?? '', status: course.status }
      : { departmentId: isGlobal ? null : departments[0]?.id, courseCode: '', name: '', description: '', levelCode: '', status: 'Draft' });
    setCourseDialog({ mode, course });
    courseDialogRef.current?.showModal();

    // Danh sách không kèm mô tả, nên tải chi tiết để không mất nội dung khi sửa.
    if (mode === 'edit' && course) {
      void getAdminCourse(course.courseId).then(
        (loaded) => setCourseForm((form) => ({
          ...form,
          departmentId: loaded.departmentId,
          description: loaded.description ?? '',
          levelCode: loaded.levelCode ?? '',
          status: loaded.status,
        })),
        () => undefined,
      );
    }
  };

  const submitCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courseDialog) return;
    setSaving(true);
    setNotice('');
    try {
      const payload: CourseUpsertPayload = {
        departmentId: courseForm.departmentId ?? null,
        courseCode: courseForm.courseCode.trim(),
        name: courseForm.name.trim(),
        description: courseForm.description?.trim() || null,
        levelCode: courseForm.levelCode?.trim() || null,
        status: courseForm.status ?? 'Draft',
      };
      if (courseDialog.mode === 'edit' && courseDialog.course) {
        await updateAdminCourse(courseDialog.course.courseId, payload);
        setNotice(`Đã cập nhật khóa học ${payload.courseCode}.`);
      } else {
        await createAdminCourse(payload);
        setNotice(`Đã tạo khóa học ${payload.courseCode}.`);
      }
      courseDialogRef.current?.close();
      await loadCourses();
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : 'Không thể lưu khóa học.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (course: AdminCourse, status: CourseStatus) => {
    setNotice('');
    try {
      await changeCourseStatus(course.courseId, status);
      setNotice(`Khóa học ${course.courseCode} đã chuyển sang ${courseStatusLabels[status]}.`);
      await loadCourses();
    } catch (statusError) {
      setNotice(statusError instanceof Error ? statusError.message : 'Không thể đổi trạng thái khóa học.');
    }
  };

  const openLessons = async (course: AdminCourse) => {
    setNotice('');
    try {
      const loaded = await getAdminCourse(course.courseId);
      setDetail(loaded);
      setLessonDraft(null);
      lessonsDialogRef.current?.showModal();
    } catch (detailError) {
      setNotice(detailError instanceof Error ? detailError.message : 'Không thể tải chi tiết khóa học.');
    }
  };

  const updateLesson = (patch: Partial<LessonDraft>) => {
    setLessonDraft((draft) => draft ? { ...draft, ...patch } : draft);
  };

  const updateMaterial = (index: number, patch: Partial<MaterialDraft>) => {
    setLessonDraft((draft) => draft
      ? {
          ...draft,
          materials: draft.materials.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
        }
      : draft);
  };

  const saveLesson = async (event: React.FormEvent<HTMLFormElement>) => {    event.preventDefault();
    if (!detail || !lessonDraft) return;
    setSaving(true);
    setNotice('');
    try {
      const payload: LessonUpsertPayload = {
        title: lessonDraft.title.trim(),
        content: lessonDraft.content.trim() || null,
        orderNo: lessonDraft.orderNo,
        materials: lessonDraft.materials.map((material, index) => ({
          materialId: material.materialId ?? null,
          materialType: material.materialType,
          title: material.title.trim(),
          fileUrl: material.fileUrl.trim(),
          isDownloadable: material.isDownloadable,
          sortOrder: material.sortOrder ?? index,
        })),
      };
      await upsertAdminLesson(detail.courseId, lessonDraft.lessonId, payload);
      const refreshed = await getAdminCourse(detail.courseId);
      setDetail(refreshed);
      setLessonDraft(null);
      setNotice('Đã lưu bài học.');
    } catch (lessonError) {
      setNotice(lessonError instanceof Error ? lessonError.message : 'Không thể lưu bài học.');
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (lesson: AdminLesson) => {
    if (!detail) return;
    setNotice('');
    try {
      await deleteAdminLesson(detail.courseId, lesson.lessonId);
      const refreshed = await getAdminCourse(detail.courseId);
      setDetail(refreshed);
      setNotice('Đã xoá bài học.');
    } catch (lessonError) {
      setNotice(lessonError instanceof Error ? lessonError.message : 'Không thể xoá bài học.');
    }
  };

  const removeMaterial = async (lesson: AdminLesson, materialId: number) => {
    if (!detail) return;
    setNotice('');
    try {
      await deleteAdminMaterial(detail.courseId, lesson.lessonId, materialId);
      const refreshed = await getAdminCourse(detail.courseId);
      setDetail(refreshed);
      setNotice('Đã xoá học liệu.');
    } catch (materialError) {
      setNotice(materialError instanceof Error ? materialError.message : 'Không thể xoá học liệu.');
    }
  };

  const confirmArchive = () => {
    const course = pendingArchive.current;
    confirmDialogRef.current?.close();
    if (!course) return;
    void (async () => {
      setNotice('');
      try {
        await archiveAdminCourse(course.courseId);
        setNotice(`Khóa học ${course.courseCode} đã được lưu trữ.`);
        await loadCourses();
      } catch (archiveError) {
        setNotice(archiveError instanceof Error ? archiveError.message : 'Không thể lưu trữ khóa học.');
      }
    })();
  };

  return (
    <div className="admin-home">
      <div className="admin-page-heading">
        <h1>Courses</h1>
        <button className="admin-primary-button" disabled={loading || (!isGlobal && !departments.length)} onClick={() => openCourseDialog('create')}>
          <IconPlus size={18} />Add course
        </button>
      </div>

      {notice && <p role="status" className="admin-status">{notice}</p>}
      {error && <p role="alert" className="admin-error">{error}</p>}

      <div className="ac-toolbar">
        <label className="ac-filter">
          <span className="lms-sr-only">Phòng ban quản lý khóa học</span>
          <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)}>
            <option value="All">Tất cả phạm vi được cấp</option>
            {isGlobal && <option value="Shared">Danh mục chung</option>}
            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>
        <label className="admin-catalog-search">
          <IconSearch size={20} />
          <input
            type="search"
            placeholder="Search courses"
            aria-label="Search courses"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="ac-filter">
          <span className="lms-sr-only">Trạng thái khóa học</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as CourseStatus | 'All')}
          >
            <option value="All">Tất cả trạng thái</option>
            {courseStatuses.map((status) => (
              <option key={status} value={status}>{courseStatusLabels[status]}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="admin-loading">Đang tải danh sách khóa học…</p>}

      {!loading && filtered.length === 0 && (
        <div className="admin-no-stats">
          <IconBookOpen size={42} />
          <h2>No courses found</h2>
          <p>{courses.length === 0 ? 'Chưa có khóa học nào trong phạm vi được cấp.' : 'Không có khóa học khớp bộ lọc.'}</p>
          {courses.length === 0
            ? <button className="admin-primary-button" onClick={() => openCourseDialog('create')}>Tạo khóa học đầu tiên</button>
            : <button className="admin-text-button" onClick={() => { setQuery(''); setStatusFilter('All'); setDepartmentFilter('All'); }}>Xoá bộ lọc</button>}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="ac-grid">
          {filtered.map((course) => (
            <article key={course.courseId} className="admin-widget admin-catalog-card ac-card">
              <div className="ac-card-cover">
                <IconBookOpen size={30} />
                <span>{course.levelCode || 'STEAM'}</span>
              </div>
              <h2>{course.name}</h2>
              <p>{course.courseCode}</p><small>{course.departmentId == null ? 'Danh mục dùng chung' : departments.find(department => department.id === course.departmentId)?.name || 'Phòng ban phụ trách'}</small>
              <div className="ac-card-meta">
                <Badge variant={statusVariant[course.status]}>{courseStatusLabels[course.status]}</Badge>
                <span>{course.lessonCount} bài học</span>
                <span>{course.classCount} lớp</span>
              </div>
              <div className="ac-card-actions">
                <button className="admin-text-button" onClick={() => openLessons(course)}>Bài học</button>
                <button className="admin-text-button" onClick={() => openCourseDialog('edit', course)}>Sửa</button>
                <select
                  aria-label={`Đổi trạng thái khóa học ${course.courseCode}`}
                  value={course.status}
                  onChange={(event) => changeStatus(course, event.target.value as CourseStatus)}
                >
                  {courseStatuses.map((status) => (
                    <option key={status} value={status}>{courseStatusLabels[status]}</option>
                  ))}
                </select>
                <button
                  className="admin-text-button ac-danger"
                  onClick={() => {
                    pendingArchive.current = course;
                    confirmDialogRef.current?.showModal();
                  }}
                >
                  Xoá
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <dialog ref={courseDialogRef} className="admin-dialog" aria-labelledby="admin-course-dialog-title">
        <form onSubmit={submitCourse}>
          <div className="admin-dialog-title">
            <h2 id="admin-course-dialog-title">{courseDialog?.mode === 'edit' ? 'Edit course' : 'Add course'}</h2>
            <button type="button" className="lms-icon-button" aria-label="Close" onClick={() => courseDialogRef.current?.close()}>
              <IconX size={20} />
            </button>
          </div>
          <p>Trạng thái vòng đời: Bản nháp → Đã xuất bản → Đã lưu trữ.</p>
          <label>
            Phòng ban phụ trách
            <select required={!isGlobal} value={courseForm.departmentId ?? ''} disabled={saving}
              onChange={event => setCourseForm(form => ({...form, departmentId: event.target.value ? Number(event.target.value) : null}))}>
              {isGlobal ? <option value="">Danh mục dùng chung</option> : <option value="" disabled>Chọn phòng ban</option>}
              {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label>
            Course code
            <input
              name="courseCode"
              required
              minLength={3}
              maxLength={20}
              value={courseForm.courseCode}
              onChange={(event) => setCourseForm((form) => ({ ...form, courseCode: event.target.value }))}
            />
          </label>
          <label>
            Course name
            <input
              name="name"
              required
              maxLength={200}
              value={courseForm.name}
              onChange={(event) => setCourseForm((form) => ({ ...form, name: event.target.value }))}
            />
          </label>
          <label>
            Level
            <input
              name="levelCode"
              maxLength={30}
              placeholder="Sơ cấp / Trung cấp / Nâng cao"
              value={courseForm.levelCode ?? ''}
              onChange={(event) => setCourseForm((form) => ({ ...form, levelCode: event.target.value }))}
            />
          </label>
          <label>
            Status
            <select
              name="status"
              value={courseForm.status ?? 'Draft'}
              onChange={(event) => setCourseForm((form) => ({ ...form, status: event.target.value as CourseStatus }))}
            >
              {courseStatuses.map((status) => (
                <option key={status} value={status}>{courseStatusLabels[status]}</option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={3}
              value={courseForm.description ?? ''}
              onChange={(event) => setCourseForm((form) => ({ ...form, description: event.target.value }))}
            />
          </label>
          <div className="admin-dialog-actions">
            <button type="button" className="admin-outline-button" onClick={() => courseDialogRef.current?.close()}>Cancel</button>
            <button type="submit" className="admin-primary-button" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Save'}
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={lessonsDialogRef} className="admin-dialog ac-dialog-wide" aria-labelledby="admin-lessons-dialog-title">
        <div className="admin-dialog-title">
          <h2 id="admin-lessons-dialog-title">Bài học · {detail?.courseCode}</h2>
          <button type="button" className="lms-icon-button" aria-label="Close" onClick={() => lessonsDialogRef.current?.close()}>
            <IconX size={20} />
          </button>
        </div>
        {notice && <p role="status" className="admin-status">{notice}</p>}

        {!lessonDraft && (
          <>
            <button
              className="admin-primary-button"
              onClick={() => setLessonDraft(emptyLesson((detail?.lessons.length ?? 0) + 1))}
            >
              <IconPlus size={18} />Thêm bài học
            </button>
            <ul className="ac-lesson-list">
              {(detail?.lessons ?? []).map((lesson) => (
                <li key={lesson.lessonId}>
                  <div>
                    <strong>{lesson.orderNo}. {lesson.title}</strong>
                    <small>{lesson.materials.length} học liệu</small>
                  </div>
                  <div className="ac-lesson-actions">
                    <button className="admin-text-button" onClick={() => setLessonDraft({
                      lessonId: lesson.lessonId,
                      title: lesson.title,
                      content: lesson.content ?? '',
                      orderNo: lesson.orderNo,
                      materials: lesson.materials.map((material) => ({ ...material })),
                    })}>Sửa</button>
                    <button className="admin-text-button ac-danger" onClick={() => removeLesson(lesson)}>Xoá</button>
                  </div>
                  {lesson.materials.length > 0 && (
                    <ul className="ac-material-list">
                      {lesson.materials.map((material) => (
                        <li key={material.materialId}>
                          <span>{material.title} · {material.materialType}</span>
                          <button
                            className="admin-text-button ac-danger"
                            onClick={() => removeMaterial(lesson, material.materialId)}
                          >
                            Xoá
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {(detail?.lessons.length ?? 0) === 0 && <p className="admin-muted">Khóa học chưa có bài học nào.</p>}
          </>
        )}

        {lessonDraft && (
          <form onSubmit={saveLesson}>
            <label>
              Tiêu đề bài học
              <input
                required
                maxLength={200}
                value={lessonDraft.title}
                onChange={(event) => updateLesson({ title: event.target.value })}
              />
            </label>
            <label>
              Thứ tự
              <input
                type="number"
                min={0}
                max={1000}
                value={lessonDraft.orderNo}
                onChange={(event) => updateLesson({ orderNo: Number(event.target.value) })}
              />
            </label>
            <label>
              Nội dung
              <textarea
                rows={3}
                value={lessonDraft.content}
                onChange={(event) => updateLesson({ content: event.target.value })}
              />
            </label>

            <h3 className="ac-subheading">Học liệu</h3>
            <ul className="ac-material-editor">
              {lessonDraft.materials.map((material, index) => (
                <li key={material.materialId ?? `new-${index}`}>
                  <select
                    aria-label="Loại học liệu"
                    value={material.materialType}
                    onChange={(event) => updateMaterial(index, { materialType: event.target.value })}
                  >
                    {materialTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <input
                    aria-label="Tên học liệu"
                    required
                    maxLength={200}
                    value={material.title}
                    onChange={(event) => updateMaterial(index, { title: event.target.value })}
                  />
                  <input
                    aria-label="Đường dẫn tệp"
                    required
                    maxLength={500}
                    value={material.fileUrl}
                    onChange={(event) => updateMaterial(index, { fileUrl: event.target.value })}
                  />
                  <button
                    type="button"
                    className="admin-text-button ac-danger"
                    onClick={() => setLessonDraft((draft) => draft
                      ? { ...draft, materials: draft.materials.filter((_, itemIndex) => itemIndex !== index) }
                      : draft)}
                  >
                    Bỏ
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="admin-outline-button"
              onClick={() => setLessonDraft((draft) => draft
                ? {
                    ...draft,
                    materials: [...draft.materials, {
                      materialId: null,
                      materialType: 'Document',
                      title: '',
                      fileUrl: '',
                      isDownloadable: true,
                      sortOrder: draft.materials.length,
                    }],
                  }
                : draft)}
            >
              <IconPlus size={16} />Thêm học liệu
            </button>

            <div className="admin-dialog-actions">
              <button type="button" className="admin-outline-button" onClick={() => setLessonDraft(null)}>Huỷ</button>
              <button type="submit" className="admin-primary-button" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu bài học'}
              </button>
            </div>
          </form>
        )}
      </dialog>

      <dialog ref={confirmDialogRef} className="admin-dialog" aria-labelledby="admin-archive-dialog-title">
        <div className="admin-dialog-title">
          <h2 id="admin-archive-dialog-title">Lưu trữ khóa học</h2>
          <button type="button" className="lms-icon-button" aria-label="Close" onClick={() => confirmDialogRef.current?.close()}>
            <IconX size={20} />
          </button>
        </div>
        <p>Khóa học sẽ chuyển sang trạng thái Đã lưu trữ và bài học được ẩn đi. Lịch sử lớp học, bài tập và điểm số vẫn được giữ nguyên.</p>
        <div className="admin-dialog-actions">
          <button type="button" className="admin-outline-button" onClick={() => confirmDialogRef.current?.close()}>Huỷ</button>
          <button type="button" className="admin-primary-button" onClick={confirmArchive}>Xác nhận</button>
        </div>
      </dialog>
    </div>
  );
}
