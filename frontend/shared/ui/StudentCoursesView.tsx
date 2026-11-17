import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStudentData, requestStudent } from '../api-client/studentClasses';
import type { StudentAssignment } from '../api-client/studentClasses';
import { ProjectForm } from './StudentSessionWork';
import './StudentClassesView.css';
import './StudentCoursesView.css';
type Course = { courseId:number; courseCode:string; name:string; description:string|null; totalLessons:number; reviewedLessons:number };
type Lesson = {lessonId:number; title:string; content:string|null; orderNo:number; reviewed:boolean; materials:{materialId:number;title:string;fileUrl:string}[]};
type Work = {lessonId:number;sessionId:number;classCode:string;assignment:StudentAssignment};
type Detail = {course:Course;lessons:Lesson[];work:Work[];history:{assignmentId:number;attemptNo:number;fileName:string;feedback:string|null;reviewStatus:string}[]};
const fold=(s:string)=>s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replaceAll('đ','d');
export function StudentCoursesView() {
 const {courseId,lessonId}=useParams(); const navigate=useNavigate();
 const [courses,setCourses]=useState<Course[]>(); const [detail,setDetail]=useState<Detail>();
 const [error,setError]=useState(''); const [revision,setRevision]=useState(0);
 const [fetched,setFetched]=useState<{ courseId: string | undefined; revision: number }>();
 const loading = !fetched || fetched.courseId !== courseId || fetched.revision !== revision;
 const [query,setQuery]=useState(''); const [filter,setFilter]=useState('all'); const [saving,setSaving]=useState(false);
 useEffect(() => {
  const controller = new AbortController();
  let timer: number | undefined;
  async function load(background = false) {
   try {
    if (background && document.hidden) return;
    if (courseId) {
     const next = await getStudentData<Detail>(`courses/${courseId}`, controller.signal);
     if (!controller.signal.aborted) setDetail(next);
    } else {
     const rows = await getStudentData<Course[]>('courses', controller.signal);
     if (!controller.signal.aborted) setCourses(rows);
    }
    if (!controller.signal.aborted) setError('');
   } catch (failure) {
    if (!background && !controller.signal.aborted)
     setError(failure instanceof Error ? failure.message : 'Không tải được khoá học.');
   } finally {
    if (!controller.signal.aborted) {
     if (!background) setFetched({ courseId, revision });
     if (!courseId) timer = window.setTimeout(() => void load(true), 3500);
    }
   }
  }
  void load();
  return () => { controller.abort(); window.clearTimeout(timer); };
 }, [courseId, revision]);
 const lesson=detail?.lessons.find(l=>l.lessonId===Number(lessonId)) ?? (!lessonId?detail?.lessons[0]:undefined);
 async function reviewed(){if(!lesson||saving)return;setSaving(true);setError('');try{
  await requestStudent(`courses/${courseId}/lessons/${lesson.lessonId}/reviewed`,{method:'POST'});
  setRevision(v=>v+1);
 }catch(e){setError(e instanceof Error?e.message:'Chưa lưu được tiến độ.');}finally{setSaving(false);}}
 if(loading)return <div className="sc-panel" role="status">Đang tải chương trình học…</div>;
 if(error)return <section className="sc-panel"><h1>Chưa thể mở khoá học</h1><p role="alert">{error}</p><button className="sc-button" onClick={()=>setRevision(v=>v+1)}>Thử lại</button></section>;
 if(!courseId)return <div className="sc-page lc-page">
  <header className="lc-intro"><span className="lc-eyebrow">CHƯƠNG TRÌNH & ÔN TẬP</span><h1>Khoá học của em</h1><p>Xem lại kiến thức, thực hành và tiến bộ qua từng phản hồi của thầy cô.</p></header>
  <div className="lc-stats"><div><strong>{courses?.length??0}</strong><span>Khoá được ghi danh</span></div><div><strong>{courses?.reduce((n,c)=>n+c.reviewedLessons,0)??0}</strong><span>Bài đã xác nhận ôn tập</span></div><div><strong>Học theo nhịp của em</strong><span>Đã ôn tập khác với đạt yêu cầu</span></div></div>
  <label className="lc-search">Tìm khoá học<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên hoặc mã khoá học" /></label>
  {!courses?.length?<section className="sc-panel"><h2>Chưa có khoá học được ghi danh</h2><p>Liên hệ nhân viên học vụ để được xếp lớp. Khoá học sẽ xuất hiện khi em được ghi danh.</p></section>:<div className="lc-grid">{courses.filter(c=>fold(c.name+' '+c.courseCode).includes(fold(query))).map(c=><article className="sc-panel lc-course" key={c.courseId}><span className="lc-eyebrow">{c.courseCode}</span><h2>{c.name}</h2><p>{c.description||'Khám phá nội dung học tập và các bài thực hành của khoá.'}</p><div className="lc-progress-label"><span>Đã ôn tập</span><strong>{c.reviewedLessons}/{c.totalLessons} bài</strong></div><progress max={Math.max(c.totalLessons,1)} value={c.reviewedLessons} aria-label={`Đã ôn ${c.reviewedLessons} trên ${c.totalLessons} bài`} /><button className="sc-button sc-primary" onClick={()=>navigate(`/dashboard/courses/${c.courseId}`)}>Mở chương trình →</button></article>)}</div>}
  {!!courses?.length&&!courses.some(c=>fold(c.name+' '+c.courseCode).includes(fold(query)))&&<p>Không có khoá học khớp với từ khoá.</p>}
 </div>;
 if(!detail)return null;
 const work=detail.work.filter(w=>w.lessonId===lesson?.lessonId);
 const passed=detail.work.filter(w=>w.assignment.submission?.reviewStatus==='Passed').length;
 const pending=detail.work.filter(w=>w.assignment.submission?.reviewStatus==='Pending').length;
 const needsReview=(l:Lesson)=>detail.work.some(w=>w.lessonId===l.lessonId&&w.assignment.submission?.reviewStatus==='NeedsRevision');
 return <div className="sc-page lc-page">
  <button className="sc-button" onClick={()=>navigate('/dashboard/courses')}>← Khoá học của em</button>
  <header className="lc-intro"><span className="lc-eyebrow">{detail.course.courseCode}</span><h1>{detail.course.name}</h1><p>Học → Thực hành → Nộp bài → Nhận phản hồi → Ôn lại → Đạt yêu cầu</p></header>
  <div className="lc-stats"><div><strong>{detail.lessons.filter(l=>l.reviewed).length}/{detail.lessons.length}</strong><span>Bài đã ôn tập</span></div><div><strong>{passed}/{detail.work.length}</strong><span>Bài tập đạt yêu cầu</span></div><div><strong>{pending}</strong><span>Bài đang chờ phản hồi</span></div></div>
  <div className="lc-layout"><aside className="sc-panel lc-outline"><h2>Chương trình học</h2><label>Lọc bài học<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả bài học</option><option value="review">Cần luyện thêm</option><option value="unread">Chưa xác nhận ôn tập</option></select></label>
   {detail.lessons.filter(l=>filter==='all'||(filter==='review'?needsReview(l):!l.reviewed)).map(l=><button key={l.lessonId} aria-current={l.lessonId===lesson?.lessonId?'step':undefined} className="lc-lesson-link" onClick={()=>navigate(`/dashboard/courses/${courseId}/lessons/${l.lessonId}`)}><span>Bài {l.orderNo} · {l.title}</span><small>{needsReview(l)?'Cần luyện thêm':l.reviewed?'Đã ôn tập':'Chưa xác nhận ôn tập'}</small></button>)}
   {!detail.lessons.length&&<p>Chương trình chưa có bài học.</p>}
   {detail.lessons.length>0&&!detail.lessons.some(l=>filter==='all'||(filter==='review'?needsReview(l):!l.reviewed))&&<p>Không có bài học trong bộ lọc này.</p>}
  </aside><main className="lc-lesson-body">{lesson?<>
   <section className="sc-panel"><span className="lc-eyebrow">BÀI {lesson.orderNo}</span><h2>{lesson.title}</h2><p className="sc-lesson-content">{lesson.content||'Giáo viên chưa cập nhật nội dung bài học.'}</p><h3>Học liệu để ôn tập</h3>{lesson.materials.length?<ul className="sc-materials">{lesson.materials.map(m=><li key={m.materialId}>{/^https?:\/\//i.test(m.fileUrl)?<a href={m.fileUrl} target="_blank" rel="noopener noreferrer">{m.title} ↗</a>:<span>{m.title} — liên kết chưa khả dụng</span>}</li>)}</ul>:<p>Chưa có học liệu đính kèm.</p>}<button className="sc-button" disabled={saving} onClick={reviewed}>{saving?'Đang lưu…':lesson.reviewed?'Xác nhận đã ôn lại':'Em đã ôn nội dung này'}</button><p className="sc-muted">Tự xác nhận ôn tập không thay thế đánh giá của giáo viên.</p></section>
   <section className="sc-panel"><h2>Thực hành & phản hồi</h2>{!work.length&&<p>Chưa có bài tập được công bố cho bài học này trong các buổi học của em.</p>}{work.map(w=><div className="lc-work" key={w.assignment.assignmentId}><p className="sc-muted">Lớp {w.classCode}</p><p className="sc-lesson-content">{w.assignment.instructions}</p><ProjectForm key={`${w.assignment.assignmentId}-${w.assignment.submission?.attemptNo}-${w.assignment.submission?.reviewStatus}`} assignment={w.assignment} sessionId={w.sessionId} onSubmitted={()=>setRevision(v=>v+1)} />{detail.history.filter(h=>h.assignmentId===w.assignment.assignmentId).map(h=><details key={h.attemptNo}><summary>Lịch sử lần {h.attemptNo} · {h.fileName}</summary><p>{h.feedback}</p></details>)}</div>)}</section>
  </>:<section className="sc-panel"><p>{lessonId?'Bài học không thuộc chương trình này.':'Chưa có nội dung học tập.'}</p></section>}</main></div>
 </div>;
}
