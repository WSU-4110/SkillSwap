
jest.mock('../db', () => ({
  execute: jest.fn()
}));

const router = require('../routes/search-users');
const db = require('../db');
const searchHandler = router.stack.find(
  layer => layer.route?.path === '/' &&
           layer.route.methods.get
).route.stack[0].handle;

// Get the login middleware
const loginMiddleware = router.stack.find(
  layer => !layer.route
).handle;

describe('Search Students Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Rejects searching without login', () => {
    const req = {
      session: {}
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    const next = jest.fn();

    loginMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please log in first.'
    });

    expect(next).not.toHaveBeenCalled();

    expect(db.execute).not.toHaveBeenCalled();
  });

test('Successfully searches students by teaching skill', async () => {
  const req = {
    session: { userId: 1 },
    query: { skill: 'JavaScript' }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  const users = [
    { id: 2, name: 'John', major: 'Computer Science' }
  ];

  db.execute.mockResolvedValueOnce([users]);

  await searchHandler(req, res);

  expect(db.execute).toHaveBeenCalledWith(
    expect.stringContaining('SELECT DISTINCT'),
    ['%javascript%', 1]
  );

  expect(res.json).toHaveBeenCalledWith({
    users,
    message: ''
  });
});

test('Rejects searching without entering a skill', async () => {
  const req = {
    session: { userId: 1 },
    query: { skill: '' }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  await searchHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(400);

  expect(res.json).toHaveBeenCalledWith({
    message: 'Please enter a skill to search.'
  });

  expect(db.execute).not.toHaveBeenCalled();
});

test('Returns a message when no students are found', async () => {
  const req = {
    session: { userId: 1 },
    query: { skill: 'Python' }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate no matching students
  db.execute.mockResolvedValueOnce([[]]);

  await searchHandler(req, res);

  expect(res.json).toHaveBeenCalledWith({
    users: [],
    message: 'No users found with that skill.'
  });

  expect(db.execute).toHaveBeenCalledWith(
    expect.stringContaining('SELECT DISTINCT'),
    ['%python%', 1]
  );
});

test('Handles database errors during student search', async () => {
  const req = {
    session: { userId: 1 },
    query: { skill: 'JavaScript' }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate a database error
  db.execute.mockRejectedValueOnce(
    new Error('Database connection failed')
  );

  const consoleSpy = jest.spyOn(console, 'error')
    .mockImplementation(() => {});

  try {
    await searchHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Could not search users.'
    });

    expect(db.execute).toHaveBeenCalledTimes(1);
  } finally {
    consoleSpy.mockRestore();
  }
});

test('Allows logged-in students to continue searching', () => {
  const req = {
    session: { userId: 1 }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  const next = jest.fn();

  loginMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json).not.toHaveBeenCalled();
  expect(db.execute).not.toHaveBeenCalled();
});

});
