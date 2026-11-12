from pathlib import Path
def edit(p,a,b):
 p=Path(p);s=p.read_text(encoding='utf-8-sig');assert a in s,(p,a);p.write_text(s.replace(a,b),encoding='utf-8')
p='frontend/shared/auth/AuthProvider.tsx'
edit(p,"    const finalRole = claimRole ?? normalizeRole(newRole);","    const finalRole = claimRole ?? (import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true' ? normalizeRole(newRole) : null);\n    if (!finalRole) throw new Error('Vai trò không hợp lệ.');\n    const storage = sessionStorage.getItem('teky_access_token') === newAccessToken ? sessionStorage : localStorage;")
edit(p,"      localStorage.setItem('teky_user', JSON.stringify(merged));","      storage.setItem('teky_user', JSON.stringify(merged));")
for key,value in [('teky_role','finalRole'),('teky_access_token','newAccessToken'),('teky_refresh_token','newRefreshToken'),('teky_token','newAccessToken')]:
 edit(p,f"    localStorage.setItem('{key}', {value});",f"    storage.setItem('{key}', {value});")
edit(p,"      const newToken = localStorage.getItem('teky_access_token') || localStorage.getItem('teky_token');","      const newToken = readStoredToken('teky_access_token') || readStoredToken('teky_token');")
edit(p,"setRefreshToken(localStorage.getItem('teky_refresh_token'));","setRefreshToken(readStoredToken('teky_refresh_token'));\n      setUser(readStoredUser());")
p='frontend/shared/api-client/auth.ts'
edit(p,"      const storage = rememberMe ? localStorage : sessionStorage;","      for (const target of [localStorage, sessionStorage]) for (const key of ['teky_access_token','teky_refresh_token','teky_user','teky_role','teky_token']) target.removeItem(key);\n      const storage = rememberMe ? localStorage : sessionStorage;")
edit(p,"      localStorage.setItem('teky_token', data.data.accessToken);","      storage.setItem('teky_token', data.data.accessToken);")
edit(p,"    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`,", "    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`,") if False else None
s=Path(p).read_text(encoding='utf-8');s=s.replace("const refreshToken = localStorage.getItem('teky_refresh_token');","const refreshToken = localStorage.getItem('teky_refresh_token') || sessionStorage.getItem('teky_refresh_token');")
s=s.replace("      localStorage.setItem('teky_access_token', data.data.accessToken);","      const storage = localStorage.getItem('teky_refresh_token') ? localStorage : sessionStorage;\n      storage.setItem('teky_access_token', data.data.accessToken);")
s=s.replace("      localStorage.setItem('teky_refresh_token', data.data.refreshToken);","      storage.setItem('teky_refresh_token', data.data.refreshToken);\n      storage.setItem('teky_user', JSON.stringify(data.data.user));")
Path(p).write_text(s,encoding='utf-8')
# Login uses validated claims exclusively in real authentication.
for app in ['portal','backoffice']:
 p=f'frontend/{app}/src/pages/auth/LoginPage.tsx'
 edit(p,'        const resolvedRole = claimRole ?? normalizeRole(response.data.user.role);',"        const resolvedRole = claimRole;\n        if (!resolvedRole) throw new Error('Vai trò trong phiên đăng nhập không hợp lệ.');")
 edit(p,"import { loginApi, normalizeRole }", "import { loginApi }")
 edit(p,"    setTimeout(() => {\n      setShowForgotModal(false);\n      setForgotSent(false);\n    }, 2000);", "    setShowForgotModal(false);\n    setForgotSent(false);")
