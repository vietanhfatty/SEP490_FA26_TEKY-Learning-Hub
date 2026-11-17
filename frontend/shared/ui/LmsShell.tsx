import React, { useEffect, useRef, useState } from 'react';
import type { UserRole } from '../types';
import { LmsSidebar } from './LmsSidebar';
import { getNavigationForAccount } from './lmsNavigation';
import { featureForLocation, navigationFeatures } from './navigationFeatures';
import { useAuth } from '../auth/authContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LmsHeader } from './LmsHeader';
import './lms.css';

interface LmsShellProps {
  currentRole: UserRole;
  activeNavId?: string;
  userName?: string;
  userEmail?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => Promise<void> | void;
  onSelectNav?: (id: string) => void;
  children: (activeNavId: string, onSelectNav: (id: string) => void) => React.ReactNode;
}
export const LmsShell: React.FC<LmsShellProps> = ({ currentRole, userName, userEmail, isDarkMode, onToggleTheme, onLogout, activeNavId: controlledNavId, onSelectNav, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = getNavigationForAccount(user);
  const matched = featureForLocation(items, location.pathname, location.search);
  const requested = featureForLocation(navigationFeatures, location.pathname, location.search);
  const activeNavId = matched?.navId ?? controlledNavId ?? (currentRole === 'academic_manager' ? 'kpi' : 'overview');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutDialog = useRef<HTMLDialogElement>(null);
  const activeItem = matched;
  const select = (id: string) => {
    const item = items.find(entry => entry.id === id)
      ?? items.find(entry => entry.navId === id && entry.role === currentRole)
      ?? (id === 'courses' && (currentRole === 'system_admin' || currentRole === 'academic_manager') ? items.find(entry => entry.id === 'courses.manage') : undefined);
    setMobileOpen(false);
    if (item) navigate(item.href);
    else onSelectNav?.(id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const toggle = () => { if (window.matchMedia('(max-width: 760px)').matches) setMobileOpen((open) => !open); else setCollapsed((value) => !value); };
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const changed = (event: MediaQueryListEvent) => { setMobileViewport(event.matches); if (!event.matches) setMobileOpen(false); };
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const navigation = document.getElementById('lms-navigation');
    navigation?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); document.getElementById('lms-menu-toggle')?.focus(); }
      if (event.key === 'Tab') {
        const buttons = navigation?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [mobileOpen]);
  async function confirmLogout() {
    setLoggingOut(true); setLogoutError('');
    try { await onLogout(); logoutDialog.current?.close(); }
    catch { setLogoutError('Chưa thể đăng xuất. Vui lòng thử lại.'); }
    finally { setLoggingOut(false); }
  }
  const requestLogout = () => { setLogoutError(''); setMobileOpen(false); logoutDialog.current?.showModal(); };
  if (matched?.id === 'courses.manage' && location.pathname !== '/manage/courses') return <Navigate to="/manage/courses" replace />;
  return (
    <div className={`talent-app lms-app${collapsed ? ' lms-collapsed' : ''}${isDarkMode ? ' talent-dark' : ''}`}>
      <a className="talent-skip" href="#learning-content">Skip to main content</a>
      <LmsHeader items={items} currentRole={currentRole} activeNavTitle={activeItem?.label || 'Home'} activeNavId={activeItem?.id ?? ''} onSelectNav={select} onToggleSidebarMobile={toggle} navigationExpanded={mobileViewport ? mobileOpen : !collapsed} onLogoutClick={requestLogout} isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} userName={userName} userEmail={userEmail} />
      {mobileOpen && <button className="lms-navigation-backdrop" aria-label="Close navigation" onClick={() => { setMobileOpen(false); document.getElementById('lms-menu-toggle')?.focus(); }} />}
      <LmsSidebar items={items} currentRole={currentRole} activeNavId={activeItem?.id ?? ''} onSelectNav={select} isCollapsed={collapsed} mobileOpen={mobileOpen} mobileHidden={mobileViewport && !mobileOpen} onToggleCollapse={toggle} onLogoutClick={requestLogout} isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} userName={userName} userEmail={userEmail} />
      <div className="lms-workspace">
        <main id="learning-content" className="lms-main" tabIndex={-1}>{requested && !items.some(item => item.id === requested.id)
          ? <section className="lms-access-empty" role="alert"><h1>Bạn chưa được cấp quyền sử dụng chức năng này.</h1><button onClick={() => items[0] && select(items[0].id)}>Về chức năng được cấp</button></section>
          : children(activeNavId, select)}</main>
        <footer className="lms-footer">Powered by <strong>TEKY Learning Hub</strong></footer>
      </div>
      <dialog ref={logoutDialog} className="talent-logout" aria-labelledby="logout-title" onClose={() => document.getElementById('lms-menu-toggle')?.focus()} onCancel={(event) => { if (loggingOut) event.preventDefault(); }}><h2 id="logout-title">Log out</h2><p>Bạn có thể đăng nhập lại để tiếp tục hành trình học tập.</p>{logoutError && <p role="alert">{logoutError}</p>}<div><button disabled={loggingOut} onClick={() => logoutDialog.current?.close()}>Cancel</button><button className="talent-logout-confirm" disabled={loggingOut} onClick={() => void confirmLogout()}>{loggingOut ? 'Đang đăng xuất…' : 'Log out'}</button></div></dialog>
    </div>
  );
};
