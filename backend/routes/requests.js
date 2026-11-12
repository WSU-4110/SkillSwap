const express = require('express');
const db = require('../db');

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Please log in first.' });
  }
  next();
});

// Send a swap request to another student.
router.post('/', async (req, res) => {
  const senderId = req.session.userId;
  const { recipientId } = req.body || {};

  if (!Number.isInteger(recipientId) || recipientId < 1 || recipientId > 2147483647) {
    return res.status(400).json({ message: 'Choose a valid student.' });
  }

  if (recipientId === senderId) {
    return res.status(400).json({ message: 'You cannot send a request to yourself.' });
  }

  try {
    const [users] = await db.execute(
      'SELECT id FROM users WHERE id = ?',
      [recipientId]
    );

    if (!users[0]) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const [result] = await db.execute(
      'INSERT INTO swap_requests (sender_id, recipient_id) VALUES (?, ?)',
      [senderId, recipientId]
    );

    return res.status(201).json({
      message: 'Swap request sent!',
      request: {
        id: result.insertId,
        senderId,
        recipientId,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Send request failed:', error.code);
    return res.status(500).json({
      message: 'Could not send the request. Please try again.'
    });
  }
});

module.exports = router;
