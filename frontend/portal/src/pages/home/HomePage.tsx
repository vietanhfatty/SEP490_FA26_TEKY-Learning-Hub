import React, { useState } from 'react';
import { IconCode, IconCpu, IconSparkles, IconChevronRight, IconGraduationCap, IconCheckCircle } from '../common/Icons';
import { Badge } from '../common/Badge';

interface HomePageProps {
  onNavigate: (view: string) => void;
  isLoggedIn?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, isLoggedIn }) => {
  const [selectedAge, setSelectedAge] = useState<'All' | '7-9' | '10-12' | '13-16'>('All');

  const steamTracks = [
    {
      title: 'Lập trình & Phát triển ứng dụng',
      icon: <IconCode size={24} className="text-blue-600 dark:text-blue-400" />,
      desc: 'Từ thuật toán Scratch trực quan đến ngôn ngữ Python, JavaScript và phát triển Web/Game.',
      courses: ['Scratch Jr & Game Maker', 'Python Ứng dụng & OOP', 'Web Frontend Fullstack'],
      age: '7-16',
      badge: 'Phổ biến nhất',
    },
    {
      title: 'Robotics & Tự động hóa IoT',
      icon: <IconCpu size={24} className="text-cyan-600 dark:text-cyan-400" />,
      desc: 'Lắp ráp mô hình LEGO Education, lập trình vi điều khiển Arduino/Micro:bit, thi đấu WRO.',
      courses: ['LEGO WeDo Robotics', 'Arduino Smart City', 'Thi đấu VEX IQ Robotics'],
      age: '8-15',
      badge: 'Thực hành 100%',
    },
    {
      title: 'Thiết kế 3D & Truyền thông số',
      icon: <IconSparkles size={24} className="text-orange-600 dark:text-orange-400" />,
      desc: 'Tư duy tạo hình không gian với Tinkercad, Blender 3D, thiết kế đồ họa và in 3D thực tế.',
      courses: ['3D Modeling Tinkercad', 'Thiết kế đồ họa Photoshop/Illustrator', 'Làm phim hoạt hình 2D'],
      age: '9-16',
      badge: 'Khơi gợi sáng tạo',
    },
    {
      title: 'Trí tuệ nhân tạo (AI) & Dữ liệu',
      icon: <IconGraduationCap size={24} className="text-emerald-600 dark:text-emerald-400" />,
      desc: 'Khám phá Machine Learning, Computer Vision nhận diện hình ảnh và ứng dụng AI an toàn.',
      courses: ['Nhập môn AI với Teachable Machine', 'Python Machine Learning cơ bản', 'AI Chatbot & Prompt Engineering'],
      age: '11-16',
      badge: 'Đón đầu xu thế',
    },
  ];

  const studentProjects = [
    {
      title: 'Game Giải cứu Đại dương',
      author: 'Trần Bảo Nam (9 tuổi)',
      subject: 'Scratch 3.0',
      tag: 'Game Sáng tạo',
      rating: 5,
      comment: 'Lập trình vật lý va chạm và hệ thống điểm số rất ấn tượng!',
    },
    {
      title: 'Xe Robot Tự hành Tránh vật cản',
      author: 'Lê Hoàng Minh (12 tuổi)',
      subject: 'Arduino & C++',
      tag: 'Robotics & IoT',
      rating: 5,
      comment: 'Cảm biến siêu âm hoạt động chính xác với độ trễ thấp.',
    },
    {
      title: 'Web Tra cứu Thời tiết bằng Python',
      author: 'Phạm Quỳnh Anh (14 tuổi)',
      subject: 'Python & Flask',
      tag: 'Web Application',
      rating: 5,
      comment: 'Tích hợp OpenWeather API mượt mà, giao diện tối ưu responsive.',
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white p-8 sm:p-12 lg:p-16 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.2),transparent_50%)]"></div>
        <div className="relative max-w-3xl space-y-6">
          <Badge variant="accent" className="bg-orange-500/20 text-orange-300 border-orange-400/30 text-xs px-3 py-1">
            🔥 Học viện STEAM số 1 cho trẻ em tại Việt Nam
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Khơi dậy đam mê <span className="text-sky-300">Công nghệ</span> & Sáng tạo tương lai
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            Nền tảng quản lý học tập và gia sư trực tuyến tích hợp của TEKY. Lộ trình chuẩn quốc tế, theo dõi sát sao tiến độ học tập cho phụ huynh, tối ưu giảng dạy cho giáo viên.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {isLoggedIn ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2"
              >
                Vào Bảng điều khiển (Dashboard) <IconChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2"
              >
                Đăng nhập vào hệ thống <IconChevronRight size={18} />
              </button>
            )}
            <button
              onClick={() => {
                document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/20 transition-all"
            >
              Khám phá chương trình STEAM ↓
            </button>
          </div>

          {/* Social Proof Stats */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 text-slate-200">
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">50.000+</p>
              <p className="text-xs text-slate-400">Học sinh đã theo học</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">100+</p>
              <p className="text-xs text-slate-400">Khóa học chuẩn CSTA</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">30+</p>
              <p className="text-xs text-slate-400">Cơ sở toàn quốc</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">98.5%</p>
              <p className="text-xs text-slate-400">Phụ huynh hài lòng</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEAM Tracks */}
      <section id="courses-section" className="space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge variant="info">4 Trục Đào Tạo Nòng Cốt</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
              Hệ thống chương trình chuẩn quốc tế
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Giáo trình biên soạn theo chuẩn K-12 Computer Science Standards của Hiệp hội Giáo viên Khoa học Máy tính Hoa Kỳ (CSTA).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steamTracks.map((track, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/60 w-fit">
                    {track.icon}
                  </div>
                  <Badge variant="accent">{track.badge}</Badge>
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{track.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">{track.desc}</p>
                
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Khóa học tiêu biểu:</p>
                  {track.courses.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <IconCheckCircle size={14} className="text-emerald-500 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">Độ tuổi: {track.age}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-1">
                  Chi tiết <IconChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Course Finder by Age */}
      <section className="p-8 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tìm khóa học phù hợp với độ tuổi của con</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lộ trình cá nhân hóa theo từng giai đoạn phát triển tư duy của trẻ</p>
          </div>
          <div className="flex gap-2">
            {(['All', '7-9', '10-12', '13-16'] as const).map((age) => (
              <button
                key={age}
                onClick={() => setSelectedAge(age)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedAge === age
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {age === 'All' ? 'Tất cả lứa tuổi' : `${age} tuổi`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Badge variant="info">Lứa tuổi 7–9 tuổi</Badge>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-2">Bé làm quen lập trình & Robotics</h4>
            <p className="text-xs text-slate-500 mt-1">Kích thích tư duy logic trực quan qua các khối lệnh kéo thả, chế tạo mô hình cơ học đơn giản.</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Badge variant="accent">Lứa tuổi 10–12 tuổi</Badge>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-2">Lập trình Game & Thiết kế 3D</h4>
            <p className="text-xs text-slate-500 mt-1">Chuyển đổi từ kéo thả sang viết mã lệnh Python, làm quen với không gian 3 chiều và vi điều khiển.</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Badge variant="success">Lứa tuổi 13–16 tuổi</Badge>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-2">Chuyên sâu Web, AI & Thi đấu Quốc tế</h4>
            <p className="text-xs text-slate-500 mt-1">Xây dựng ứng dụng thực tế, sản phẩm hoàn chỉnh phục vụ hồ sơ du học và các giải đấu lập trình.</p>
          </div>
        </div>
      </section>

      {/* Student Project Spotlight */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="accent">Góc Sáng Tạo TEKY</Badge>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Dự án xuất sắc từ học sinh
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {studentProjects.map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="neutral">{item.subject}</Badge>
                  <span className="text-amber-500 text-xs">★★★★★</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-3">Tác giả: {item.author}</p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-300 italic">
                  "{item.comment}"
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
                <span>Trạng thái: Đã nghiệm thu</span>
                <span className="text-blue-600 font-semibold cursor-pointer">Xem demo →</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

