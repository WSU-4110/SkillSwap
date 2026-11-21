
jest.mock('../db', () => ({
  execute: jest.fn()
}));

const router = require('../routes/send-message');
const db = require('../db');

const sendMessageHandler = router.stack.find(
  layer => layer.route?.path === '/' &&
           layer.route.methods.post
).route.stack[0].handle;

describe('Send Message Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Rejects a user who is not logged in', async () => {
    const req = {
      session: {},
      body: {
        receiverId: 2,
        content: 'Hello!'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    await sendMessageHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Please log in first.'
    });
    expect(db.execute).not.toHaveBeenCalled();
  });
  test('Rejects an empty message', async () => {
    const req = {
      session: { userId: 1 },
      body: {
        receiverId: 2,
        content: ''
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    await sendMessageHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.execute).not.toHaveBeenCalled();
  });

test('Rejects an invalid receiver ID', async () => {
  const req = {
    session: { userId: 1 },
    body: {
      receiverId: -5,
      content: 'Hello!'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  await sendMessageHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.execute).not.toHaveBeenCalled();
});

test('Rejects sending a message to yourself', async () => {
  const req = {
    session: { userId: 1 },
    body: {
      receiverId: 1,
      content: 'Hello!'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  await sendMessageHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    message: 'You cannot message yourself.'
  });
  expect(db.execute).not.toHaveBeenCalled();
});

test('Rejects a receiver who does not exist', async () => {
  const req = {
    session: { userId: 1 },
    body: {
      receiverId: 999,
      content: 'Hello!'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate database returning no matching users
  db.execute.mockResolvedValueOnce([[]]);

  await sendMessageHandler(req, res);

  expect(db.execute).toHaveBeenCalledWith(
    'SELECT id FROM users WHERE id = ?',
    [999]
  );

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({
    message: 'Receiver not found.'
  });
});

test('Rejects messaging without an accepted swap request', async () => {
  const req = {
    session: { userId: 1 },
    body: {
      receiverId: 2,
      content: 'Hello!'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Receiver exists in the database
  db.execute.mockResolvedValueOnce([[{ id: 2 }]]);

  // No accepted swap request exists
  db.execute.mockResolvedValueOnce([[]]);

  await sendMessageHandler(req, res);

  expect(db.execute).toHaveBeenCalledTimes(2);

  expect(res.status).toHaveBeenCalledWith(403);

  expect(res.json).toHaveBeenCalledWith({
    message: 'You can only message students with an accepted swap request.'
  });
});

});
