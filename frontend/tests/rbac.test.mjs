import { afterEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Execute the actual shared TypeScript modules without adding a test runtime dependency.
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) {
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return { format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
      }).outputText };
    return next(url, context);
  },
});

const { verifySession, loginApi, refreshTokenApi, clearAuthSession, logoutApi } = await import('../shared/api-client/auth.ts');
const { decodeJwtClaims, roleFromClaims, isTokenExpired } = await import('../shared/auth/jwt.ts');
const { PUBLIC_ORIGIN, PORTAL_ORIGIN, BACKOFFICE_ORIGIN, resolveShellForRole, shellOrigin } = await import('../shared/auth/shellConfig.ts');
const { buildCrossAppUrl } = await import('../shared/auth/shellTransfer.ts');
const { processShellHandshake } = await import('../shared/auth/shellHandshake.ts');
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear() };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
afterEach(() => { mock.restoreAll(); localStorage.clear(); sessionStorage.clear(); delete globalThis.window; });
const token = (claims = {}) => ['header', Buffer.from(JSON.stringify({ nameid: '42', role_id: 1, role: 'student',
  exp: Math.floor(Date.now() / 1000) + 3600, ...claims })).toString('base64url'), 'signature'].join('.');
const user = (roleId = 1, role = 'student') => ({ userId: 42, roleId, role, roles: [role], status: 'Active', fullName: 'Student' });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('verifies all role memberships while retaining the primary dashboard role', async () => {
  const accessToken = token({ role_id: 2, role_name: 'teacher', role: ['teacher', 'academic_staff'] });
  mock.method(globalThis, 'fetch', async () => reply({ success: true, data: { ...user(2, 'teacher'), roles: ['academic_staff', 'teacher'] } }));
  const verified = await verifySession(accessToken, null);
  assert.equal(verified.role, 'teacher');
  assert.deepEqual(verified.user.roles, ['academic_staff', 'teacher']);
});

test('rejects stale secondary role grants even if the primary role still matches', async () => {
  mock.method(globalThis, 'fetch', async () => reply({ success: true, data: user(2, 'teacher') }));
  await assert.rejects(verifySession(token({ role_id: 2, role: ['teacher', 'academic_staff'] }), null));
});

for (const [roleId, role] of [[1, 'student'], [2, 'teacher'], [3, 'system_admin'], [4, 'parent'], [5, 'academic_staff'], [6, 'academic_manager']]) {
  test(`uses server-verified identity for ${role}, ignoring cached role and profile`, async () => {
    localStorage.setItem('teky_role', 'system_admin');
    localStorage.setItem('teky_user', JSON.stringify(user(3, 'system_admin')));
    const accessToken = token({ role_id: roleId, role });
    const fetch = mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, '/api/auth/me');
      assert.equal(options.headers.Authorization, `Bearer ${accessToken}`);
      return reply({ success: true, data: user(roleId, role) });
    });
    const verified = await verifySession(accessToken, null);
    assert.equal(verified.role, role);
    assert.equal(verified.user.userId, 42);
    assert.equal(fetch.mock.callCount(), 1);
  });
}

for (const status of [401, 403, 500]) {
  test(`rejects a token when server verification returns ${status}`, async () => {
    mock.method(globalThis, 'fetch', async () => reply({}, status));
    await assert.rejects(verifySession(token({ role_id: 3, role: 'system_admin' }), null));
  });
}

for (const invalid of ['jwt-demo-token-bcrypt-verified', 'header.payload', token({ exp: 1 }), token({ role_id: 99, role: 'system_admin' }), token({ exp: 'Infinity' })]) {
  test('rejects invalid, expired, or unknown-role tokens before opening a session', async () => {
    const fetch = mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
    await assert.rejects(verifySession(invalid, null));
    assert.equal(fetch.mock.callCount(), 0);
  });
}

test('rejects a changed role, wrong identity, or disabled account from /auth/me', async () => {
  for (const data of [user(3, 'system_admin'), { ...user(), userId: 99 }, { ...user(), status: 'Inactive' }, { ...user(), role: 'system_admin' }]) {
    mock.method(globalThis, 'fetch', async () => reply({ success: true, data }));
    await assert.rejects(verifySession(token(), null));
    mock.restoreAll();
  }
});

