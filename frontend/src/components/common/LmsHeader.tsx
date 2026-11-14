import React, { useEffect, useRef, useState } from 'react';
import type { UserRole } from '../../types';
import { IconMenu, IconSearch, IconBell, IconUser, IconGraduationCap, IconSun, IconMoon, IconLogOut } from './Icons';
import { getNavItemsForRole, ROLE_DISPLAY_CONFIG } from '@teky/shared/ui/lmsNavigation';

interface LmsHeaderProps {
  currentRole: UserRole;
  activeNavTitle: string;
  onToggleSidebarMobile: () => void;
  onLogoutClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userName?: string;
  userEmail?: string;
  activeNavId?: string;
  onSelectNav?: (id: string) => void;
  navigationExpanded?: boolean;
}
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const roleNames: Record<UserRole, string> = { student: 'Learner', parent: 'Parent', teacher: 'Instructor', staff: 'Academic staff', academic_manager: 'Academic manager', admin: 'Administrator' };

export const LmsHeader: React.FC<LmsHeaderProps> = ({ currentRole, activeNavTitle, activeNavId = 'overview', onToggleSidebarMobile, onLogoutClick, isDarkMode, onToggleTheme, userName, userEmail, onSelectNav, navigationExpanded }) => {
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<'profile' | 'notifications' | null>(null);
  const header = useRef<HTMLElement>(null);
  const name = userName || ROLE_DISPLAY_CONFIG[currentRole].defaultName;
  const items = getNavItemsForRole(currentRole);
  const matches = items.filter((item) => normalize(item.label).includes(normalize(query.trim())));
  useEffect(() => {
    const previous = document.title;
    document.title = `TEKY | ${activeNavTitle}`;
    return () => { document.title = previous; };
  }, [activeNavTitle]);
  useEffect(() => {
    const pointer = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) { setOpenMenu(null); setQuery(''); } };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpenMenu(null); setQuery(''); } };
    document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', escape); };
  }, []);
  const select = (id: string) => { onSelectNav?.(id); setQuery(''); setOpenMenu(null); };
  return (
    <header className="lms-header" ref={header}>
      <div className="lms-header-brand">
        <button id="lms-menu-toggle" className="lms-icon-button" aria-label="Toggle navigation" aria-controls="lms-navigation" aria-expanded={navigationExpanded} onClick={onToggleSidebarMobile}><IconMenu size={22} /></button>
        <button className="lms-brand" aria-label="TEKY Learning Hub — Home" onClick={() => select(items[0]?.id || 'overview')}><span><IconGraduationCap size={30} /></span><strong>teky<span> learning hub</span></strong></button>
      </div>
      <form className="lms-header-search" role="search" onSubmit={(event) => { event.preventDefault(); if (query.trim() && matches[0]) select(matches[0].id); }}>
        <input aria-label="Search navigation" placeholder="Search" value={query} onChange={(event) => { setQuery(event.target.value); setOpenMenu(null); }} />
        <button className="lms-icon-button" type="submit" aria-label="Search"><IconSearch size={23} /></button>
        {query.trim() && <div className="lms-menu lms-search-results">{matches.length ? matches.map((item) => <button key={item.id} type="button" onClick={() => select(item.id)}><item.icon size={19} />{item.label}</button>) : <p>Không tìm thấy chức năng phù hợp.</p>}</div>}
      </form>
      <div className="lms-header-actions">
        <span className="lms-academy-label">STEAM Academy</span>
        <button className="lms-icon-button lms-theme-button" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onToggleTheme}>{isDarkMode ? <IconSun size={21} /> : <IconMoon size={21} />}</button>
        <div className="lms-header-dropdown">
          <button className="lms-icon-button" aria-label="Notifications" aria-expanded={openMenu === 'notifications'} onClick={() => { setQuery(''); setOpenMenu(openMenu === 'notifications' ? null : 'notifications'); }}><IconBell size={22} /></button>
          {openMenu === 'notifications' && <section className="lms-menu lms-notification-menu"><h2>Notifications</h2><IconBell size={28} /><p>Chưa có dữ liệu thông báo.</p><small>Các cập nhật học tập sẽ xuất hiện khi dịch vụ thông báo được kết nối.</small></section>}
        </div>
        <div className="lms-header-dropdown">
          <button className="lms-profile" aria-label={`Account: ${name}`} aria-expanded={openMenu === 'profile'} onClick={() => { setQuery(''); setOpenMenu(openMenu === 'profile' ? null : 'profile'); }}><span><strong>{name}</strong><small>{roleNames[currentRole]}</small></span><span className="lms-profile-avatar"><IconUser size={31} /></span></button>
          {openMenu === 'profile' && <section className="lms-menu lms-account-menu"><h2>{name}</h2>{userEmail && <p>{userEmail}</p>}
            <button onClick={onToggleTheme}>{isDarkMode ? <IconSun size={18} /> : <IconMoon size={18} />}Appearance</button>
            {currentRole === 'admin' && <button onClick={() => select('settings')}><IconUser size={18} />Account &amp; Settings</button>}
            <button onClick={() => { setOpenMenu(null); onLogoutClick(); }}><IconLogOut size={18} />Log out</button>
            <span className="lms-sr-only">Current page: {activeNavId}</span>
          </section>}
        </div>
      </div>
    </header>
  );
};
