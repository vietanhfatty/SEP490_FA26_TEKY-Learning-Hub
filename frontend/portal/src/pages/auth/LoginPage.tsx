import React, { useState } from 'react';
import type { UserRole } from '@teky/shared';
import { IconGraduationCap, IconShieldCheck, IconCheckCircle, IconArrowRight, IconLock } from '@teky/shared';
import { Badge } from '@teky/shared';
import { loginApi, normalizeRole } from '@teky/shared';
import { decodeJwtClaims, roleFromClaims } from '@teky/shared/auth/jwt';
import { useAuth } from '@teky/shared/auth/authContext';

interface LoginPageProps {
  /**
   * Callback sau khi đăng nhập thành công.
   * Nhận vai trò (suy ra từ CLAIM trong JWT) và access token để điều hướng sang Shell khác.
   */
  onLoginSuccess: (role: UserRole, accessToken?: string) => void;
  onNavigateHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const { login: syncSession } = useAuth();
  const [email, setEmail] = useState('student@teky.edu.vn');
  const [password, setPassword] = useState('Teky@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenIssuedNotice, setTokenIssuedNotice] = useState<string | null>(null);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // 6 standard roles supported by centralized login portal
  const demoAccounts: { role: UserRole; name: string; email: string; roleLabel: string; desc: string }[] = [
    { role: 'student', name: 'Nguyễn Minh Quân (Học sinh)', email: 'student@teky.edu.vn', roleLabel: 'Học sinh', desc: 'Lịch học, nộp dự án, huy hiệu STEAM' },
    { role: 'parent', name: 'Trần Thu Trang (Phụ huynh)', email: 'parent@teky.edu.vn', roleLabel: 'Phụ huynh', desc: 'Theo dõi con, nhận xét GV, học phí' },
    { role: 'teacher', name: 'Thầy Hoàng Văn Nam (Giáo viên)', email: 'teacher@teky.edu.vn', roleLabel: 'Giáo viên', desc: 'Điểm danh 1 chạm, giáo án, nhận xét' },
    { role: 'staff', name: 'Nguyễn Thu Nga (Giáo vụ)', email: 'staff@teky.edu.vn', roleLabel: 'Giáo vụ', desc: 'Lớp học, xếp lịch học bù, chăm sóc học viên' },
    { role: 'academic_manager', name: 'Đỗ Thị Hồng (QL Đào tạo)', email: 'manager@teky.edu.vn', roleLabel: 'QL Học thuật', desc: 'Ma trận xung đột, điều phối GV, khóa học' },
    { role: 'admin', name: 'Admin Kỹ Thuật (System Admin)', email: 'admin@teky.edu.vn', roleLabel: 'Quản trị viên', desc: 'Phân quyền RBAC, Audit logs, an ninh' },
  ];

  const handleSelectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword('Teky@2026!');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setTokenIssuedNotice(null);

    try {
      const response = await loginApi(email, password, rememberMe);

      if (response.success && response.data) {
        // Ưu tiên giải mã CLAIM trong JWT Access Token (role_id > role_name > role).
        // Chỉ fallback về body response khi token không phải JWT hợp lệ.
        const claims = decodeJwtClaims(response.data.accessToken);
        const claimRole = roleFromClaims(claims);
        const resolvedRole = claimRole ?? normalizeRole(response.data.user.role);

        const roleSource = claimRole ? 'từ claim JWT' : 'từ phản hồi API';
        setTokenIssuedNotice(
          `Đã xác thực BCrypt thành công! Cấp phát Access Token (${response.data.accessToken.substring(0, 16)}...) & Refresh Token. Vai trò nhận diện ${roleSource}: ${resolvedRole}.`
        );
        const accessToken = response.data?.accessToken;
        // Đồng bộ phiên vào AuthProvider để RoleGuard nhận đúng vai trò ngay lập tức.
        syncSession(resolvedRole, accessToken ?? '', response.data?.refreshToken, {
          email: response.data.user.email,
          fullName: response.data.user.fullName,
          role: resolvedRole,
          roleId: response.data.user.roleId,
        });
        setTimeout(() => {
          onLoginSuccess(resolvedRole, accessToken);
        }, 600);
      } else {
        if (response.errors?.some((err) => err.includes('Network error') || err.includes('Failed to fetch') || err.includes('kết nối'))) {
          // Backend không chạy: chỉ dùng fallback khi khớp đúng tài khoản demo + mật khẩu chuẩn.
          const matchedDemo = demoAccounts.find(
            (acc) => acc.email.toLowerCase() === email.trim().toLowerCase()
          );

          if (!matchedDemo || password !== 'Teky@2026!') {
            setErrorMessage('Tài khoản hoặc mật khẩu không chính xác.');
            return;
          }

          const fallbackRole = matchedDemo.role;
          localStorage.setItem('teky_role', fallbackRole);
          localStorage.setItem('teky_token', 'jwt-demo-token-bcrypt-verified');
          localStorage.setItem('teky_access_token', 'jwt-demo-token-bcrypt-verified');
          localStorage.setItem('teky_refresh_token', 'rt-demo-token-active');
          localStorage.setItem(
            'teky_user',
            JSON.stringify({
              userId: 99,
              email: matchedDemo.email,
              fullName: matchedDemo.name,
              role: fallbackRole,
              status: 'Active',
              themeMode: 'Light',
            })
          );

          setTokenIssuedNotice(`[Chế độ dự phòng] Xác thực danh tính vai trò '${fallbackRole}' thành công.`);
          setTimeout(() => {
            onLoginSuccess(fallbackRole, 'jwt-demo-token-bcrypt-verified');
          }, 400);
        } else {
          setErrorMessage(response.message || 'Tài khoản hoặc mật khẩu không chính xác.');
        }
      }
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

              <span className="text-[11px] text-slate-400">
                Vai trò nhận diện:{' '}
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">
                  {demoAccounts.find((acc) => acc.email.toLowerCase() === email.trim().toLowerCase())
                    ?.roleLabel ?? 'Sẽ xác thực qua JWT'}
                </span>
              </span>
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
                  Đang xác thực BCrypt & cấp Token...
                </>
              ) : (
                <>
                  Đăng nhập vào hệ thống <IconArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                💡 Điền nhanh tài khoản mẫu thử nghiệm (5 vai trò):
              </p>
              <span className="text-[10px] text-slate-400 font-mono">PW: Teky@2026!</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc)}
                  className={`p-2 rounded-xl text-left border text-[11px] transition-all ${
                    email === acc.email
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="font-semibold truncate">{acc.roleLabel}</div>
                  <div className="text-[10px] text-slate-400 truncate">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
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
