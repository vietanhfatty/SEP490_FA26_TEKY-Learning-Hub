import { afterEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
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
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear() };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
afterEach(() => { mock.restoreAll(); localStorage.clear(); sessionStorage.clear(); });
const token = (claims = {}) => ['header', Buffer.from(JSON.stringify({ nameid: '42', role_id: 1, role: 'student',
  exp: Math.floor(Date.now() / 1000) + 3600, ...claims })).toString('base64url'), 'signature'].join('.');
const user = (roleId = 1, role = 'student') => ({ userId: 42, roleId, role, status: 'Active', fullName: 'Student' });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

for (const [roleId, role] of [[1, 'student'], [2, 'teacher'], [3, 'admin'], [4, 'parent'], [5, 'staff'], [6, 'academic_manager']]) {
  test(`uses server-verified identity for ${role}, ignoring cached role and profile`, async () => {
    localStorage.setItem('teky_role', 'admin');
    localStorage.setItem('teky_user', JSON.stringify(user(3, 'admin')));
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
    await assert.rejects(verifySession(token({ role_id: 3, role: 'admin' }), null));
  });
}

for (const invalid of ['jwt-demo-token-bcrypt-verified', 'header.payload', token({ exp: 1 }), token({ role_id: 99, role: 'admin' }), token({ exp: 'Infinity' })]) {
  test('rejects invalid, expired, or unknown-role tokens before opening a session', async () => {
    const fetch = mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
    await assert.rejects(verifySession(invalid, null));
    assert.equal(fetch.mock.callCount(), 0);
  });
}

test('rejects a changed role, wrong identity, or disabled account from /auth/me', async () => {
  for (const data of [user(3, 'admin'), { ...user(), userId: 99 }, { ...user(), status: 'Inactive' }, { ...user(), role: 'admin' }]) {
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
  assert.equal(roleFromClaims({ roleId: 99, role: 'admin' }), null);
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