test('API connection failure cannot create a demo login', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  const result = await loginApi('student@teky.edu.vn', 'test-password');
  assert.equal(result.success, false);
  assert.equal(localStorage.getItem('teky_access_token'), null);
  assert.equal(sessionStorage.getItem('teky_token'), null);
});

test('remember-me disabled stores tokens only for this browser session', async () => {
  mock.method(globalThis, 'fetch', async () => reply({ success: true, data: { accessToken: token(), refreshToken: 'refresh', user: user() } }));
  assert.equal((await loginApi('student', 'test-password', false)).success, true);
  assert.equal(localStorage.getItem('teky_access_token'), null);
  assert.ok(sessionStorage.getItem('teky_access_token'));
  assert.equal(sessionStorage.getItem('teky_role'), null);
});

test('concurrent refreshes rotate once and cannot restore a logged-out session', async () => {
  sessionStorage.setItem('teky_refresh_token', 'old-refresh');
  let resolve;
  const fetch = mock.method(globalThis, 'fetch', () => new Promise(done => { resolve = done; }));
  const first = refreshTokenApi();
  const second = refreshTokenApi();
  assert.equal(first, second);
  clearAuthSession();
  resolve(reply({ success: true, data: { accessToken: token(), refreshToken: 'new-refresh', user: user() } }));
  assert.equal(await first, false);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(sessionStorage.getItem('teky_access_token'), null);
});

test('JWT decoding fails closed for malformed payloads and invalid role IDs', () => {
  assert.equal(decodeJwtClaims('a.bnVsbA.c'), null);
  assert.equal(decodeJwtClaims('a.W10.c'), null);
  assert.equal(roleFromClaims({ roleId: 99, role: 'system_admin' }), null);
  assert.equal(isTokenExpired(token({ exp: 'Infinity' })), true);
});

test('logout clears immediately and its delayed response cannot erase a newer login', async () => {
  localStorage.setItem('teky_access_token', 'old-access');
  localStorage.setItem('teky_refresh_token', 'old-refresh');
  let resolve;
  mock.method(globalThis, 'fetch', () => new Promise(done => { resolve = done; }));
  const pending = logoutApi();
  assert.equal(localStorage.getItem('teky_access_token'), null);
  sessionStorage.setItem('teky_access_token', 'new-access');
  sessionStorage.setItem('teky_refresh_token', 'new-refresh');
  resolve(reply({ success: true }));
  await pending;
  assert.equal(sessionStorage.getItem('teky_access_token'), 'new-access');
  assert.equal(sessionStorage.getItem('teky_refresh_token'), 'new-refresh');
});

