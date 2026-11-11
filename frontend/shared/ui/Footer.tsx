import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">TEKY LEARNING HUB</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Hệ thống quản lý học tập và gia sư trực tuyến hàng đầu cho học sinh STEAM K-12 tại Việt Nam.
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">Hotline: 1900 633 868</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider text-[11px]">Hệ sinh thái STEAM</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>Lập trình Scratch & Game Maker</li>
              <li>Python & Ứng dụng Trí tuệ Nhân tạo</li>
              <li>Robotics, IoT & Tự động hóa</li>
              <li>Thiết kế Đồ họa 3D & Multimedia</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider text-[11px]">Cơ sở đào tạo</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>Hà Nội: Ba Đình, Cầu Giấy, Thanh Xuân</li>
              <li>TP. Hồ Chí Minh: Quận 1, Quận 7, Tân Bình</li>
              <li>Đà Nẵng: Hải Châu</li>
              <li>Học viện Online toàn quốc</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider text-[11px]">Đảm bảo chất lượng</h4>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
              Chứng chỉ quốc tế theo chuẩn CSTA Hoa Kỳ. Cam kết chất lượng đầu ra và năng lực sáng tạo công nghệ.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              <span>★ CSTA Standard Certified</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <p>© 2026 TEKY STEAM Academy — Dự án tốt nghiệp SEP490_FA26_TEKY-Learning-Hub.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Điều khoản dịch vụ</span>
            <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Bảo mật thông tin</span>
            <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Tiêu chuẩn WCAG AA</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

