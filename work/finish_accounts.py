from pathlib import Path
def edit(p,a,b):
 p=Path(p);s=p.read_text(encoding='utf-8-sig')
 if b in s: return
 assert a in s,(p,a)
 p.write_text(s.replace(a,b),encoding='utf-8')
for app in ['portal','backoffice']:
 p=f'frontend/{app}/src/App.tsx'
 edit(p,"import { Navigate,", "import { AccountPage } from '@teky/shared/account/AccountPage';\nimport { RecoveryPage } from '@teky/shared/account/RecoveryPage';\nimport { Navigate,")
 edit(p,'      <Routes>','      {isAccountVisible && <a href="/account" className="fixed bottom-4 left-4 z-50 rounded-xl bg-blue-700 px-4 py-3 text-white shadow-md focus-visible:ring-2">Tài khoản</a>}\n      <Routes>\n        <Route path="/account" element={<AccountPage />} />\n        <Route path="/forgot-password" element={<RecoveryPage />} />')
 edit(p,'  const navigate = useNavigate();','  const navigate = useNavigate();\n  const isAccountVisible = useAuth().isLoggedIn;')
 p=f'frontend/{app}/src/pages/auth/LoginPage.tsx'
 edit(p,'    setForgotSent(true);',"    window.location.assign('/forgot-password');\n    return;\n    setForgotSent(true);")
 edit(p,"if (response.errors?.some(","if (import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true' && response.errors?.some(")
 # Remove token fragments and implementation details from success UI.
 start=Path(p).read_text(encoding='utf-8').index('        const roleSource =')
 s=Path(p).read_text(encoding='utf-8');end=s.index('        const accessToken =',start)
 s=s[:start]+"        setTokenIssuedNotice('Đăng nhập thành công. Đang mở trang của bạn…');\n"+s[end:];Path(p).write_text(s,encoding='utf-8')
edit('frontend/shared/auth/jwt.ts',"const parsedRoleId = roleIdRaw !== undefined ? Number.parseInt(roleIdRaw, 10) : Number.NaN;","const parsedRoleId = roleIdRaw !== undefined ? Number(roleIdRaw) : typeof payload.role_id === 'number' ? payload.role_id : Number.NaN;")
edit('frontend/shared/auth/jwt.ts',"const parsedExp = expRaw !== undefined ? Number.parseInt(expRaw, 10) : Number.NaN;","const parsedExp = expRaw !== undefined ? Number(expRaw) : typeof payload.exp === 'number' ? payload.exp : Number.NaN;")
edit('frontend/shared/auth/shellConfig.ts',"    return SHELL_BY_ROLE.student;","    return { app: 'portal', path: '/login', label: 'Đăng nhập', labelEn: 'Login' };")
edit('frontend/shared/auth/shellConfig.ts','return SHELL_BY_ROLE[role] ?? SHELL_BY_ROLE.student;','return SHELL_BY_ROLE[role] ?? { app: \'portal\', path: \'/login\', label: \'Đăng nhập\', labelEn: \'Login\' };')
# Avoid JWT/stored-role fallback opening a dashboard without valid claims.
edit('frontend/shared/auth/AuthProvider.tsx',"    return (stored as AuthContextType['role']) || null;","    return import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true' ? (stored as AuthContextType['role']) || null : null;")
edit('frontend/shared/auth/AuthProvider.tsx','    isLoggedIn: !!accessToken,','    isLoggedIn: !!accessToken && !!role,')
edit('frontend/shared/auth/AuthProvider.tsx',"      setClaims(decodeJwtClaims(newToken));","      setClaims(decodeJwtClaims(newToken));\n      setRole(roleFromClaims(decodeJwtClaims(newToken)));")
edit('backend/src/TekyLearningHub.Api/Controllers/AuthController.cs','[HttpPost("login")]','[Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("account")]\n    [HttpPost("login")]')
# Only trust the connection address unless forwarded-header middleware is configured.
edit('backend/src/TekyLearningHub.Api/Controllers/AuthController.cs','if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded))','if (false && Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded))')
