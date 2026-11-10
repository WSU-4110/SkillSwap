
const express = require('express');
const db = require('../db');

const router = express.Router();

// FR09 - Get conversation history
router.get('/', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  const currentUserId = Number(req.session.userId);

  try {
    // Find students with whom the user has exchanged messages
    const [conversations] = await db.execute(
      `SELECT
         u.id AS student_id,
         u.name AS student_name,
         m.content AS last_message,
         m.created_at AS last_message_time,
         m.sender_id AS last_sender_id
       FROM messages m
       JOIN users u
         ON u.id = CASE
           WHEN m.sender_id = ? THEN m.receiver_id
           ELSE m.sender_id
         END
       WHERE (m.sender_id = ? OR m.receiver_id = ?)
         AND m.id = (
           SELECT m2.id
           FROM messages m2
           WHERE
             (m2.sender_id = ? AND m2.receiver_id = u.id)
             OR
             (m2.sender_id = u.id AND m2.receiver_id = ?)
           ORDER BY m2.created_at DESC, m2.id DESC
           LIMIT 1
         )
         AND EXISTS (
           SELECT 1
           FROM swap_requests sr
           WHERE sr.status = 'accepted'
             AND (
               (sr.sender_id = ? AND sr.recipient_id = u.id)
               OR
               (sr.sender_id = u.id AND sr.recipient_id = ?)
             )
         )
       ORDER BY m.created_at DESC, m.id DESC`,
      [
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId
      ]
    );

    return res.status(200).json({ conversations });
  } catch (error) {
    console.error('Conversation history failed:', error.code);

    return res.status(500).json({
      message: 'Could not retrieve conversation history.'
    });
  }
});

module.exports = router;
