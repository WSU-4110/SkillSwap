
const express = require('express');
const db = require('../db');
const PartialMatchStrategy = require('../strategies/PartialMatchStrategy');

const router = express.Router();

// Require login
router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }
  next();
});

// Search users by teaching skill
router.get('/', async (req, res) => {
  const skill = String(req.query.skill || '').trim();
  const userId = req.session.userId;

  if (!skill) {
    return res.status(400).json({
      message: 'Please enter a skill to search.'
    });
  }

  try {
    // Select the partial matching strategy
    const strategy = new PartialMatchStrategy();

    const [users] = await db.execute(
      `SELECT DISTINCT u.id, u.name, u.major
       FROM users u
       JOIN teaching_skills t ON t.user_id = u.id
       WHERE ${strategy.getSearchCondition()}
         AND u.id <> ?
       ORDER BY u.name, u.id`,
      [strategy.getSearchValue(skill), userId]
    );

    return res.json({
      users,
      message: users.length === 0
        ? 'No users found with that skill.'
        : ''
    });

  } catch (error) {
    console.error('Search error:', error.code);
    return res.status(500).json({
      message: 'Could not search users.'
    });
  }
});

module.exports = router;
