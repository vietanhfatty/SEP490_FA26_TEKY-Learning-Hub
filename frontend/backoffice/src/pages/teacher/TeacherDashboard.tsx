import React, { useState } from 'react';
import { IconCalendar, IconCheckCircle, IconClock, IconBookOpen } from '../common/Icons';
import { Badge } from '../common/Badge';

export const TeacherDashboard: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState('SCRATCH-01');
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [studentToEvaluate, setStudentToEvaluate] = useState('Nguyễn Minh Quân');
  const [teacherRating, setTeacherRating] = useState(5);
  const [teacherComment, setTeacherComment] = useState('Em hoàn thành bài tập rất tốt, nắm vững kiến thức!');

  const [roster, setRoster] = useState([
    { id: '1', name: 'Nguyễn Minh Quân', code: 'TEKY-88', status: 'Present', note: '' },
    { id: '2', name: 'Trần Bảo Nam', code: 'TEKY-89', status: 'Present', note: '' },
    { id: '3', name: 'Lê Hoàng Minh', code: 'TEKY-90', status: 'Late', note: 'Vào muộn 10 phút' },
    { id: '4', name: 'Phạm Quỳnh Anh', code: 'TEKY-91', status: 'Present', note: '' },
    { id: '5', name: 'Vũ Đức Duy', code: 'TEKY-92', status: 'Absent_Excused', note: 'Gia đình xin phép' },
  ]);

  const scheduleWeekly = [
    { day: 'Thứ Bảy (Hôm nay)', time: '14:00 - 15:30', class: 'Scratch Game 3.0 (SCRATCH-01)', room: 'Online 04', count: 12, status: 'In Progress' },
    { day: 'Thứ Bảy', time: '16:00 - 17:30', class: 'Python Robotics (PY-ROBO-02)', room: 'Lab 201 (Cầu Giấy)', count: 10, status: 'Scheduled' },
    { day: 'Chủ Nhật', time: '09:00 - 10:30', class: 'Scratch Jr Sáng tạo (SCRATCH-JR-05)', room: 'Lab 102 (Ba Đình)', count: 8, status: 'Scheduled' },
    { day: 'Chủ Nhật', time: '14:00 - 15:30', class: 'Web Frontend Explorer (WEB-01)', room: 'Online 02', count: 14, status: 'Scheduled' },
  ];

  const handleMarkAllPresent = () => {
    setRoster(roster.map(s => ({ ...s, status: 'Present' })));
  };

  const handleStatusChange = (id: string, status: (typeof roster)[number]['status']) => {
    setRoster(roster.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleSaveAttendance = () => {
    setAttendanceSaved(true);
    setTimeout(() => setAttendanceSaved(false), 2500);
  };

  return (
    <div className="space-y-8 py-6">
      {/* Teacher Profile & Quick Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-xl flex items-center justify-center">
            👨‍🏫
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Thầy Hoàng Văn Nam</h2>
              <Badge variant="success">Giảng viên Xuất sắc</Badge>
            </div>
            <p className="text-xs text-slate-500">Bộ môn: Lập trình Scratch & Python • Đang chọn: {selectedClass}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => alert('Mở form xin nghỉ phép / đổi ca dạy bù')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200"
          >
            Xin đổi ca / Dạy bù
          </button>
          <button
            onClick={() => alert('Mở kho học liệu giáo trình TEKY')}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 flex items-center gap-1.5"
          >
            <IconBookOpen size={16} /> Kho giáo án chuẩn
          </button>
        </div>
      </div>

      {/* Main Split: Timetable (Left) vs Real-Time Attendance Roster (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Weekly Timetable Agenda */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <IconCalendar size={18} className="text-blue-600" /> Lịch dạy trong tuần
            </h3>
            <Badge variant="info">4 Ca học</Badge>
          </div>

          <div className="space-y-3">
            {scheduleWeekly.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedClass(item.class.includes('SCRATCH-01') ? 'SCRATCH-01' : 'PY-ROBO-02')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs ${
                  item.status === 'In Progress'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-white">{item.day}</span>
                  <Badge variant={item.status === 'In Progress' ? 'accent' : 'neutral'}>
                    {item.status === 'In Progress' ? 'Đang diễn ra' : 'Sắp tới'}
                  </Badge>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{item.class}</h4>
                <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="flex items-center gap-1"><IconClock size={12} /> {item.time}</span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">{item.room}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Class Roster & 1-Click Attendance */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Điểm danh lớp: Scratch Game 3.0 (Buổi 10)
                </h3>
                <Badge variant="success">Sĩ số: 12/12</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Phòng: Online 04 • Thời gian: 14:00 - 15:30</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200"
              >
                ✓ Tất cả có mặt
              </button>
              <button
                onClick={handleSaveAttendance}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
              >
                Lưu điểm danh
              </button>
            </div>
          </div>

          {attendanceSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <IconCheckCircle size={16} />
              <span>Đã lưu kết quả điểm danh thành công! Dữ liệu đã đồng bộ về app Phụ huynh.</span>
            </div>
          )}

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Học sinh</th>
                  <th className="p-3">Mã học sinh</th>
                  <th className="p-3">Trạng thái điểm danh</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-right">Nhận xét buổi học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {roster.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="p-3 text-slate-500 tabular-nums">{s.code}</td>
                    <td className="p-3">
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-medium"
                      >
                        <option value="Present">Có mặt</option>
                        <option value="Late">Đi muộn</option>
                        <option value="Absent_Excused">Nghỉ có phép</option>
                        <option value="Absent_Unexcused">Nghỉ không phép</option>
                      </select>
                    </td>
                    <td className="p-3 text-slate-500">
                      {s.note ? <span className="text-amber-600 font-medium">{s.note}</span> : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setStudentToEvaluate(s.name);
                          setShowFeedbackModal(true);
                        }}
                        className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold"
                      >
                        Đánh giá ★
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Teacher Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="font-bold text-base text-slate-900 dark:text-white">
              Nhận xét buổi học: {studentToEvaluate}
            </h4>
            <p className="text-xs text-slate-500">
              Nhận xét này sẽ hiển thị trực tiếp trên tài khoản Phụ huynh và Học sinh sau khi hoàn tất buổi học.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Mức độ hiểu bài & Sáng tạo</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTeacherRating(star)}
                      className={`px-3 py-1.5 rounded-xl border text-sm font-bold ${
                        teacherRating >= star
                          ? 'bg-amber-100 border-amber-300 text-amber-700'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Nhận xét chi tiết của giáo viên</label>
                <textarea
                  rows={3}
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  alert(`Đã lưu nhận xét cho ${studentToEvaluate}!`);
                  setShowFeedbackModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Gửi nhận xét
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
