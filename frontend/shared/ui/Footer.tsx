import { Link } from 'react-router-dom';
import { IconGraduationCap } from './Icons';
import '../public/public.css';

export function Footer({ homePath = '/landing' }: { homePath?: string }) {
  return <footer className="public-footer">
    <div className="public-container">
      <div className="public-footer-grid">
        <div>
          <Link className="public-brand" to={homePath}>
            <span className="public-brand-mark">
              <IconGraduationCap size={27} />
            </span>
            <span>
              <strong>teky</strong>
              <small>LEARNING HUB</small>
            </span>
          </Link>
          <p>Không gian học tập và sáng tạo công nghệ.<br />Cùng con khám phá, thực hành và trưởng thành.</p>
        </div>
        <div>
          <h2>Khám phá chương trình</h2>
          <Link to="/courses?category=coding">Lập trình & ứng dụng</Link>
          <Link to="/courses?category=robotics">Robotics & IoT</Link>
          <Link to="/courses?category=design">Thiết kế & sáng tạo số</Link>
          <Link to="/courses?category=ai">AI & khoa học dữ liệu</Link>
        </div>
        <div>
          <h2>Bắt đầu cùng TEKY</h2>
          <Link to="/courses?age=7-9">Chương trình cho trẻ 7–9 tuổi</Link>
          <Link to="/courses?age=10-12">Chương trình cho trẻ 10–12 tuổi</Link>
          <Link to="/courses?age=13-16">Chương trình cho trẻ 13–16 tuổi</Link>
          <Link to="/login">Đăng nhập không gian học tập</Link>
        </div>
      </div>
      <div className="public-footer-bottom">
        <span>© {new Date().getFullYear()} TEKY Learning Hub</span>
        <span>Khám phá công nghệ. Nuôi dưỡng sáng tạo.</span>
      </div>
    </div>
  </footer>;
}
