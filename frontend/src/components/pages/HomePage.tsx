import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconCheckCircle, IconCode, IconCpu, IconGraduationCap, IconSparkles } from '@teky/shared/ui/Icons';
import { CourseCard } from '@teky/shared/public/CourseCard';
import { courseCategories, publicCourses } from '@teky/shared/public/courseCatalog';
import '@teky/shared/public/public.css';

interface HomePageProps { onNavigate: (view: string) => void; isLoggedIn?: boolean; }
const categoryIcons = { coding: IconCode, robotics: IconCpu, design: IconSparkles, ai: IconGraduationCap };

export function HomePage({ onNavigate, isLoggedIn = false }: HomePageProps) {
  useEffect(() => { document.title = 'Trang chủ | TEKY Learning Hub'; }, []);
  return <div className="public-home">
    <section className="public-container public-hero">
      <div className="public-hero-copy">
        <span className="public-eyebrow public-orange">HỌC VIỆN CÔNG NGHỆ SÁNG TẠO TEKY</span>
        <h1>Tò mò hôm nay.<br />Sáng tạo <span>ngày mai.</span>
        </h1>
        <p>Cho con không gian khám phá công nghệ, tự tay làm nên những điều mới và tự tin theo đuổi ý tưởng của mình.</p>
        <div className="public-hero-actions">
          <Link className="public-button primary" to="/courses">Khám phá khóa học<IconArrowRight size={19} />
          </Link>
          <button className="public-button secondary" onClick={() => onNavigate(isLoggedIn ? 'dashboard' : 'login')}>{isLoggedIn ? 'Vào không gian học tập' : 'Đăng nhập TEKY Hub'}</button>
        </div>
        <div className="public-hero-footnote">
          <span>
            <IconCheckCircle size={17} />Dành cho trẻ 7–16 tuổi</span>
          <span>
            <IconCheckCircle size={17} />Học bằng thực hành</span>
        </div>
      </div>
      <div className="public-hero-art" aria-hidden="true">
        <span className="hero-art-label">
          <span /> KHÔNG GIAN CHO MỌI Ý TƯỞNG</span>
        <div className="hero-project">
          <div className="hero-project-title">
            <span className="hero-project-dots">● ● ●</span>
            <span>my_first_idea.sb3</span>
            <IconCode size={18} />
          </div>
          <div className="hero-project-content">
            <div className="hero-code-blocks">
              <span>khi bấm vào <b>⚑</b>
              </span>
              <span>lặp lại <b>10</b> lần</span>
              <span>di chuyển <b>10</b> bước</span>
              <span>nói <b>Xin chào, thế giới!</b>
              </span>
            </div>
            <div className="hero-robot">
              <span className="robot-antenna" />
              <div className="robot-head">
                <i />
                <i />
              </div>
              <div className="robot-body">
                <IconCpu size={33} />
              </div>
              <span className="robot-feet" />
            </div>
          </div>
          <div className="hero-project-footer">
            <span>
              <IconCheckCircle size={16} />Ý tưởng đã sẵn sàng</span>
            <span>Đến lượt con sáng tạo!</span>
          </div>
        </div>
        <div className="hero-art-sticker">
          <IconSparkles size={27} />
          <span>Từ một câu hỏi nhỏ<br />
            <strong>đến một ý tưởng lớn.</strong>
          </span>
        </div>
        <span className="hero-art-number">01 — EXPLORE & CREATE</span>
      </div>
    </section>
    <div className="public-intro-strip">
      <div className="public-container">
        <span>Một hành trình, nhiều điều để khám phá</span>
        <strong>
          <IconCode size={22} />Lập trình</strong>
        <strong>
          <IconCpu size={22} />Robotics</strong>
        <strong>
          <IconSparkles size={22} />Thiết kế số</strong>
        <strong>
          <IconGraduationCap size={22} />Trí tuệ nhân tạo</strong>
      </div>
    </div>
    <section className="public-container public-section" id="courses-section">
      <div className="public-section-heading">
        <div>
          <span className="public-eyebrow">BẮT ĐẦU TỪ ĐIỀU CON THÍCH</span>
          <h2>Mở một cánh cửa công nghệ</h2>
          <p>Bốn lĩnh vực để con thử sức, khám phá và tìm thấy thế mạnh của mình.</p>
        </div>
        <Link className="public-text-link" to="/courses">Tất cả khóa học<IconArrowRight size={18} />
        </Link>
      </div>
      <div className="public-track-grid">{courseCategories.map((category, index) => {
        const Icon = categoryIcons[category.id]; return <Link key={category.id} to={`/courses?category=${category.id}`} className={`public-track track-${category.id}`}>
          <div className="public-track-top">
            <Icon size={31} strokeWidth={1.6} />
            <span>0{index + 1}</span>
          </div>
          <h3>{category.name}</h3>
          <p>{category.description}</p>
          <span className="public-track-link">Khám phá lĩnh vực<IconArrowRight size={18} />
          </span>
        </Link>;
      })}</div>
    </section>
    <section className="public-featured">
      <div className="public-container public-section">
        <div className="public-section-heading">
          <div>
            <span className="public-eyebrow">MỖI KHÓA HỌC, MỘT KHỞI ĐẦU MỚI</span>
            <h2>Chọn hành trình đầu tiên</h2>
            <p>Từ kéo thả khối lệnh đến lắp ráp robot. Bắt đầu với điều khiến con tò mò.</p>
          </div>
          <Link className="public-text-link" to="/courses">Xem danh mục<IconArrowRight size={18} />
          </Link>
        </div>
        <div className="public-course-grid public-featured-grid">{[publicCourses[0], publicCourses[2], publicCourses[4]].map(course => <CourseCard key={course.id} course={course} />)}</div>
        <p className="public-program-note">Chương trình giới thiệu. Nội dung và lịch học được xác nhận theo từng lớp.</p>
      </div>
    </section>
    <section className="public-container public-section public-learning-method" id="how-it-works">
      <div className="public-method-intro">
        <span className="public-eyebrow">CÁCH CON HỌC TẠI TEKY</span>
        <h2>Không chỉ học công nghệ.<br />Học cách tạo ra điều mới.</h2>
        <p>Mỗi ý tưởng đều xứng đáng được thử. Con học qua việc đặt câu hỏi, thực hành và từng bước hoàn thiện sản phẩm của mình.</p>
        <Link className="public-text-link" to="/courses">Tìm chương trình cho con<IconArrowRight size={18} />
        </Link>
      </div>
      <ol className="public-method-steps">
        <li>
          <span>01</span>
          <div>
            <h3>Khám phá bằng sự tò mò</h3>
            <p>Làm quen với một vấn đề, một công cụ hay một ý tưởng mới theo cách dễ hiểu.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h3>Tự tay làm, tự mình hiểu</h3>
            <p>Thử nghiệm, sửa lỗi và tìm lời giải qua những dự án vừa sức.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h3>Chia sẻ điều con tạo ra</h3>
            <p>Giới thiệu sản phẩm, lắng nghe góp ý và tự tin với sự tiến bộ của bản thân.</p>
          </div>
        </li>
      </ol>
    </section>
    <section className="public-container public-section public-faq">
      <div>
        <span className="public-eyebrow">CÙNG PHỤ HUYNH TÌM HIỂU</span>
        <h2>Một vài điều<br />ba mẹ muốn biết</h2>
      </div>
      <div>
        <details>
          <summary>Con chưa từng học lập trình có tham gia được không?</summary>
          <p>Các chương trình ở mức Khởi đầu giúp con làm quen từ những thao tác cơ bản. Ba mẹ có thể lọc theo độ tuổi và xem nội dung trước khi lựa chọn.</p>
        </details>
        <details>
          <summary>Làm sao để chọn chương trình phù hợp?</summary>
          <p>Bắt đầu với độ tuổi, sở thích và kinh nghiệm của con. Trong danh mục, mỗi khóa học có thông tin độ tuổi, kỹ năng và sản phẩm đầu ra để ba mẹ tham khảo.</p>
        </details>
        <details>
          <summary>Đã có tài khoản TEKY, con vào học ở đâu?</summary>
          <p>Chọn Đăng nhập trên thanh điều hướng. Sau khi xác thực, tài khoản được đưa đến không gian học tập với các lớp và quyền truy cập đã được cấp.</p>
        </details>
      </div>
    </section>
    <section className="public-container public-start">
      <div>
        <span className="public-eyebrow">Ý TƯỞNG TIẾP THEO ĐANG CHỜ CON</span>
        <h2>Hành trình lớn bắt đầu<br />từ một lần thử.</h2>
      </div>
      <Link className="public-button primary" to="/courses">Tìm khóa học phù hợp<IconArrowRight size={19} />
      </Link>
    </section>
  </div>;
}
