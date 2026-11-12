from pathlib import Path
def edit(p,a,b):
 p=Path(p);s=p.read_text(encoding='utf-8-sig');assert a in s,(p,a);p.write_text(s.replace(a,b),encoding='utf-8')
p='frontend/shared/auth/shellTransfer.ts'
edit(p,'  const encoded = toBase64Url(JSON.stringify(payload));\n  return `${normalizedOrigin}${normalizedPath}${SSO_HASH_PREFIX}${encoded}`;', "  void payload;\n  const start = encodeURIComponent(JSON.stringify({ source: window.location.origin, path: normalizedPath }));\n  return `${normalizedOrigin}/#shell-start=${start}`;")
edit(p,'function toBase64Url(', 'export function toBase64Url(')
edit(p,'  const encoded = hash.slice(SSO_HASH_PREFIX.length);', "  window.history.replaceState(null, '', '/login');\n  return null;\n  const encoded = hash.slice(SSO_HASH_PREFIX.length);")
p='frontend/shared/auth/AuthProvider.tsx'
edit(p,"import { consumeSsoPayload } from './shellTransfer';", "import { consumeSsoPayload } from './shellTransfer';\nimport { processShellHandshake, shellHandshakePending } from './shellHandshake';\nlet handshakeStarted = false;")
edit(p,'  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());', "  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());\n  const [handshakeError, setHandshakeError] = useState('');\n  useEffect(() => {\n    if (!shellHandshakePending() || handshakeStarted) return;\n    handshakeStarted = true;\n    processShellHandshake().catch(error => setHandshakeError(error instanceof Error ? error.message : 'Không thể chuyển phiên.'));\n  }, []);")
edit(p,'  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;', '  if (shellHandshakePending()) return <main className="p-8" role="status">{handshakeError || "Đang chuyển đến giao diện của bạn…"}{handshakeError && <a href="/login"> Đăng nhập lại</a>}</main>;\n  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;')
p='database/migrations/20261113_account_security.txt'
s=Path(p).read_text(encoding='utf-8')
s=s.replace('Cross-app routing currently retains the existing hash-fragment session transfer; replacing this with a standard identity-provider flow remains necessary for production cross-origin SSO.', 'Cross-app handoff uses a 30-second single-use code and destination-held PKCE verifier. Configure Shells__PortalOrigin and Shells__BackofficeOrigin alongside frontend VITE_PORTAL_ORIGIN and VITE_BACKOFFICE_ORIGIN and CORS origins. The handoff ticket store is process-local: use one API instance or sticky routing until replaced with a distributed ticket store. Use HTTPS outside localhost.')
Path(p).write_text(s,encoding='utf-8')
