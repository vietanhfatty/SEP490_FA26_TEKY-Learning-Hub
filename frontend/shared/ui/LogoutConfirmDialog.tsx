import React, { useEffect } from 'react';
import { IconLogOut } from './Icons';

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
  userName?: string;
}

export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  userName,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="relative w-full max-w-md p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xl shadow-slate-900/20 transform transition-all animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center">
            <IconLogOut size={24} />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 id="logout-title" className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Xác nhận đăng xuất
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {userName ? (
                <>
                  Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{userName}</span>?
                </>
              ) : (
                'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống TEKY Learning Hub?'
              )}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1">
              ⚠️ Các thay đổi hoặc bài nộp chưa lưu có thể bị gián đoạn.
            </p>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Ở lại học tập
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] shadow-sm shadow-rose-500/20 transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <IconLogOut size={16} />
                <span>Đăng xuất</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

