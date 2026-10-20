const express = require('express');
const db = require('../db');

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Please log in first.' });
  }

  next();
});

// Find other users who teach a skill this user wants to learn.
router.get('/', async (req, res) => {
  const userId = req.session.userId;

  try {
    const [learningSkills] = await db.execute(
      'SELECT id FROM learning_skills WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (learningSkills.length === 0) {
      return res.json({
        users: [],
        message: 'Add a skill you want to learn to find matches.'
      });
    }

    const [rows] = await db.execute(
      `SELECT DISTINCT u.id, u.name, u.major, t.name AS matchingSkill
       FROM users u
       JOIN teaching_skills t ON t.user_id = u.id
       JOIN learning_skills l
         ON LOWER(TRIM(t.name)) COLLATE utf8mb4_bin =
            LOWER(TRIM(l.name)) COLLATE utf8mb4_bin
       WHERE l.user_id = ? AND u.id <> ?
       ORDER BY u.name, u.id, t.name`,
      [userId, userId]
    );

    // Keep one entry per user, with all of their matching skills.
    const matches = new Map();

    for (const row of rows) {
      if (!matches.has(row.id)) {
        matches.set(row.id, {
          id: row.id,
          name: row.name,
          major: row.major,
          matchingSkills: []
        });
      }

      matches.get(row.id).matchingSkills.push(row.matchingSkill);
    }

    const users = Array.from(matches.values());

    return res.json({
      users,
      message: users.length === 0 ? 'No matching users are available yet.' : ''
    });
  } catch (error) {
    console.error('Could not find skill matches:', error.code);
    return res.status(500).json({
      message: 'Could not load matches. Please try again.'
    });
  }
});

module.exports = router;
