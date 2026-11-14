import { Link } from 'react-router-dom';
import { IconArrowRight, IconBookOpen, IconCode, IconCpu, IconGraduationCap, IconSparkles } from '../ui/Icons';
import type { PublicCourse } from './courseCatalog';
import { categoryName } from './courseCatalog';

export function CourseArtwork({ course, large = false }: { course: PublicCourse; large?: boolean }) {
  const Icon = { coding: IconCode, robotics: IconCpu, design: IconSparkles, ai: IconGraduationCap }[course.category];
  return <div className={`public-course-art art-${course.category}${large ? ' art-large' : ''}`} aria-hidden="true">
    <span className="art-series">TEKY / {course.category === 'coding' ? 'CODE LAB' : course.category === 'robotics' ? 'ROBOTICS LAB' : course.category === 'design' ? 'DESIGN STUDIO' : 'AI EXPLORER'}</span>
    <div className="art-object">
      <Icon size={large ? 92 : 64} strokeWidth={1.3} />
    </div>
    <span className="art-caption">{course.category === 'coding' ? '< tạo điều con nghĩ />' : course.category === 'robotics' ? 'LẮP RÁP. LẬP TRÌNH. KHÁM PHÁ.' : course.category === 'design' ? 'MỘT THẾ GIỚI DO CON SÁNG TẠO' : 'HIỂU HÔM NAY. TẠO NGÀY MAI.'}</span>
  </div>;
}

export function CourseCard({ course }: { course: PublicCourse }) {
  return <article className="public-course-card">
    <Link to={`/courses/${course.id}`} className="public-course-image-link" tabIndex={-1} aria-hidden="true">
      <CourseArtwork course={course} />
    </Link>
    <div className="public-course-body">
      <span className="public-eyebrow">{categoryName(course.category)}</span>
      <h3>
        <Link to={`/courses/${course.id}`}>{course.title}</Link>
      </h3>
      <p>{course.description}</p>
      <div className="public-course-meta">
        <span>{course.ageMin}–{course.ageMax} tuổi</span>
        <span>{course.level}</span>
      </div>
      <div className="public-course-bottom">
        <span>
          <IconBookOpen size={16} />{course.format}</span>
        <Link to={`/courses/${course.id}`} aria-label={`Xem khóa học ${course.title}`}>
          <IconArrowRight size={21} />
        </Link>
      </div>
    </div>
  </article>;
}
