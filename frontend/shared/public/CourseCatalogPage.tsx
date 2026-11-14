import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { IconArrowRight, IconBookOpen, IconCheckCircle, IconChevronRight, IconGrid, IconMenu, IconSearch } from '../ui/Icons';
import { CourseArtwork, CourseCard } from './CourseCard';
import { categoryName, courseCategories, normalizeSearch, publicCourses } from './courseCatalog';
import './public.css';

export function CourseCatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = params.get('q') || '';
  const category = params.get('category') || 'all';
  const age = params.get('age') || 'all';
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  const sort = params.get('sort') || 'featured';
  const update = (key: string, value: string) => {
    setParams(previous => { const next = new URLSearchParams(previous); if (!value || value === 'all' || value === 'featured' || value === 'grid') next.delete(key); else next.set(key, value); return next; }, { replace: true });
  };
  const courses = publicCourses.filter(course => {
    const searchable = normalizeSearch(`${course.title} ${course.description} ${categoryName(course.category)} ${course.skills.join(' ')}`);
    const [min, max] = age.split('-').map(Number);
    return (category === 'all' || course.category === category) &&
      (age === 'all' || (course.ageMin <= max && course.ageMax >= min)) && searchable.includes(normalizeSearch(query));
  }).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'vi') : sort === 'age' ? a.ageMin - b.ageMin : publicCourses.indexOf(a) - publicCourses.indexOf(b));
  const hasFilters = !!query || category !== 'all' || age !== 'all';
  useEffect(() => { document.title = 'Khóa học STEAM | TEKY Learning Hub'; }, []);
  return <div className="public-container public-catalog">
    <div className="public-breadcrumb">
      <Link to="/landing">Trang chủ</Link>
      <IconChevronRight size={14} />
      <span>Khóa học STEAM</span>
    </div>
    <header className="public-page-heading">
      <div>
        <span className="public-eyebrow">KHÁM PHÁ. THỰC HÀNH. SÁNG TẠO.</span>
        <h1>Khóa học STEAM</h1>
        <p>Mỗi sở thích là điểm bắt đầu của một hành trình mới.<br />Tìm chương trình phù hợp với độ tuổi và niềm yêu thích của con.</p>
      </div>
      <span className="public-catalog-count">
        <strong>{publicCourses.length.toString().padStart(2, '0')}</strong> chương trình khám phá</span>
    </header>
    <div className="public-catalog-layout">
      <aside className={`public-filters${filtersOpen ? ' is-open' : ''}`} aria-label="Bộ lọc khóa học">
        <div className="public-filter-title">
          <h2>Lọc khóa học</h2>
          <button className="public-filter-toggle" aria-expanded={filtersOpen} aria-controls="public-category-filter public-age-filter" onClick={() => setFiltersOpen(previous => !previous)}>Lọc khóa học{hasFilters ? ' · đang áp dụng' : ''}<IconChevronRight size={18} />
          </button>{hasFilters && <button onClick={() => setParams({})}>Đặt lại</button>}</div>
        <fieldset id="public-category-filter">
          <legend>Lĩnh vực</legend>{[{ id: 'all', name: 'Tất cả lĩnh vực' }, ...courseCategories].map(item => <label key={item.id} className={category === item.id ? 'is-selected' : ''}>
            <input type="radio" name="category" checked={category === item.id} onChange={() => update('category', item.id)} />
            <span>{item.name}</span>
            <small>{item.id === 'all' ? publicCourses.length : publicCourses.filter(course => course.category === item.id).length}</small>
          </label>)}</fieldset>
        <fieldset id="public-age-filter">
          <legend>Độ tuổi</legend>{[['all', 'Tất cả độ tuổi'], ['7-9', '7–9 tuổi'], ['10-12', '10–12 tuổi'], ['13-16', '13–16 tuổi']].map(([value, label]) => <label key={value}>
            <input type="radio" name="age" checked={age === value} onChange={() => update('age', value)} />
            <span>{label}</span>
          </label>)}</fieldset>
        <div className="public-filter-note">
          <IconBookOpen size={24} />
          <h3>Chưa biết bắt đầu từ đâu?</h3>
          <p>Chọn độ tuổi của con, rồi khám phá chương trình con yêu thích.</p>
          <Link to="/landing">Tìm hiểu cách học <IconArrowRight size={16} />
          </Link>
        </div>
      </aside>
      <section className="public-catalog-results" aria-label="Danh sách khóa học">
        <div className="public-catalog-toolbar">
          <div className="public-search">
            <IconSearch size={21} />
            <input aria-label="Tìm khóa học" placeholder="Tìm tên khóa học, kỹ năng…" type="search" value={query} onChange={event => update('q', event.target.value)} />
          </div>
          <label className="public-sort">
            <span className="public-sr-only">Sắp xếp khóa học</span>
            <select value={sort} onChange={event => update('sort', event.target.value)}>
              <option value="featured">Đề xuất</option>
              <option value="name">Tên A–Z</option>
              <option value="age">Độ tuổi tăng dần</option>
            </select>
          </label>
        </div>
        <div className="public-results-heading">
          <p role="status" aria-live="polite">
            <strong>{courses.length}</strong> khóa học{query && <> cho “{query}”</>}</p>
          <div className="public-view-controls" role="group" aria-label="Cách hiển thị">
            <button aria-label="Xem dạng lưới" aria-pressed={view === 'grid'} onClick={() => update('view', 'grid')}>
              <IconGrid size={19} />
            </button>
            <button aria-label="Xem dạng danh sách" aria-pressed={view === 'list'} onClick={() => update('view', 'list')}>
              <IconMenu size={19} />
            </button>
          </div>
        </div>
        {courses.length ? <div className={`public-course-grid ${view === 'list' ? 'public-course-list' : ''}`}>{courses.map(course => <CourseCard key={course.id} course={course} />)}</div> : <div className="public-empty">
          <IconSearch size={40} />
          <h2>Chưa tìm thấy khóa học phù hợp</h2>
          <p>Thử từ khóa khác hoặc bỏ bớt bộ lọc để khám phá thêm chương trình.</p>
          <button className="public-button primary" onClick={() => setParams({})}>Xem tất cả khóa học</button>
        </div>}
        <p className="public-catalog-disclaimer">Danh mục giới thiệu chương trình. Nội dung, hình thức tổ chức và lịch khai giảng được xác nhận theo từng lớp.</p>
      </section>
    </div>
  </div>;
}

