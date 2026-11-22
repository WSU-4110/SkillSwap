const express = require('express');
const db = require('../db');
const SkillMatchesController = require('../controllers/SkillMatchesController');
const controller = new SkillMatchesController(db);

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Please log in first.' });
  }

  next();
});

// Find other users who teach a skill this user wants to learn.
router.get('/', controller.findMatches.bind(controller));

module.exports = router;
