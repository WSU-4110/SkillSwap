const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRoute(execute) {
  const handlers = {};
  const router = {
    use(handler) { handlers.auth = handler; },
    post(url, handler) { handlers.send = handler; }
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../routes/requests.js'), 'utf8'),
    {
      require(name) {
        if (name === 'express') return { Router: () => router };
        if (name === '../db') return { execute };
        throw new Error('Unexpected dependency');
      },
      module: { exports: {} },
      console: { error() {} }
    }
  );
  return async (session, body) => {
    const req = { session, body };
    const res = {
      code: 200,
      status(code) { this.code = code; return this; },
      json(data) { this.data = JSON.parse(JSON.stringify(data)); return this; }
    };
    let authenticated = false;
    handlers.auth(req, res, () => { authenticated = true; });
    if (authenticated) await handlers.send(req, res);
    return res;
  };
}

const noQuery = async () => { throw new Error('Database must not be called'); };

test('requires a login', async () => {
  const response = await loadRoute(noQuery)(undefined, { recipientId: 2 });
  assert.equal(response.code, 401);
});

test('rejects invalid recipients and self requests before querying', async () => {
  for (const recipientId of [undefined, null, true, '', '2', 0, -1, 1.5, 2147483648, 1]) {
    const response = await loadRoute(noQuery)({ userId: 1 }, { recipientId });
    assert.equal(response.code, 400);
  }
});

test('returns 404 when the recipient does not exist', async () => {
  const response = await loadRoute(async () => [[]])({ userId: 1 }, { recipientId: 2 });
  assert.equal(response.code, 404);
});

test('uses the session sender and returns the saved pending request', async () => {
  const calls = [];
  const send = loadRoute(async (sql, values) => {
    calls.push({ sql, values: Array.from(values) });
    return calls.length === 1 ? [[{ id: 2 }]] : [{ insertId: 7 }];
  });
  const response = await send({ userId: 1 }, { recipientId: 2, senderId: 99, status: 'accepted' });
  assert.equal(response.code, 201);
  assert.deepEqual(calls[0].values, [2]);
  assert.deepEqual(calls[1].values, [1, 2]);
  assert.deepEqual(response.data.request, { id: 7, senderId: 1, recipientId: 2, status: 'pending' });
});

test('handles lookup and insert failures without exposing database errors', async () => {
  for (const failingCall of [1, 2]) {
    let calls = 0;
    const send = loadRoute(async () => {
      if (++calls === failingCall) throw new Error('Private database details');
      return [[{ id: 2 }]];
    });
    const response = await send({ userId: 1 }, { recipientId: 2 });
    assert.equal(response.code, 500);
    assert.equal(response.data.message, 'Could not send the request. Please try again.');
  }
});
