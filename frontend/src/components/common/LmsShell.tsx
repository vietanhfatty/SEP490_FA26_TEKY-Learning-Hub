import React, { useEffect, useRef, useState } from 'react';
import type { UserRole } from '../../types';
import { LmsSidebar } from './LmsSidebar';
import { getNavItemsForRole } from '@teky/shared/ui/lmsNavigation';
import { LmsHeader } from './LmsHeader';
import '@teky/shared/ui/lms.css';

interface LmsShellProps {
  currentRole: UserRole;
  userName?: string;
  userEmail?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => Promise<void> | void;
  children: (activeNavId: string, onSelectNav: (id: string) => void) => React.ReactNode;
}
export const LmsShell: React.FC<LmsShellProps> = ({ currentRole, userName, userEmail, isDarkMode, onToggleTheme, onLogout, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [activeNavId, setActiveNavId] = useState('overview');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutDialog = useRef<HTMLDialogElement>(null);
  const items = getNavItemsForRole(currentRole);
  const activeItem = items.find((item) => item.id === activeNavId) || items[0];
  const select = (id: string) => { setActiveNavId(id); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
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
  return (
    <div className={`talent-app lms-app${collapsed ? ' lms-collapsed' : ''}${isDarkMode ? ' talent-dark' : ''}`}>
      <a className="talent-skip" href="#learning-content">Skip to main content</a>
      <LmsHeader currentRole={currentRole} activeNavTitle={activeItem?.label || 'Home'} activeNavId={activeNavId} onSelectNav={select} onToggleSidebarMobile={toggle} navigationExpanded={mobileViewport ? mobileOpen : !collapsed} onLogoutClick={requestLogout} isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} userName={userName} userEmail={userEmail} />
      {mobileOpen && <button className="lms-navigation-backdrop" aria-label="Close navigation" onClick={() => { setMobileOpen(false); document.getElementById('lms-menu-toggle')?.focus(); }} />}
      <LmsSidebar currentRole={currentRole} activeNavId={activeNavId} onSelectNav={select} isCollapsed={collapsed} mobileOpen={mobileOpen} mobileHidden={mobileViewport && !mobileOpen} onToggleCollapse={toggle} onLogoutClick={requestLogout} isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} userName={userName} userEmail={userEmail} />
      <div className="lms-workspace">
        <main id="learning-content" className="lms-main" tabIndex={-1}>{children(activeNavId, select)}</main>
        <footer className="lms-footer">Powered by <strong>TEKY Learning Hub</strong></footer>
      </div>
      <dialog ref={logoutDialog} className="talent-logout" aria-labelledby="logout-title" onClose={() => document.getElementById('lms-menu-toggle')?.focus()} onCancel={(event) => { if (loggingOut) event.preventDefault(); }}><h2 id="logout-title">Log out</h2><p>Bạn có thể đăng nhập lại để tiếp tục hành trình học tập.</p>{logoutError && <p role="alert">{logoutError}</p>}<div><button disabled={loggingOut} onClick={() => logoutDialog.current?.close()}>Cancel</button><button className="talent-logout-confirm" disabled={loggingOut} onClick={() => void confirmLogout()}>{loggingOut ? 'Đang đăng xuất…' : 'Log out'}</button></div></dialog>
    </div>
  );
};
