import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) {
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const { getAccessibleFeatures, featureForLocation } = await import('../shared/ui/navigationFeatures.ts');
const { allowsPermission, hasPermission, isAccountAccess } = await import('../shared/auth/accountAccess.ts');
const permission = (code, isGlobal = false, departmentIds = []) => ({ code, description: code, isGlobal, departmentIds });
const account = (roles, permissions = []) => ({ roles, access: { grants: [], permissions } });

test('student retains the five existing learning destinations', () => {
  const items = getAccessibleFeatures(account(['student']));
  assert.deepEqual(items.map(item => item.navId), ['overview','classes','courses','assignments','assessments']);
  assert.deepEqual(items.map(item => item.href), ['/student','/dashboard/timetable','/dashboard/courses','/dashboard/assignments','/dashboard/assessments']);
});

test('all three staff roles are available regardless of primary role or current page', () => {
  const user = account(['teacher','academic_staff','academic_manager'], [permission('course.manage', false, [7]), permission('academic.manage', false, [7])]);
  const items = getAccessibleFeatures(user);
  for (const id of ['teacher.grading','teacher.communication','academic_staff.makeup','academic_staff.kits','academic_manager.teachers','courses.manage']) {
    assert.ok(items.some(item => item.id === id), id);
  }
  assert.ok(!items.some(item => item.id === 'system_admin.users'));
  assert.deepEqual(items, getAccessibleFeatures({...user, primaryRoleId: 2}));
  assert.deepEqual(items, getAccessibleFeatures({...user, primaryRoleId: 6}));
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
});

test('shared course management is deduplicated while different schedules keep distinct destinations', () => {
  const items = getAccessibleFeatures(account(['teacher','academic_staff','academic_manager','system_admin'], [permission('course.manage',true),permission('identity.manage',true)]));
  assert.equal(items.filter(item => item.id === 'courses.manage').length, 1);
  assert.equal(items.find(item => item.id === 'teacher.schedule').href, '/teacher?tab=schedule');
  assert.equal(items.find(item => item.id === 'academic_staff.schedule').href, '/staff?tab=schedule');
  assert.ok(!getAccessibleFeatures(account(['academic_staff'])).some(item => item.navId === 'users'));
});

test('each permission retains its own department scope', () => {
  const access = account([], [permission('content.read', true),permission('content.edit',false,[1]),permission('course.manage',false,[2])]).access;
  assert.ok(allowsPermission(access,'content.read',2));
  assert.ok(allowsPermission(access,'content.edit',1));
  assert.ok(!allowsPermission(access,'content.edit',2));
  assert.ok(!allowsPermission(access,'content.edit'));
  assert.ok(hasPermission(access,'course.manage'));
  assert.ok(!allowsPermission(access,'course.manage',1));
});

test('privileged menu entries require their actual permissions and global identity scope', () => {
  assert.ok(!getAccessibleFeatures(account(['academic_manager'])).some(item => item.permission === 'academic.manage'));
  assert.ok(getAccessibleFeatures(account(['academic_manager'], [permission('academic.manage', false, [7])]))
    .some(item => item.id === 'academic_manager.registrations'));
  assert.ok(!getAccessibleFeatures(account(['system_admin'])).some(item => ['courses.manage','system_admin.users','system_admin.directory'].includes(item.id)));
  assert.ok(!getAccessibleFeatures(account(['academic_manager'],[permission('identity.manage',false,[1])])).some(item => item.id === 'system_admin.users'));
  assert.ok(getAccessibleFeatures(account(['academic_manager'],[permission('course.manage',false,[1])])).some(item => item.id === 'courses.manage'));
});

test('refresh, nested routes and legacy course links identify the same permitted function', () => {
  const items = getAccessibleFeatures(account(['teacher','student','system_admin'],[permission('course.manage',true)]));
  assert.equal(featureForLocation(items,'/teacher','?tab=grading').id,'teacher.grading');
  assert.equal(featureForLocation(items,'/dashboard/courses/4/lessons/9','').id,'student.courses');
  assert.equal(featureForLocation(items,'/admin','?view=courses').id,'courses.manage');
  assert.equal(featureForLocation(items,'/manage/courses','').id,'courses.manage');
  assert.equal(featureForLocation(items,'/teacher','?tab=unknown'),undefined);
});

test('revoking one source keeps shared permissions granted by another role', () => {
  const before = getAccessibleFeatures(account(['academic_manager','system_admin'],[permission('course.manage',true),permission('identity.manage',true)]));
  const after = getAccessibleFeatures(account(['academic_manager'],[permission('course.manage',false,[2])]));
  assert.ok(before.some(item => item.id === 'courses.manage'));
  assert.ok(after.some(item => item.id === 'courses.manage'));
  assert.ok(!after.some(item => item.id === 'system_admin.users'));
});

test('missing and malformed access data cannot become a valid session', () => {
  assert.equal(isAccountAccess(undefined),false);
  assert.equal(isAccountAccess({grants:[{roleId:3}],permissions:[]}),false);
  assert.equal(isAccountAccess({grants:[],permissions:[permission('course.manage',false,['all'])]}),false);
  assert.deepEqual(getAccessibleFeatures(null),[]);
});
