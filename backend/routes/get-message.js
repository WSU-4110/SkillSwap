
const express = require('express');
const db = require('../db');

const router = express.Router();

// Retrieve messages with another student
router.get('/:userId', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  const currentUserId = Number(req.session.userId);
  const userId = req.params.userId;

  if (
    !/^[1-9]\d*$/.test(userId) ||
    Number(userId) > 2147483647
  ) {
    return res.status(400).json({
      message: 'Invalid student ID.'
    });
  }

  const otherUserId = Number(userId);

  if (currentUserId === otherUserId) {
    return res.status(400).json({
      message: 'You cannot retrieve messages with yourself.'
    });
  }

  try {
    // Check whether the students have an accepted request
    const [acceptedRequests] = await db.execute(
      `SELECT id FROM swap_requests
       WHERE status = 'accepted'
       AND (
         (sender_id = ? AND recipient_id = ?)
         OR
         (sender_id = ? AND recipient_id = ?)
       )
       LIMIT 1`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    if (acceptedRequests.length === 0) {
      return res.status(403).json({
        message: 'You can only view messages with students who have an accepted swap request.'
      });
    }

    // Retrieve messages in both directions
    const [messages] = await db.execute(
      `SELECT id, sender_id, receiver_id, content, created_at
       FROM messages
       WHERE
         (sender_id = ? AND receiver_id = ?)
         OR
         (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC, id ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    return res.status(200).json({
      messages
    });
  } catch (error) {
    console.error('Get messages failed:', error.code);

    return res.status(500).json({
      message: 'Could not retrieve messages.'
    });
  }
});

module.exports = router;
