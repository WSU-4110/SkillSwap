
jest.mock('../db', () => ({
  execute: jest.fn()
}));

const router = require('../routes/get-message');
const db = require('../db');

const getMessageHandler = router.stack.find(
  layer => layer.route?.path === '/:userId' &&
           layer.route.methods.get
).route.stack[0].handle;

describe('Get Message Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Rejects retrieving messages without login', async () => {
    const req = {
      session: {},
      params: {
        userId: '2'
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    await getMessageHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please log in first.'
    });

    expect(db.execute).not.toHaveBeenCalled();
 
});

test('Rejects an invalid student ID', async () => {
  const req = {
    session: { userId: 1 },
    params: {
      userId: '-5'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  await getMessageHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);

  expect(res.json).toHaveBeenCalledWith({
    message: 'Invalid student ID.'
  });

  expect(db.execute).not.toHaveBeenCalled();
});

test('Rejects retrieving messages with yourself', async () => {
  const req = {
    session: { userId: 1 },
    params: {
      userId: '1'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  await getMessageHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);

  expect(res.json).toHaveBeenCalledWith({
    message: 'You cannot retrieve messages with yourself.'
  });

  expect(db.execute).not.toHaveBeenCalled();
});

test('Rejects retrieving messages without an accepted swap request', async () => {
  const req = {
    session: { userId: 1 },
    params: {
      userId: '2'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate no accepted swap request
  db.execute.mockResolvedValueOnce([[]]);

  await getMessageHandler(req, res);

  expect(db.execute).toHaveBeenCalledTimes(1);

  expect(db.execute).toHaveBeenCalledWith(
    expect.stringContaining('SELECT id FROM swap_requests'),
    [1, 2, 2, 1]
  );

  expect(res.status).toHaveBeenCalledWith(403);

  expect(res.json).toHaveBeenCalledWith({
    message: 'You can only view messages with students who have an accepted swap request.'
  });
});

test('Successfully retrieves messages and marks them as read', async () => {
  const req = {
    session: { userId: 1 },
    params: {
      userId: '2'
    }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  const messages = [
    {
      id: 10,
      sender_id: 1,
      receiver_id: 2,
      content: 'Hello!',
      is_read: 1
    },
    {
      id: 11,
      sender_id: 2,
      receiver_id: 1,
      content: 'Hi!',
      is_read: 1
    }
  ];

  // Accepted swap request exists
  db.execute.mockResolvedValueOnce([[{ id: 5 }]]);

  // Simulate successful database update
  db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

  // Simulate retrieving conversation messages
  db.execute.mockResolvedValueOnce([messages]);

  await getMessageHandler(req, res);

  expect(db.execute).toHaveBeenCalledTimes(3);

  expect(db.execute).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('UPDATE messages'),
    [2, 1]
  );

  expect(db.execute).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('SELECT id, sender_id'),
    [1, 2, 2, 1]
  );

  expect(res.status).toHaveBeenCalledWith(200);

  expect(res.json).toHaveBeenCalledWith({
    messages
  });
});

});
