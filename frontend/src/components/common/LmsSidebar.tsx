import type React from 'react';
import type { UserRole } from '../../types';
import { IconLayers, IconLogOut, IconX } from './Icons';
import { getNavItemsForRole } from '@teky/shared/ui/lmsNavigation';

interface LmsSidebarProps {
  currentRole: UserRole;
  activeNavId: string;
  onSelectNav: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogoutClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userName?: string;
  userEmail?: string;
  mobileOpen?: boolean;
  mobileHidden?: boolean;
}

export const LmsSidebar: React.FC<LmsSidebarProps> = ({ currentRole, activeNavId, onSelectNav, isCollapsed, onToggleCollapse, onLogoutClick, mobileOpen = false, mobileHidden = false }) => {
  const navItems = getNavItemsForRole(currentRole);
  return (
    <aside inert={mobileHidden || undefined} aria-hidden={mobileHidden || undefined} id="lms-navigation" className={`lms-sidebar${isCollapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label="Main navigation">
      <nav aria-label="Main navigation">
        {navItems.map((item) => <button className="lms-sidebar-item" key={item.id} aria-label={item.label} aria-current={activeNavId === item.id || (activeNavId === 'overview' && item.id === 'kpi') ? 'page' : undefined} title={isCollapsed ? item.label : undefined} onClick={() => onSelectNav(item.id)}><item.icon size={23} /><span>{item.label}</span></button>)}
      </nav>
      <div className="lms-sidebar-bottom">
        <button className="lms-sidebar-item" title={mobileOpen ? 'Close navigation' : isCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={mobileOpen ? 'Close navigation' : isCollapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={onToggleCollapse}>{mobileOpen ? <IconX size={22} /> : <IconLayers size={22} />}<span>{mobileOpen ? 'Close navigation' : 'Collapse navigation'}</span></button>
        <button className="lms-sidebar-item" title={isCollapsed ? 'Log out' : undefined} aria-label="Log out" onClick={onLogoutClick}><IconLogOut size={21} /><span>Log out</span></button>
        <div className="lms-sidebar-caption">TEKY Learning Hub</div>
      </div>
    </aside>
  );
};
