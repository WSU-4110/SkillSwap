
jest.mock('../db', () => ({
  execute: jest.fn()
}));

const router = require('../routes/conversation-history');
const db = require('../db');

const conversationHistoryHandler = router.stack.find(
  layer => layer.route?.path === '/' &&
           layer.route.methods.get
).route.stack[0].handle;

describe('Conversation History Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Rejects conversation history without login', async () => {
    const req = {
      session: {}
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    await conversationHistoryHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Please log in first.'
    });

    expect(db.execute).not.toHaveBeenCalled();
  });

test('Successfully retrieves conversation history', async () => {
  const req = {
    session: { userId: 1 }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate conversation data from the database
  const conversations = [
    {
      student_id: 2,
      student_name: 'John',
      last_message: 'Hello!',
      last_message_time: '2026-11-21',
      last_sender_id: 2,
      unread_count: 3
    }
  ];

  db.execute.mockResolvedValueOnce([conversations]);

  await conversationHistoryHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);

  expect(res.json).toHaveBeenCalledWith({
    conversations: [
      {
        studentId: 2,
        studentName: 'John',
        lastMessage: 'Hello!',
        lastMessageTime: '2026-11-21',
        lastSenderId: 2,
        unreadCount: 3
      }
    ]
  });

  expect(db.execute).toHaveBeenCalledTimes(1);
});

test('Returns empty list when student has no conversations', async () => {
  const req = {
    session: { userId: 1 }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate no conversations in database
  db.execute.mockResolvedValueOnce([[]]);

  await conversationHistoryHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);

  expect(res.json).toHaveBeenCalledWith({
    conversations: []
  });

  expect(db.execute).toHaveBeenCalledTimes(1);
});

test('Handles database errors correctly', async () => {
  const req = {
    session: { userId: 1 }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate a database failure
  db.execute.mockRejectedValueOnce(
    new Error('Database connection failed')
  );

  const consoleSpy = jest.spyOn(console, 'error')
    .mockImplementation(() => {});

  try {
    await conversationHistoryHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Could not retrieve conversation history.'
    });

    expect(db.execute).toHaveBeenCalledTimes(1);
  } finally {
    consoleSpy.mockRestore();
  }
});

test('Correctly converts unread message counts to numbers', async () => {
  const req = {
    session: { userId: 1 }
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  // Simulate two conversations
  const conversations = [
    {
      student_id: 2,
      student_name: 'John',
      last_message: 'Hello!',
      last_message_time: '2026-11-21',
      last_sender_id: 2,
      unread_count: '3'
    },
    {
      student_id: 3,
      student_name: 'Sarah',
      last_message: 'Thank you!',
      last_message_time: '2026-11-20',
      last_sender_id: 1,
      unread_count: '0'
    }
  ];

  db.execute.mockResolvedValueOnce([conversations]);

  await conversationHistoryHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(200);

  expect(res.json).toHaveBeenCalledWith({
    conversations: [
      {
        studentId: 2,
        studentName: 'John',
        lastMessage: 'Hello!',
        lastMessageTime: '2026-11-21',
        lastSenderId: 2,
        unreadCount: 3
      },
      {
        studentId: 3,
        studentName: 'Sarah',
        lastMessage: 'Thank you!',
        lastMessageTime: '2026-11-20',
        lastSenderId: 1,
        unreadCount: 0
      }
    ]
  });
});

});
