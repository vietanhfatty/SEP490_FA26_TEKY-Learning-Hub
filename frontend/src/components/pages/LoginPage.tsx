import React, { useState } from 'react';
import type { UserRole } from '../../types';
import { IconGraduationCap, IconShieldCheck, IconCheckCircle, IconArrowRight, IconLock } from '../common/Icons';
import { Badge } from '../common/Badge';
import { loginApi } from '../../services/auth';
import { decodeJwtClaims, roleFromClaims } from '@teky/shared/auth/jwt';
import { useAuth } from '@teky/shared/auth/authContext';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole, accessToken?: string) => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const { login: syncSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenIssuedNotice, setTokenIssuedNotice] = useState<string | null>(null);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setTokenIssuedNotice(null);

    try {
      const response = await loginApi(email, password, rememberMe);
      if (!response.success || !response.data) {
        setErrorMessage(response.message || 'Tài khoản hoặc mật khẩu không chính xác.');
        return;
      }
      const { accessToken, refreshToken } = response.data;
      const resolvedRole = roleFromClaims(decodeJwtClaims(accessToken));
      if (!resolvedRole) throw new Error('Vai trò trong phiên đăng nhập không hợp lệ.');
      await syncSession(resolvedRole, accessToken, refreshToken);
      setTokenIssuedNotice('Đăng nhập thành công. Đang mở trang của bạn…');
      onLoginSuccess(resolvedRole, accessToken);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi trong quá trình xác thực.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSent(false);
    }, 2000);
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        {/* Left: Branding & Visual Overview */}
        <div className="p-8 sm:p-10 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <IconGraduationCap size={24} className="text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight">TEKY LEARNING HUB</span>
            </div>

            <div className="mt-8 space-y-4">
              <Badge variant="accent" className="bg-orange-500/20 text-orange-200 border-orange-400/30">
                Cổng đăng nhập tập trung đa vai trò
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug">
                Một cổng truy cập an toàn cho mọi thành viên STEAM
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
                Hệ thống bảo mật xác thực qua Email / Tên đăng nhập và mật khẩu mã hóa BCrypt. Tự động cấp phát JWT Access Token và Refresh Token xoay vòng an toàn.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 text-xs text-blue-100 space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <IconShieldCheck size={18} className="text-emerald-300 shrink-0" />
              <span>Hỗ trợ đa vai trò: Học sinh, Phụ huynh, Giáo viên, QL Học thuật, Quản trị viên</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-blue-200">
              <IconLock size={15} className="text-sky-300 shrink-0" />
              <span>Mã hóa BCrypt Work Factor 11 & Chu kỳ làm mới JWT xoay vòng</span>
            </div>
          </div>
        </div>

        {/* Right: Centralized Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Đăng nhập hệ thống</h3>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Universal Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nhập email hoặc tên tài khoản để hệ thống tự động nhận diện vai trò.
            </p>
          </div>

          {/* Feedback & Error Notices */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <span className="font-bold text-rose-500">⚠</span>
              <div>{errorMessage}</div>
            </div>
          )}

          {tokenIssuedNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <IconCheckCircle size={16} className="shrink-0 text-emerald-500" />
              <div>{tokenIssuedNotice}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email hoặc Tên đăng nhập
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                }}
                required
                placeholder="vd: student@teky.edu.vn hoặc admin"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  required
                  placeholder="Nhập mật khẩu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-[11px]"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Ghi nhớ đăng nhập (30 ngày)</span>
              </label>


            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang đăng nhập…
                </>
              ) : (
                <>
                  Đăng nhập vào hệ thống <IconArrowRight size={16} />
                </>
              )}
            </button>
          </form>


        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">Khôi phục mật khẩu</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Nhập email đã đăng ký với học viện TEKY. Hệ thống sẽ gửi mã OTP khôi phục mật khẩu.
            </p>

            {forgotSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs">
                <IconCheckCircle size={18} />
                <span>Mã OTP đã được gửi vào hòm thư! Vui lòng kiểm tra email.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email tài khoản</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="email@teky.edu.vn"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                  >
                    Gửi mã xác thực
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
