import React, { useState } from 'react';
import type { UserRole } from '../types';
import { LmsSidebar, getNavItemsForRole } from './LmsSidebar';
import { LmsHeader } from './LmsHeader';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';

interface LmsShellProps {
  currentRole: UserRole;
  userName?: string;
  userEmail?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => Promise<void> | void;
  onRoleChange?: (role: UserRole) => void;
  children: (activeNavId: string) => React.ReactNode;
}

export const LmsShell: React.FC<LmsShellProps> = ({
  currentRole,
  userName,
  userEmail,
  isDarkMode,
  onToggleTheme,
  onLogout,
  onRoleChange,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState('overview');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = getNavItemsForRole(currentRole);
  const activeNavItem = navItems.find((item) => item.id === activeNavId) || navItems[0];

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await onLogout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  const handleRoleChangeWithReset = (newRole: UserRole) => {
    setActiveNavId('overview');
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* 1. Desktop & Mobile Responsive LMS Sidebar */}
      <div className={`hidden lg:block ${isSidebarCollapsed ? 'w-20' : 'w-72'} flex-shrink-0 transition-all duration-200`}>
        <LmsSidebar
          currentRole={currentRole}
          activeNavId={activeNavId}
          onSelectNav={setActiveNavId}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
          onRoleChange={handleRoleChangeWithReset}
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          userName={userName}
          userEmail={userEmail}
        />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 w-72 h-full bg-white dark:bg-slate-900 shadow-2xl">
            <LmsSidebar
              currentRole={currentRole}
              activeNavId={activeNavId}
              onSelectNav={(id) => {
                setActiveNavId(id);
                setIsMobileSidebarOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              onLogoutClick={() => {
                setIsMobileSidebarOpen(false);
                setIsLogoutModalOpen(true);
              }}
              onRoleChange={(r) => {
                handleRoleChangeWithReset(r);
                setIsMobileSidebarOpen(false);
              }}
              isDarkMode={isDarkMode}
              onToggleTheme={onToggleTheme}
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </div>
      )}

      {/* 2. Main Workspace Body (Header + Content + Footer) */}
      <div className="flex-1 flex flex-col min-w-0">
        <LmsHeader
          currentRole={currentRole}
          activeNavTitle={activeNavItem?.label || 'Tổng quan'}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          userName={userName}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children(activeNavId)}
        </main>
      </div>

      {/* 3. Secure Accessible Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
        userName={userName}
      />
    </div>
  );
};

