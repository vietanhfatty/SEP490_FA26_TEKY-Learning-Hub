import { Link } from 'react-router-dom';
import type { UserRole } from '../types';
import { IconArrowRight, IconGraduationCap, IconLogOut, IconMoon, IconSun } from './Icons';
import '../public/public.css';

interface NavbarProps {
  currentView: string; onNavigate: (view: string) => void; currentRole: UserRole | null;
  userName?: string; isDarkMode: boolean; onToggleTheme: () => void; isLoggedIn: boolean;
  onLogout: () => void; homePath?: string;
}
export function Navbar({ currentView, onNavigate, currentRole, userName, isDarkMode, onToggleTheme, isLoggedIn, onLogout, homePath = '/landing' }: NavbarProps) {
  const isHome = currentView === '/' || currentView === '/landing' || currentView === 'home';
  const isCourses = currentView.startsWith('/courses');
  return <header className="public-header">
    <a href="#public-content" className="public-skip">Đi đến nội dung chính</a>
    <div className="public-header-inner">
      <Link className="public-brand" to={homePath} aria-label="TEKY Learning Hub — Trang chủ">
        <span className="public-brand-mark">
          <IconGraduationCap size={30} />
        </span>
        <span>
          <strong>teky</strong>
          <small>LEARNING HUB</small>
        </span>
      </Link>
      <nav className="public-navigation" aria-label="Điều hướng chính">
        <Link to={homePath} aria-current={isHome ? 'page' : undefined}>Trang chủ</Link>
        <Link to="/courses" aria-current={isCourses ? 'page' : undefined}>Khóa học STEAM</Link>
      </nav>
      <div className="public-header-actions">
        <button className="public-icon-button" onClick={onToggleTheme} aria-label={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} aria-pressed={isDarkMode}>{isDarkMode ? <IconSun size={21} /> : <IconMoon size={21} />}</button>{isLoggedIn && currentRole ? <>
          <button className="public-button primary public-account-button" onClick={() => onNavigate('dashboard')} title={userName}>Vào học<IconArrowRight size={17} />
          </button>
          <button className="public-icon-button" onClick={onLogout} aria-label="Đăng xuất">
            <IconLogOut size={20} />
          </button>
        </> : <Link className="public-button primary" to="/login">Đăng nhập<IconArrowRight size={17} />
        </Link>}</div>
    </div>
  </header>;
}
