const express = require('express');
const db = require('../db');

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Please log in first.' });
  }
  next();
});

router.patch('/:requestId/reject', async (req, res) => {
  const { requestId } = req.params;
  if (!/^[1-9]\d*$/.test(requestId) || Number(requestId) > 2147483647) {
    return res.status(400).json({ message: 'Invalid request ID.' });
  }

  try {
    // Check the recipient and pending status in the update itself so concurrent
    // accept/reject actions cannot overwrite each other.
    const [result] = await db.execute(
      `UPDATE swap_requests SET status = 'rejected'
       WHERE id = ? AND recipient_id = ? AND status = 'pending'`,
      [Number(requestId), req.session.userId]
    );

    if (result.affectedRows === 0) {
      const [requests] = await db.execute(
        'SELECT id FROM swap_requests WHERE id = ? AND recipient_id = ?',
        [Number(requestId), req.session.userId]
      );

      if (!requests[0]) {
        return res.status(404).json({ message: 'Request not found.' });
      }

      return res.status(409).json({ message: 'This request is no longer pending.' });
    }

    return res.json({
      message: 'Swap request rejected!',
      request: { id: Number(requestId), status: 'rejected' }
    });
  } catch (error) {
    console.error('Request reject failed:', error.code);
    return res.status(500).json({
      message: 'Could not reject the request. Please try again.'
    });
  }
});

module.exports = router;
