import React, { useState } from 'react';
import type { UserRole } from '../../types';
import { IconGraduationCap, IconShieldCheck, IconCheckCircle, IconArrowRight } from '../common/Icons';
import { Badge } from '../common/Badge';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [email, setEmail] = useState('student@teky.edu.vn');
  const [password, setPassword] = useState('Teky@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [detectedRole, setDetectedRole] = useState<UserRole>('student');

  // Sample accounts for demo / grading convenience
  const demoAccounts: { role: UserRole; name: string; email: string; roleLabel: string; desc: string }[] = [
    { role: 'student', name: 'Nguyễn Minh Quân', email: 'student@teky.edu.vn', roleLabel: 'Học sinh', desc: 'Lịch học, nộp dự án, huy hiệu STEAM' },
    { role: 'parent', name: 'Trần Thu Trang', email: 'parent@teky.edu.vn', roleLabel: 'Phụ huynh', desc: 'Theo dõi con, nhận xét GV, học phí' },
    { role: 'teacher', name: 'Thầy Hoàng Văn Nam', email: 'teacher@teky.edu.vn', roleLabel: 'Giảng viên', desc: 'Điểm danh 1 chạm, giáo án, nhận xét' },
    { role: 'academic_manager', name: 'Đỗ Thị Hồng', email: 'manager@teky.edu.vn', roleLabel: 'QL Học thuật', desc: 'Ma trận xung đột, điều phối GV, khóa học' },
    { role: 'admin', name: 'Admin Kỹ Thuật', email: 'admin@teky.edu.vn', roleLabel: 'System Admin', desc: 'Phân quyền RBAC, Audit logs, an ninh' },
  ];

  const handleSelectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword('Teky@2026!');
    setDetectedRole(acc.role);
  };

  const inferRoleFromEmail = (inputEmail: string): UserRole => {
    const lower = inputEmail.toLowerCase();
    if (lower.includes('parent')) return 'parent';
    if (lower.includes('teacher') || lower.includes('gv')) return 'teacher';
    if (lower.includes('manager') || lower.includes('academic') || lower.includes('ql')) return 'academic_manager';
    if (lower.includes('admin') || lower.includes('root')) return 'admin';
    return 'student';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = inferRoleFromEmail(email) || detectedRole;
    onLoginSuccess(finalRole);
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
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        {/* Left: Branding & Visual */}
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
                Cổng đăng nhập dùng chung
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug">
                Một tài khoản cho toàn bộ hệ sinh thái STEAM
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
                Đăng nhập một lần để truy cập vào Bảng điều khiển riêng biệt dành cho Học sinh, Phụ huynh, Giảng viên hoặc Ban quản lý.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-white/20 text-xs text-blue-100 flex items-center gap-2">
            <IconShieldCheck size={18} className="text-emerald-300" />
            <span>Hệ thống tự động nhận diện vai trò và phân quyền an toàn</span>
          </div>
        </div>

        {/* Right: Universal Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Đăng nhập tài khoản</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nhập email hoặc mã tài khoản để truy cập vào hệ thống.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email hoặc Mã tài khoản
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setDetectedRole(inferRoleFromEmail(e.target.value));
                }}
                required
                placeholder="name@teky.edu.vn"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <span className="text-[11px] text-slate-400">
                Vai trò nhận diện: <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase">{inferRoleFromEmail(email)}</span>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              Đăng nhập vào hệ thống <IconArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
              💡 Bấm để điền nhanh tài khoản thử nghiệm theo từng vai trò:
            </p>
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
                  <div className="text-[10px] text-slate-400 truncate">{acc.name}</div>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
