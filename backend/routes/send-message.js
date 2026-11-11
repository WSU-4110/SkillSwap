
const express = require('express');
const db = require('../db');

const router = express.Router();

// Send a message to another student
router.post('/', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  const senderId = req.session.userId;
  const { receiverId, content } = req.body || {};

  if (
    !/^[1-9]\d*$/.test(String(receiverId)) ||
!Number.isSafeInteger(Number(receiverId)) ||
Number(receiverId) > 2147483647 ||
    typeof content !== 'string' ||
    !content.trim() ||
    content.length > 2000
  ) {
    return res.status(400).json({
      message: 'Enter a valid receiver and message (1–2000 characters).'
    });
  }

  if (Number(receiverId) === senderId) {
    return res.status(400).json({
      message: 'You cannot message yourself.'
    });
  }

  try {
    const [users] = await db.execute(
      'SELECT id FROM users WHERE id = ?',
      [Number(receiverId)]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: 'Receiver not found.'
      });
    }

    
    // Only allow messaging after a swap request is accepted.
    const [acceptedRequests] = await db.execute(
      `SELECT id FROM swap_requests
       WHERE status = 'accepted'
       AND (
         (sender_id = ? AND recipient_id = ?)
         OR
         (sender_id = ? AND recipient_id = ?)
       )
       LIMIT 1`,
      [senderId, Number(receiverId), Number(receiverId), senderId]
    );

    if (acceptedRequests.length === 0) {
      return res.status(403).json({
        message: 'You can only message students with an accepted swap request.'
      });
    }

    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [senderId, Number(receiverId), content.trim()]
    );

    return res.status(201).json({
      message: 'Message sent successfully!',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Send message failed:', error.code);
    return res.status(500).json({
      message: 'Could not send message.'
    });
  }
});

module.exports = router;