export function CourseDetailPage({ isLoggedIn, onAccessLearning }: { isLoggedIn: boolean; onAccessLearning: () => void }) {
  const { courseId } = useParams();
  const course = publicCourses.find(item => item.id === courseId);
  useEffect(() => { document.title = `${course?.title || 'Không tìm thấy khóa học'} | TEKY Learning Hub`; }, [course]);
  if (!course) return <div className="public-container public-empty">
    <IconBookOpen size={44} />
    <h1>Không tìm thấy khóa học</h1>
    <p>Chương trình này không có trong danh mục hiện tại.</p>
    <Link className="public-button primary" to="/courses">Về danh mục khóa học</Link>
  </div>;
  return <div className="public-container public-detail">
    <nav className="public-breadcrumb" aria-label="Đường dẫn">
      <Link to="/courses">Khóa học STEAM</Link>
      <IconChevronRight size={14} />
      <span>{course.title}</span>
    </nav>
    <div className="public-detail-grid">
      <div>
        <span className="public-eyebrow">{categoryName(course.category)}</span>
        <h1>{course.title}</h1>
        <p className="public-detail-description">{course.description}</p>
        <div className="public-detail-tags">
          <span>{course.ageMin}–{course.ageMax} tuổi</span>
          <span>{course.level}</span>
          <span>{course.format}</span>
        </div>
        <section className="public-detail-section">
          <h2>Con sẽ tạo được gì?</h2>
          <p>{course.outcome}</p>
        </section>
        <section className="public-detail-section">
          <h2>Hành trình khám phá</h2>
          <ol className="public-topic-list">{course.topics.map((topic, index) => <li key={topic}>
            <span>{String(index + 1).padStart(2, '0')}</span>{topic}</li>)}</ol>
        </section>
        <section className="public-detail-section">
          <h2>Kỹ năng con rèn luyện</h2>
          <ul className="public-skills">{course.skills.map(skill => <li key={skill}>
            <IconCheckCircle size={19} />{skill}</li>)}</ul>
        </section>
      </div>
      <aside className="public-detail-aside">
        <CourseArtwork course={course} large />
        <div className="public-detail-access">
          <h2>Bắt đầu hành trình của con</h2>
          <p>{isLoggedIn ? 'Mở không gian học tập để xem các lớp đã được ghi danh.' : 'Đã có tài khoản TEKY? Đăng nhập để xem lớp học và lộ trình được ghi danh.'}</p>
          <button className="public-button primary" onClick={onAccessLearning}>{isLoggedIn ? 'Vào không gian học tập' : 'Đăng nhập để học'}<IconArrowRight size={18} />
          </button>
          <small>Quyền truy cập bài học được cấp theo tài khoản và lớp học.</small>
        </div>
      </aside>
    </div>
    <section className="public-section">
      <div className="public-section-heading">
        <div>
          <span className="public-eyebrow">TIẾP TỤC KHÁM PHÁ</span>
          <h2>Có thể con cũng thích</h2>
        </div>
        <Link className="public-text-link" to="/courses">Tất cả khóa học<IconArrowRight size={18} />
        </Link>
      </div>
      <div className="public-course-grid public-featured-grid">{publicCourses.filter(item => item.id !== course.id && item.category === course.category).concat(publicCourses.filter(item => item.category !== course.category)).slice(0, 3).map(item => <CourseCard course={item} key={item.id} />)}</div>
    </section>
  </div>;
}
