import React, { useState, useEffect } from 'react';
import { IconAlertCircle, IconPlus, IconDownload } from '../common/Icons';
import { Badge } from '../common/Badge';

interface AcademicManagerDashboardProps {
  activeNavId?: string;
}

export const AcademicManagerDashboard: React.FC<AcademicManagerDashboardProps> = ({ activeNavId = 'kpi' }) => {
  const [activeTab, setActiveTab] = useState<'kpi' | 'courses' | 'timetable' | 'teachers' | 'surveys'>('timetable');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeNavId === 'timetable') setActiveTab('timetable');
      else if (activeNavId === 'courses') setActiveTab('courses');
      else if (activeNavId === 'teachers') setActiveTab('teachers');
      else if (activeNavId === 'surveys') setActiveTab('surveys');
      else if (activeNavId === 'kpi' || activeNavId === 'overview') setActiveTab('kpi');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeNavId]);

  const coursesList = [
    { code: 'SCRATCH-01', title: 'Lập trình Scratch Game 3.0', subject: 'Scratch', age: '7-9', lessons: 12, classes: 8, status: 'Published' },
    { code: 'PY-GAME-02', title: 'Python Ứng dụng & Mini Games', subject: 'Python', age: '10-12', lessons: 14, classes: 6, status: 'Published' },
    { code: 'ROBO-WEDO-01', title: 'Chế tạo Robotics LEGO WeDo', subject: 'Robotics', age: '7-9', lessons: 10, classes: 5, status: 'Published' },
    { code: 'AI-VISION-04', title: 'Nhập môn Trí tuệ Nhân tạo & Computer Vision', subject: 'AI', age: '13-16', lessons: 16, classes: 3, status: 'Draft' },
  ];

  const timetableConflicts = [
    {
      id: 'CONF-01',
      type: 'Tutor Double-Booking',
      severity: 'High',
      desc: 'Thầy Hoàng Văn Nam bị xếp trùng ca Thứ Bảy 14:00 (Lớp SCRATCH-01 Online và Lớp PY-02 Cầu Giấy)',
      action: 'Đổi giáo viên lớp PY-02',
    },
    {
      id: 'CONF-02',
      type: 'Room Overcapacity',
      severity: 'Medium',
      desc: 'Phòng Lab 201 (Cơ sở Ba Đình) sĩ số 14 học sinh, vượt công suất khuyến nghị 12 máy',
      action: 'Chuyển sang Lab 301',
    },
  ];

  const availableTeachers = [
    { name: 'Thầy Lê Quang Đạt', subject: 'Python, AI, Web', freeSlots: 'Thứ 7 (14:00 - 18:00), Chủ Nhật', rating: 4.9, activeClasses: 4 },
    { name: 'Cô Trần Thùy Linh', subject: 'Scratch, 3D Design', freeSlots: 'Thứ 7 (08:00 - 12:00)', rating: 4.8, activeClasses: 5 },
    { name: 'Thầy Vũ Đình Trọng', subject: 'Robotics LEGO, Arduino', freeSlots: 'Chủ Nhật cả ngày', rating: 5.0, activeClasses: 3 },
  ];

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner: KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Tổng số Khóa học</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">28</h4>
            <Badge variant="info">4 Soạn thảo</Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Chuẩn giáo trình CSTA Hoa Kỳ</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Lớp học đang hoạt động</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-2xl font-extrabold text-blue-600 tabular-nums">64</h4>
            <span className="text-xs text-emerald-600 font-semibold">↑ +8 lớp mới</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Tổng 512 học sinh đang theo học</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Hiệu suất Giảng viên (Workload)</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-2xl font-extrabold text-emerald-600 tabular-nums">88.4%</h4>
            <Badge variant="success">Tối ưu</Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Trung bình 18 ca dạy / tuần / GV</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Cảnh báo trùng lịch / Xung đột</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-2xl font-extrabold text-rose-600 tabular-nums">2</h4>
            <Badge variant="danger">Cần giải quyết</Badge>
          </div>
          <p className="text-[11px] text-rose-500 mt-2 font-medium">1 GV trùng ca • 1 Phòng quá tải</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'kpi'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Tổng quan KPI & Tiến độ học thuật
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'timetable'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Xếp lịch & Xung đột thời khóa biểu
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'courses'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Quản lý Khóa học & Giáo trình
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'teachers'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Điều phối & Tìm GV rảnh
        </button>
        <button
          onClick={() => setActiveTab('surveys')}
          className={`pb-3 whitespace-nowrap transition-colors ${
            activeTab === 'surveys'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Khảo sát chất lượng & Báo cáo
        </button>
      </div>

      {/* Tab Content 0: KPI & Academic Progress */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Tiến độ Hoàn thành Khung chương trình CSTA</h3>
                  <p className="text-xs text-slate-500">Tỷ lệ học sinh đạt chuẩn đầu ra năng lực STEAM theo độ tuổi</p>
                </div>
                <Badge variant="success">94.6% Đạt chuẩn</Badge>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Khối Tiểu học (7-10 tuổi): Scratch & Lego Robotics</span>
                    <span className="font-bold text-blue-600 tabular-nums">96%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Khối THCS (11-14 tuổi): Python, Web & Arduino</span>
                    <span className="font-bold text-emerald-600 tabular-nums">91%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: '91%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Khối THPT (15-18 tuổi): AI, Data Science & App Dev</span>
                    <span className="font-bold text-orange-600 tabular-nums">88%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Cần xử lý gấp trong ngày</h3>
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                    <span>Xung đột ca dạy T7 14:00</span>
                    <Badge variant="danger">Gấp</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">Thầy Hoàng Văn Nam trùng 2 lớp song song</p>
                  <button onClick={() => setActiveTab('timetable')} className="text-rose-600 font-semibold underline text-[11px] mt-2 block">
                    Đi tới ma trận xử lý →
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                    <span>Duyệt đề cương AI-VISION</span>
                    <Badge variant="warning">Chờ ký</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">Đề cương 16 buổi cần hội đồng chuyên môn duyệt</p>
                  <button onClick={() => setActiveTab('courses')} className="text-amber-600 font-semibold underline text-[11px] mt-2 block">
                    Xem bản thảo giáo án →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 1: Timetable & Conflict Matrix */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {/* Conflict Alert Box */}
          <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-3">
            <div className="flex items-center gap-2">
              <IconAlertCircle size={20} className="text-rose-600" />
              <h4 className="font-bold text-sm text-rose-900 dark:text-rose-300">
                Phát hiện 2 xung đột lịch giảng dạy cần Academic Manager can thiệp
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {timetableConflicts.map((conf) => (
                <div key={conf.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-700 dark:text-rose-400">{conf.type}</span>
                    <Badge variant="danger">{conf.severity}</Badge>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{conf.desc}</p>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => alert(`Đã kích hoạt quy trình tự động: ${conf.action}`)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                    >
                      {conf.action} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timetable Schedule Grid Preview */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Ma trận Thời khóa biểu các lớp (Tuần 45 - Tháng 11/2026)
                </h3>
                <p className="text-xs text-slate-500">Kéo thả để điều chỉnh ca học hoặc đổi phòng học</p>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold flex items-center gap-1.5">
                  <IconDownload size={14} /> Xuất Excel
                </button>
                <button className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5">
                  <IconPlus size={14} /> Mở lớp học mới
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Khung giờ</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Thứ Bảy (Sáng)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Thứ Bảy (Chiều)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Chủ Nhật (Sáng)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Chủ Nhật (Chiều)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  <tr>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">08:30 - 10:00</td>
                    <td className="p-3 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 rounded">
                      <p className="font-bold">SCRATCH-JR-01</p>
                      <p className="text-[11px] text-slate-500">Cô Mai • Lab 101</p>
                    </td>
                    <td className="p-3 text-slate-400 italic">Trống ca</td>
                    <td className="p-3 bg-cyan-50/40 dark:bg-cyan-950/20 text-cyan-900 dark:text-cyan-200 rounded">
                      <p className="font-bold">ROBO-WEDO-03</p>
                      <p className="text-[11px] text-slate-500">Thầy Trọng • Lab 202</p>
                    </td>
                    <td className="p-3 text-slate-400 italic">Trống ca</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">14:00 - 15:30</td>
                    <td className="p-3 text-slate-400 italic">Trống ca</td>
                    <td className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 rounded border border-rose-300">
                      <p className="font-bold">⚠️ SCRATCH-01 (Online 04)</p>
                      <p className="text-[11px]">Trùng lịch Thầy Nam</p>
                    </td>
                    <td className="p-3 text-slate-400 italic">Trống ca</td>
                    <td className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 rounded">
                      <p className="font-bold">WEB-FRONTEND-01</p>
                      <p className="text-[11px] text-slate-500">Thầy Đạt • Online 01</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Courses Catalog */}
      {activeTab === 'courses' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Danh mục Khóa học & Giáo trình STEAM</h3>
              <p className="text-xs text-slate-500">Quản lý cấu trúc bài giảng, đề cương và tài liệu môn học</p>
            </div>
            <button
              onClick={() => alert('Mở form tạo khóa học mới chuẩn Clean Architecture backend')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <IconPlus size={16} /> Thêm khóa học mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Mã khóa học</th>
                  <th className="p-3">Tên chương trình</th>
                  <th className="p-3">Chủ đề</th>
                  <th className="p-3">Độ tuổi</th>
                  <th className="p-3">Số buổi học</th>
                  <th className="p-3">Số lớp đang mở</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {coursesList.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white tabular-nums">{c.code}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{c.title}</td>
                    <td className="p-3 text-slate-500">{c.subject}</td>
                    <td className="p-3">{c.age} tuổi</td>
                    <td className="p-3 font-semibold tabular-nums">{c.lessons} buổi</td>
                    <td className="p-3 tabular-nums">{c.classes} lớp</td>
                    <td className="p-3">
                      <Badge variant={c.status === 'Published' ? 'success' : 'neutral'}>
                        {c.status === 'Published' ? 'Đã xuất bản' : 'Bản nháp'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button className="text-blue-600 font-semibold hover:underline">Sửa giáo án</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Teachers Availability Matcher */}
      {activeTab === 'teachers' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Bộ lọc thông minh: Tìm giảng viên rảnh lịch</h3>
              <p className="text-xs text-slate-500">Khớp nối chuyên môn giảng dạy với các ca học đang thiếu người phụ trách</p>
            </div>
            <Badge variant="accent">3 Giảng viên sẵn sàng nhận lớp</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {availableTeachers.map((t, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</h4>
                  <span className="text-amber-500 font-semibold">★ {t.rating}</span>
                </div>
                <p className="text-blue-600 dark:text-blue-400 font-medium">Chuyên môn: {t.subject}</p>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Khung giờ rảnh:</span>
                  <p className="text-slate-500 mt-0.5">{t.freeSlots}</p>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-400">Đang dạy: {t.activeClasses} lớp</span>
                  <button
                    onClick={() => alert(`Đã phân công ${t.name} vào lớp học!`)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  >
                    Phân công ca này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 4: Quality Surveys */}
      {activeTab === 'surveys' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Khảo sát mức độ hài lòng của Phụ huynh & Học sinh</h3>
          <p className="text-xs text-slate-500">Tổng hợp ý kiến đánh giá sau khóa học để cải tiến chất lượng đào tạo</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Độ hài lòng chung</p>
              <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">98.2%</p>
              <p className="text-[11px] text-emerald-700 mt-1">Dựa trên 420 lượt khảo sát</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Chất lượng Giảng viên</p>
              <p className="text-2xl font-black text-blue-600 mt-1 tabular-nums">4.9/5.0</p>
              <p className="text-[11px] text-blue-700 mt-1">Nhiệt huyết, truyền cảm hứng</p>
            </div>
            <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">Học liệu & Cơ sở vật chất</p>
              <p className="text-2xl font-black text-orange-600 mt-1 tabular-nums">4.8/5.0</p>
              <p className="text-[11px] text-orange-700 mt-1">Bộ kit LEGO & máy tính hiện đại</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
