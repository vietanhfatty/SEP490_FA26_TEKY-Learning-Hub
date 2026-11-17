import React from 'react';
import { IconShieldCheck, IconArrowRight } from './Icons';

interface ForbiddenProps {
  /** Vai trò hiện tại (nếu đã biết) để hiển thị thông tin phân quyền. */
  currentRoleLabel?: string;
  /** Nhãn của Shell đúng mà người dùng nên tới. */
  targetShellLabel?: string;
  /** Callback khi người dùng chọn "Về đúng trang của tôi". */
  onRedirect?: () => void;
}

/**
 * Trang 403 - Truy cập bị từ chối do không đủ quyền hạn.
 * Tuân thủ archetype Staff: nền tối, chữ tương phản cao, tabular-nums cho mã lỗi.
 */
export const Forbidden: React.FC<ForbiddenProps> = ({
  currentRoleLabel,
  targetShellLabel,
  onRedirect,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5">
          <IconShieldCheck size={32} />
        </div>

        <p className="text-xs font-semibold tracking-widest text-rose-600 dark:text-rose-400 uppercase tabular-nums">
          Error 403
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
          Không đủ quyền hạn truy cập
        </h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Vai trò của bạn không được phép mở khu vực này. Vui lòng liên hệ quản trị viên nếu cần bổ sung quyền.
        </p>

        {(currentRoleLabel || targetShellLabel) && (
          <dl className="mt-6 grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 text-left">
            <div className="bg-white dark:bg-slate-800 px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Vai trò hiện tại
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                {currentRoleLabel ?? 'Chưa xác định'}
              </dd>
            </div>
            <div className="bg-white dark:bg-slate-800 px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Shell được phép
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                {targetShellLabel ?? '—'}
              </dd>
            </div>
          </dl>
        )}

        {onRedirect && (
          <button
            type="button"
            onClick={onRedirect}
            className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition"
          >
            Về đúng trang của tôi
            <IconArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
