
const express = require('express');
const db = require('../db');
const MatchService = require('../services/MatchService');
const ExactMatchStrategy = require('../strategies/ExactMatchStrategy');

const router = express.Router();

// Require users to log in.
router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  next();
});

// Find students with matching skills.
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

    // Select the exact matching strategy.
    const strategy = new ExactMatchStrategy();

    // Pass the strategy to the matching service.
    const matchService = new MatchService(strategy);

    // Find matching students.
    const users = await matchService.findMatches(userId);

    return res.json({
      users,
      message: users.length === 0
        ? 'No matching users are available yet.'
        : ''
    });

  } catch (error) {
    console.error('Could not find skill matches:', error.code);

    return res.status(500).json({
      message: 'Could not load matches. Please try again.'
    });
  }
});

module.exports = router;
