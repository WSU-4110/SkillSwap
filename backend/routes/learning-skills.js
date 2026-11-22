const express = require('express');
const db = require('../db');
const LearningSkillsController = require('../controllers/LearningSkillsController');
const controller = new LearningSkillsController(db);

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
router.get('/', controller.listSkills.bind(controller));

// Add a skill the user wants to learn.
router.post('/', controller.addSkill.bind(controller));

module.exports = router;
