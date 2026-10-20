const express = require('express');
const db = require('../db');

const router = express.Router();

// Only logged-in users can access their learning skills.
router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  next();
});

// Get the user's learning skills.
router.get('/', async (req, res) => {
  try {
    const [skills] = await db.execute(
      'SELECT id, name FROM learning_skills WHERE user_id = ? ORDER BY id',
      [req.session.userId]
    );

    return res.json({ skills });
  } catch (error) {
    console.error('Could not load learning skills:', error.code);

    return res.status(500).json({
      message: 'Could not load your learning skills. Please try again.'
    });
  }
});

// Add a skill the user wants to learn.
router.post('/', async (req, res) => {
  const { name } = req.body || {};

  if (typeof name !== 'string') {
    return res.status(400).json({
      message: 'Enter a skill name.'
    });
  }

  const cleanName = name.trim().replace(/\s+/g, ' ');

  if (cleanName.length === 0 || cleanName.length > 100) {
    return res.status(400).json({
      message: 'Skill name must contain 1–100 characters.'
    });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO learning_skills (user_id, name) VALUES (?, ?)',
      [req.session.userId, cleanName]
    );

    return res.status(201).json({
      message: 'Learning skill added successfully!',
      skill: {
        id: result.insertId,
        name: cleanName
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'This skill is already in your learning list.'
      });
    }

    console.error('Could not save learning skill:', error.code);

    return res.status(500).json({
      message: 'Could not save the skill. Please try again.'
    });
  }
});

module.exports = router;