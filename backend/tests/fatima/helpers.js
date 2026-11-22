function response() {
  return {
    statusCode: 200,
    body: undefined,
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json: jest.fn(function (body) { this.body = body; return this; })
  };
}
function setup(Controller) {
  const db = { execute: jest.fn() };
  return { db, controller: new Controller(db), req: { session: { userId: 7 }, body: {}, params: {} }, res: response() };
}
function databaseFailure() {
  return Object.assign(new Error('private database details'), { code: 'ECONNREFUSED' });
}
module.exports = { setup, databaseFailure };
