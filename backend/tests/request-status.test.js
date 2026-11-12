const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(execute) {
  const handlers = {};
  const router = { use(fn) { handlers.auth = fn; }, get(url, fn) { handlers.list = fn; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/request-status.js'), 'utf8'), {
    require(name) {
      if (name === 'express') return { Router: () => router };
      if (name === '../db') return { execute };
      throw new Error('Unexpected dependency');
    }, module: { exports: {} }, console: { error() {} }
  });
  return async (session, query = {}) => {
    const res = { code: 200, status(code) { this.code = code; return this; },
      json(data) { this.data = JSON.parse(JSON.stringify(data)); return this; } };
    const req = { session, query };
    let allowed = false;
    handlers.auth(req, res, () => { allowed = true; });
    if (allowed) await handlers.list(req, res);
    return res;
  };
}

test('logged-out requests never reach the database', async () => {
  let called = false;
  const res = await setup(async () => { called = true; return [[]]; })(undefined);
  assert.equal(res.code, 401); assert.equal(called, false);
});

test('rejects bad filters and offsets before querying', async () => {
  for (const query of [{ direction: 'bad' }, { status: 'bad' }, { status: ['pending'] },
    { offset: '-1' }, { offset: '0 OR 1=1' }, { offset: '1000001' }, { offset: ['0'] }]) {
    let called = false;
    const res = await setup(async () => { called = true; return [[]]; })({ userId: 2 }, query);
    assert.equal(res.code, 400); assert.equal(called, false);
  }
});

test('scopes all requests to the session and exposes only public fields', async () => {
  const list = setup(async (sql, values) => {
    assert.match(sql, /WHERE \(r.sender_id = \? OR r.recipient_id = \?\)/);
    assert.deepEqual(Array.from(values), [2, 2]);
    return [[{ id: 7, senderId: 1, senderName: 'A', recipientId: 2, recipientName: 'B',
      status: 'pending', createdAt: '2026-11-09', email: 'private', password_hash: 'private' }]];
  });
  const res = await list({ userId: 2 }, { userId: '99' });
  assert.equal(res.code, 200);
  assert.deepEqual(res.data.requests[0], { id: 7, senderId: 1, senderName: 'A', recipientId: 2,
    recipientName: 'B', status: 'pending', createdAt: '2026-11-09', direction: 'incoming' });
});

test('incoming and outgoing filters use only the signed-in user', async () => {
  for (const direction of ['incoming', 'outgoing']) {
    const list = setup(async (sql, values) => {
      assert.ok(sql.includes(`WHERE r.${direction === 'incoming' ? 'recipient' : 'sender'}_id = ? AND r.status = ?`));
      assert.deepEqual(Array.from(values), [2, 'accepted']); return [[]];
    });
    const res = await list({ userId: 2 }, { direction, status: 'accepted' });
    assert.deepEqual(res.data, { requests: [], nextOffset: null });
  }
});

test('returns 50 rows with a next offset when another page exists', async () => {
  const list = setup(async (sql) => {
    assert.match(sql, /ORDER BY r.created_at DESC, r.id DESC/);
    assert.match(sql, /LIMIT 51 OFFSET 50/);
    return [Array.from({ length: 51 }, (_, id) => ({ id, senderId: 2, recipientId: 3, status: 'rejected' }))];
  });
  const res = await list({ userId: 2 }, { offset: '50' });
  assert.equal(res.data.requests.length, 50);
  assert.equal(res.data.requests[0].direction, 'outgoing');
  assert.equal(res.data.nextOffset, 100);
});

test('database errors return a generic error', async () => {
  const res = await setup(async () => { throw new Error('private details'); })({ userId: 2 });
  assert.equal(res.code, 500);
  assert.equal(res.data.message, 'Could not load requests. Please try again.');
});
