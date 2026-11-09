const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRoute(execute) {
  const handlers = {};
  const router = {
    use(fn) { handlers.auth = fn; },
    patch(url, fn) { handlers.respond = fn; }
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../routes/reject-request.js'), 'utf8'),
    {
      require(name) {
        if (name === 'express') return { Router: () => router };
        if (name === '../db') return { execute };
        throw new Error('Unexpected dependency');
      },
      module: { exports: {} }, console: { error() {} }
    }
  );
  return async (session, requestId, body = {}) => {
    const res = {
      code: 200,
      status(code) { this.code = code; return this; },
      json(data) { this.data = JSON.parse(JSON.stringify(data)); return this; }
    };
    const req = { session, params: { requestId }, body };
    let authorized = false;
    handlers.auth(req, res, () => { authorized = true; });
    if (authorized) await handlers.respond(req, res);
    return res;
  };
}

const noQuery = async () => { throw new Error('No query expected'); };

test('requires login before changing a request', async () => {
  assert.equal((await loadRoute(noQuery)(undefined, '7')).code, 401);
});

test('rejects invalid IDs', async () => {
  for (const id of ['0', '-1', '1.5', 'abc', '1 OR 1=1', '2147483648', '']) {
    assert.equal((await loadRoute(noQuery)({ userId: 2 }, id)).code, 400);
  }
});

test('changes only the pending request addressed to the session user', async () => {
  const respond = loadRoute(async (sql, values) => {
    assert.match(sql, /UPDATE swap_requests SET status = 'rejected'/);
    assert.match(sql, /WHERE id = \? AND recipient_id = \? AND status = 'pending'/);
    assert.deepEqual(Array.from(values), [7, 2]);
    return [{ affectedRows: 1 }];
  });
  const res = await respond({ userId: 2 }, '7', { recipientId: 99, status: 'wrong' });
  assert.equal(res.code, 200);
  assert.deepEqual(res.data.request, { id: 7, status: 'rejected' });
});

test('hides missing requests and requests addressed to other users', async () => {
  for (const userId of [1, 3]) {
    let calls = 0;
    const respond = loadRoute(async (sql, values) => {
      assert.deepEqual(Array.from(values), [7, userId]);
      assert.match(sql, /recipient_id = \?/);
      return ++calls === 1 ? [{ affectedRows: 0 }] : [[]];
    });
    assert.equal((await respond({ userId }, '7')).code, 404);
  }
});

test('returns conflict when another response already handled the request', async () => {
  let calls = 0;
  const respond = loadRoute(async () => ++calls === 1 ? [{ affectedRows: 0 }] : [[{ id: 7 }]]);
  assert.equal((await respond({ userId: 2 }, '7')).code, 409);
  assert.equal(calls, 2);
});

test('reports failed writes and lookups without a success response', async () => {
  for (const failingCall of [1, 2]) {
    let calls = 0;
    const respond = loadRoute(async () => {
      if (++calls === failingCall) throw new Error('Private database details');
      return [{ affectedRows: 0 }];
    });
    const res = await respond({ userId: 2 }, '7');
    assert.equal(res.code, 500);
    assert.equal(res.data.message, 'Could not reject the request. Please try again.');
  }
});