for (const [roleId, role, destination, path] of [
  [1, 'student', PORTAL_ORIGIN, '/student'],
  [2, 'teacher', BACKOFFICE_ORIGIN, '/teacher'],
  [3, 'system_admin', BACKOFFICE_ORIGIN, '/admin'],
  [4, 'parent', PORTAL_ORIGIN, '/parent'],
  [5, 'academic_staff', BACKOFFICE_ORIGIN, '/staff'],
  [6, 'academic_manager', BACKOFFICE_ORIGIN, '/academic-manager'],
]) {
  for (const rememberMe of [false, true]) {
    test(`public login transfers ${role} with remember-me ${rememberMe}`, async () => {
      const origins = new Map();
      const navigations = [];
      const visit = url => {
        const location = new URL(url);
        if (!origins.has(location.origin)) origins.set(location.origin, { local: storage(), session: storage() });
        const current = origins.get(location.origin);
        globalThis.localStorage = current.local;
        globalThis.sessionStorage = current.session;
        globalThis.window = { location: {
          origin: location.origin, hash: location.hash,
          replace: next => navigations.push(new URL(next, location.origin).href),
        } };
      };
      const accessToken = token({ role_id: roleId, role });
      const transferredToken = token({ role_id: roleId, role, jti: 'transferred' });
      const identity = user(roleId, role);
      let challenge;
      let exchanges = 0;
      mock.method(globalThis, 'fetch', async (url, options) => {
        const body = options.body ? JSON.parse(options.body) : null;
        if (url === '/api/auth/login') {
          assert.equal(body.rememberMe, rememberMe);
          return reply({ success: true, data: { accessToken, refreshToken: 'source-refresh', user: identity } });
        }
        if (url === '/api/auth/me') return reply({ success: true, data: identity });
        if (url === '/api/auth/shell-transfer') {
          assert.equal(window.location.origin, PUBLIC_ORIGIN);
          assert.equal(options.headers.Authorization, `Bearer ${accessToken}`);
          assert.equal(body.refreshToken, 'source-refresh');
          assert.equal(body.destination, destination);
          challenge = body.challenge;
          return reply({ code: 'one-use-code' });
        }
        assert.equal(url, '/api/auth/shell-transfer/exchange');
        assert.equal(window.location.origin, destination);
        assert.equal(body.code, 'one-use-code');
        assert.equal(createHash('sha256').update(body.verifier).digest('base64url'), challenge);
        exchanges++;
        return reply({ success: true, data: { accessToken: transferredToken, refreshToken: 'destination-refresh', user: identity } });
      });

      visit(`${PUBLIC_ORIGIN}/login`);
      assert.equal((await loginApi('test-user', 'test-password', rememberMe)).success, true);
      const verified = await verifySession(accessToken, 'source-refresh');
      const target = resolveShellForRole(verified.role);
      assert.equal(shellOrigin(target.app), destination);
      assert.equal(target.path, path);
      visit(buildCrossAppUrl(shellOrigin(target.app), target.path, { accessToken }));
      // Stale destination state must not override the newly authenticated account.
      localStorage.setItem('teky_role', 'system_admin');
      localStorage.setItem('teky_access_token', 'stale-token');
      await processShellHandshake();
      visit(navigations.at(-1));
      await processShellHandshake();
      visit(navigations.at(-1));
      await processShellHandshake();

      assert.equal(navigations.at(-1), `${destination}${path}`);
      assert.equal(exchanges, 1);
      assert.equal(sessionStorage.getItem('teky_handoff'), null);
      assert.equal(localStorage.getItem('teky_role'), null);
      const persisted = rememberMe ? localStorage : sessionStorage;
      const other = rememberMe ? sessionStorage : localStorage;
      assert.equal(persisted.getItem('teky_access_token'), transferredToken);
      assert.equal(persisted.getItem('teky_refresh_token'), 'destination-refresh');
      assert.equal(other.getItem('teky_access_token'), null);
      assert.equal(other.getItem('teky_refresh_token'), null);
      assert.equal((await verifySession(transferredToken, 'destination-refresh')).role, role);
      for (const url of navigations) {
        assert.ok(!decodeURIComponent(url).includes(accessToken));
        assert.ok(!decodeURIComponent(url).includes('source-refresh'));
        assert.ok(!decodeURIComponent(url).includes(transferredToken));
      }
    });
  }
}

test('public app can initiate a handoff but cannot receive one', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
  for (const hash of [
    `#shell-start=${encodeURIComponent(JSON.stringify({ source: PORTAL_ORIGIN, path: '/student' }))}`,
    `#shell-authorize=${encodeURIComponent(JSON.stringify({ destination: PUBLIC_ORIGIN }))}`,
    `#shell-code=${encodeURIComponent(JSON.stringify({ code: 'code', state: 'state' }))}`,
  ]) {
    globalThis.window = { location: { origin: PUBLIC_ORIGIN, hash } };
    await assert.rejects(processShellHandshake());
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('handoff rejects an unknown source and an external return path', async () => {
  for (const start of [
    { source: 'https://unknown.example', path: '/student' },
    { source: PUBLIC_ORIGIN, path: '//unknown.example/student' },
  ]) {
    globalThis.window = { location: { origin: PORTAL_ORIGIN,
      hash: `#shell-start=${encodeURIComponent(JSON.stringify(start))}` } };
    await assert.rejects(processShellHandshake());
    assert.equal(sessionStorage.getItem('teky_handoff'), null);
  }
});

test('handoff rejects a changed state or expired request before exchanging a code', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
  globalThis.window = { location: { origin: PORTAL_ORIGIN,
    hash: `#shell-code=${encodeURIComponent(JSON.stringify({ code: 'code', state: 'expected' }))}` } };
  for (const pending of [
    { state: 'changed', createdAt: Date.now() },
    { state: 'expected', createdAt: Date.now() - 61000 },
  ]) {
    sessionStorage.setItem('teky_handoff', JSON.stringify(pending));
    await assert.rejects(processShellHandshake());
    assert.equal(sessionStorage.getItem('teky_handoff'), null);
  }
  assert.equal(fetch.mock.callCount(), 0);
});
