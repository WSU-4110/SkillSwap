const express = require('express');
const db = require('../db');

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Please log in first.' });
  }
  next();
});

// List only the signed-in user's incoming and outgoing requests.
router.get('/', async (req, res) => {
  const { direction = 'all', status, offset = '0' } = req.query;
  if (!['all', 'incoming', 'outgoing'].includes(direction)) {
    return res.status(400).json({ message: 'Choose all, incoming, or outgoing requests.' });
  }
  if (status !== undefined && !['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Choose pending, accepted, or rejected status.' });
  }
  if (typeof offset !== 'string' || !/^\d+$/.test(offset) || Number(offset) > 1000000) {
    return res.status(400).json({ message: 'Invalid page offset.' });
  }

  const userId = req.session.userId;
  let condition = '(r.sender_id = ? OR r.recipient_id = ?)';
  const values = [userId, userId];

  if (direction !== 'all') {
    condition = direction === 'incoming' ? 'r.recipient_id = ?' : 'r.sender_id = ?';
    values.pop();
  }
  if (status !== undefined) {
    condition += ' AND r.status = ?';
    values.push(status);
  }

  try {
    // Fetch one extra row to tell the frontend whether another page exists.
    const [rows] = await db.execute(
      `SELECT r.id, r.sender_id AS senderId, sender.name AS senderName,
              r.recipient_id AS recipientId, recipient.name AS recipientName,
              r.status, r.created_at AS createdAt
       FROM swap_requests r
       JOIN users sender ON sender.id = r.sender_id
       JOIN users recipient ON recipient.id = r.recipient_id
       WHERE ${condition}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 51 OFFSET ${Number(offset)}`,
      values
    );

    const requests = rows.slice(0, 50).map(row => ({
      id: row.id,
      senderId: row.senderId,
      senderName: row.senderName,
      recipientId: row.recipientId,
      recipientName: row.recipientName,
      status: row.status,
      createdAt: row.createdAt,
      direction: row.recipientId === userId ? 'incoming' : 'outgoing'
    }));

    return res.json({
      requests,
      nextOffset: rows.length > 50 ? Number(offset) + 50 : null
    });
  } catch (error) {
    console.error('Request list failed:', error.code);
    return res.status(500).json({ message: 'Could not load requests. Please try again.' });
  }
});

module.exports = router;
