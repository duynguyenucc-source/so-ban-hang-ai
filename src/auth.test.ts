import assert from 'node:assert/strict';
import {
  canMutateData,
  getDemoAccounts,
  loginWithDemoAccount,
  sanitizeSession,
} from './auth';

const accounts = getDemoAccounts();

assert.equal(accounts.length, 3);
assert.equal(loginWithDemoAccount('admin', 'admin123')?.role, 'admin');
assert.equal(loginWithDemoAccount('kho', 'kho123')?.role, 'staff');
assert.equal(loginWithDemoAccount('viewer', 'viewer123')?.role, 'viewer');
assert.equal(loginWithDemoAccount('admin', 'wrong'), null);

assert.equal(canMutateData({ role: 'admin' }), true);
assert.equal(canMutateData({ role: 'staff' }), true);
assert.equal(canMutateData({ role: 'viewer' }), false);
assert.equal(canMutateData(null), false);

assert.deepEqual(sanitizeSession({ role: 'admin', name: 'Admin', username: 'admin' }), {
  role: 'admin',
  name: 'Admin',
  username: 'admin',
});
assert.equal(sanitizeSession({ role: 'invalid', name: 'Bad', username: 'bad' }), null);
