import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {StudentClassDetails as ClassDetails} from '../api-client/studentOverview';
import {useStudentResource} from './useStudentResource';
import './StudentOverviewView.css';
const date=(v:string)=>new Date(v).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const labels:Record<string,string>={Active:'Đang học',Completed:'Đã hoàn thành',Cancelled:'Đã huỷ',Planned:'Chưa bắt đầu',Draft:'Đang chuẩn bị',Open:'Đang mở lớp',Ongoing:'Đang học',Scheduled:'Đã lên lịch'};
export function StudentClassDetails({classId}:{classId:number}){
 const {data,error,loading,retry}=useStudentResource<ClassDetails>(`classes/${classId}`);
 const [tab,setTab]=useState('info');const [query,setQuery]=useState('');
 if(loading)return <section className="sc-panel" role="status">Đang tải thông tin lớp…</section>;
 if(error)return <section className="sc-panel" role="alert"><p>{error}</p><button className="sc-button" onClick={retry}>Thử lại</button></section>;
 if(!data)return null;
 const materials=data.materials.filter(m=>(m.title+' '+m.lessonTitle).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
 return <section className="sc-panel sc-class-extra" aria-label={`Chi tiết lớp ${data.classCode}`}><div><p className="sc-kicker">THÔNG TIN LỚP · {data.classCode}</p><h2>{data.name}</h2></div>
  <nav aria-label="Nội dung chi tiết lớp">{[{id:'info',label:'Thông tin chung'},{id:'notices',label:`Thông báo (${data.noticeCount})`},{id:'materials',label:`Tài liệu (${data.materials.length})`}].map(t=><button className="sc-button" key={t.id} aria-pressed={tab===t.id} onClick={()=>setTab(t.id)}>{t.label}</button>)}</nav>
  {tab==='info'&&<div><dl className="sc-facts"><div><dt>Khoá học</dt><dd><Link to={`/dashboard/courses/${data.courseId}`}>{data.courseName}</Link></dd></div><div><dt>Trạng thái lớp</dt><dd>{labels[data.status]||data.status}</dd></div><div><dt>Ghi danh</dt><dd>{labels[data.enrollmentStatus]||data.enrollmentStatus} · {date(data.enrolledAt)}</dd></div><div><dt>Thời gian</dt><dd>{data.startDate?date(data.startDate):'Chưa có ngày bắt đầu'} — {data.endDate?date(data.endDate):'Chưa có ngày kết thúc'}</dd></div><div><dt>Sĩ số tối đa</dt><dd>{data.maxStudents} học sinh</dd></div><div><dt>Giáo viên</dt><dd>{data.teacherName||'Chưa phân công'}</dd></div>{data.teacherEmail&&<div><dt>Email giáo viên</dt><dd>{data.teacherEmail}</dd></div>}</dl></div>}
  {tab==='notices'&&<div><h3>Thông báo gửi đến em trong lớp</h3>{!data.notices.length?<p className="so-empty">Chưa có thông báo của lớp gửi đến em.</p>:<><p className="sc-muted">{data.noticeCount>50?'Hiển thị 50 thông báo mới nhất.':''}</p>{data.notices.map(n=><article className="sc-notice" key={n.notificationId}><p className="sc-muted">{date(n.createdAt)}{!n.isRead?' · Chưa đọc':''}</p><h3>{n.title}</h3><p>{n.body}</p></article>)}</>}</div>}
  {tab==='materials'&&<div><label>Tìm tài liệu<input type="search" placeholder="Tên tài liệu hoặc bài học" value={query} onChange={e=>setQuery(e.target.value)}/></label><p className="sc-muted">Học liệu từ các bài học đã được xếp lịch trong lớp.</p>{!materials.length?<p className="so-empty">{query?'Không tìm thấy tài liệu phù hợp.':'Giáo viên chưa chia sẻ học liệu cho lớp.'}</p>:<ul className="sc-materials">{materials.map(m=><li className="sc-material-group" key={m.materialId}><p className="sc-muted">{m.lessonTitle}</p>{/^https?:\/\//i.test(m.fileUrl)?<a href={m.fileUrl} target="_blank" rel="noopener noreferrer">{m.title} ↗</a>:<span>{m.title} · Liên kết chưa khả dụng</span>}</li>)}</ul>}</div>}
 </section>;
}
