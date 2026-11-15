import React, { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth/authContext';
import { accountRequest } from './accountApi';
import { API_BASE_URL } from '../api-client/auth';
import { IconCheckCircle, IconAlertCircle } from '../ui/Icons';
import { Badge } from '../ui/Badge';
import './account.css';

interface Profile {
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị hệ thống',
  system_admin: 'Quản trị hệ thống',
  academic_manager: 'Quản lý học thuật',
  teacher: 'Giảng viên',
  academic_staff: 'Giáo vụ cơ sở',
  staff: 'Giáo vụ cơ sở',
  parent: 'Phụ huynh',
  student: 'Học sinh',
};

export function AccountPage() {
  const auth = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savedAvatar, setSavedAvatar] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load avatar blob when avatarUrl is available
  useEffect(() => {
    let cancelled = false;
    let url = '';
    if (profile?.avatarUrl?.startsWith('/api/users/me/avatar')) {
      fetch(`${API_BASE_URL}/users/me/avatar`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      })
        .then((response) => {
          if (!response.ok) throw new Error('Avatar unavailable');
          return response.blob();
        })
        .then((blob) => {
          if (!cancelled) {
            url = URL.createObjectURL(blob);
            setSavedAvatar(url);
          }
        })
        .catch(() => {});
    } else {
      setSavedAvatar('');
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [profile?.avatarUrl, auth.accessToken]);

  // Load profile data
  useEffect(() => {
    let active = true;
    accountRequest<{ data: Profile }>('/auth/me', undefined, 'GET')
      .then((r) => {
        if (active) setProfile(r.data);
      })
      .catch((e) => {
        if (active) setErrorMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  // Revoke preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Ảnh PNG không được vượt quá 2 MB.');
      return;
    }
    setErrorMessage('');
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSuccessMessage('');
    setErrorMessage('');
  };

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await accountRequest(
        '/users/me',
        {
          fullName: data.get('fullName'),
          phone: data.get('phone') || null,
          bio: data.get('bio'),
        },
        'PATCH'
      );

      if (selectedFile) {
        const upload = new FormData();
        upload.set('avatar', selectedFile);
        await accountRequest('/users/me/avatar', upload);
        setSelectedFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview('');
      }

      const result = await accountRequest<{ data: Profile }>('/auth/me', undefined, 'GET');
      auth.updateUser(result.data);
      setProfile(result.data);
      setSuccessMessage('Đã cập nhật hồ sơ thành công.');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Không thể lưu hồ sơ.');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const currentPassword = data.get('currentPassword') as string;
    const newPassword = data.get('newPassword') as string;
    const confirmPassword = data.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setBusy(true);
    setPasswordError('');
    try {
      await accountRequest('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      await auth.logout();
      window.location.assign('/login');
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Không thể đổi mật khẩu.');
    } finally {
      setBusy(false);
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'TK';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (!auth.isLoggedIn) {
    return (
      <div className="account-lms-page">
        <div className="admin-widget" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h2>Bạn chưa đăng nhập</h2>
          <p style={{ margin: '12px 0 20px', color: 'var(--talent-muted)' }}>
            Vui lòng đăng nhập để truy cập và chỉnh sửa thông tin tài khoản.
          </p>
          <a
            href="/login"
            className="users-primary"
            style={{ padding: '10px 20px', borderRadius: '5px', textDecoration: 'none', display: 'inline-block' }}
          >
            Đăng nhập ngay
          </a>
        </div>
      </div>
    );
  }

  const roleName = auth.role ? ROLE_LABELS[auth.role] || auth.role : 'Người dùng';
  const activeAvatarSrc = preview || savedAvatar;

  return (
    <div className="account-lms-page">
      <div className="admin-page-heading">
        <div>
          <h1>Tài khoản của bạn</h1>
          <p>Quản lý thông tin định danh cá nhân, ảnh đại diện và tùy chọn bảo mật tài khoản.</p>
        </div>
      </div>

      {successMessage && (
        <div className="admin-status users-success" role="status">
          <IconCheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="admin-status users-error" role="alert">
          <IconAlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="account-lms-grid">
        {/* Left Column: Summary Widget */}
        <aside className="admin-widget account-summary-widget">
          <div className="account-avatar-circle">
            {activeAvatarSrc ? (
              <img src={activeAvatarSrc} alt="Ảnh đại diện" className="account-avatar-img" />
            ) : (
              <span className="account-avatar-initials">
                {getInitials(profile?.fullName || auth.user?.fullName)}
              </span>
            )}
          </div>

          <label htmlFor="avatar-file-input" className="account-avatar-upload-btn">
            <span>{selectedFile ? 'Đổi ảnh khác' : 'Tải ảnh PNG'}</span>
            <input
              id="avatar-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/png"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
          <span className="account-avatar-hint">Dung lượng tối đa 2 MB</span>

          {selectedFile && (
            <div className="account-file-badge">
              <span>{selectedFile.name}</span>
              <button type="button" onClick={handleReset} className="account-file-remove" aria-label="Hủy tệp">
                ×
              </button>
            </div>
          )}

          <h3 className="account-summary-name">
            {profile?.fullName || auth.user?.fullName || 'Đang tải...'}
          </h3>
          <p className="account-summary-email">{profile?.email || auth.user?.email}</p>

          <div className="account-summary-badges">
            <Badge variant="info">{roleName}</Badge>
            <span className="users-status is-active">Hoạt động</span>
          </div>
        </aside>

        {/* Right Column: Forms */}
        <div className="account-lms-forms">
          {/* Widget 1: Hồ sơ cá nhân */}
          <section className="admin-widget">
            <h2>Hồ sơ cá nhân</h2>
            <p className="account-widget-sub">
              Cập nhật thông tin họ tên, số điện thoại và tiểu sử hiển thị trong hệ thống.
            </p>

            {!profile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <p style={{ margin: 0 }}>Đang tải dữ liệu hồ sơ…</p>
                <button
                  type="button"
                  onClick={() => setReload((n) => n + 1)}
                  style={{ minHeight: '34px', padding: '4px 12px', fontSize: '12px' }}
                >
                  Tải lại
                </button>
              </div>
            ) : (
              <form key={profile.email} onSubmit={saveProfile}>
                <div className="account-form-fields">
                  <div className="account-fields-row">
                    <label>
                      Họ và tên *
                      <input
                        name="fullName"
                        required
                        maxLength={120}
                        defaultValue={profile.fullName}
                        autoComplete="name"
                      />
                    </label>

                    <label>
                      Số điện thoại
                      <input
                        name="phone"
                        type="tel"
                        maxLength={20}
                        defaultValue={profile.phone || ''}
                        autoComplete="tel"
                        placeholder="09xx xxx xxx"
                      />
                    </label>
                  </div>

                  <label>
                    Email (Tài khoản đăng nhập)
                    <input value={profile.email} disabled readOnly />
                  </label>

                  <label>
                    Tiểu sử &amp; Giới thiệu
                    <textarea
                      name="bio"
                      maxLength={1000}
                      defaultValue={profile.bio || ''}
                      placeholder="Chia sẻ đôi nét về vai trò, chuyên môn hoặc định hướng tại TEKY..."
                    />
                  </label>
                </div>

                <div className="account-actions">
                  <button type="submit" disabled={busy} className="users-primary">
                    {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}
                  </button>
                  <button type="reset" disabled={busy} onClick={handleReset}>
                    Hủy thay đổi
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Widget 2: Đổi mật khẩu */}
          <section className="admin-widget">
            <h2>Bảo mật &amp; Đổi mật khẩu</h2>
            <p className="account-widget-sub">
              Đặt mật khẩu mạnh định kỳ để bảo vệ tài khoản của bạn.
            </p>

            {passwordError && (
              <div className="admin-status users-error" role="alert">
                <IconAlertCircle size={18} />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={changePassword}>
              <div className="account-form-fields">
                <label>
                  Mật khẩu hiện tại *
                  <input
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </label>

                <div className="account-fields-row">
                  <label>
                    Mật khẩu mới *
                    <input
                      name="newPassword"
                      type="password"
                      minLength={12}
                      required
                      autoComplete="new-password"
                      placeholder="Tối thiểu 12 ký tự"
                    />
                  </label>

                  <label>
                    Xác nhận mật khẩu mới *
                    <input
                      name="confirmPassword"
                      type="password"
                      minLength={12}
                      required
                      autoComplete="new-password"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </label>
                </div>
              </div>

              <div className="account-pwd-note">
                <strong>Quy chuẩn mật khẩu:</strong> Tối thiểu 12 ký tự (tối đa 72 byte UTF-8). Sau khi thay đổi, tất cả các phiên đăng nhập khác của bạn sẽ tự động đăng xuất để đảm bảo an toàn.
              </div>

              <div className="account-actions">
                <button type="submit" disabled={busy} className="users-primary">
                  {busy ? 'Đang xử lý…' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
