const express = require('express');
const db = require('../db');

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Please log in first.' });
  }

  next();
});

// Show another user's public profile and skills.
router.get('/:userId/profile', async (req, res) => {
  const { userId } = req.params;

  if (!/^[1-9]\d*$/.test(userId) || !Number.isSafeInteger(Number(userId))) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  try {
    const [users] = await db.execute(
      'SELECT id, name, major, bio FROM users WHERE id = ?',
      [userId]
    );

    if (!users[0]) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [teachingSkills] = await db.execute(
      'SELECT name FROM teaching_skills WHERE user_id = ? ORDER BY id',
      [userId]
    );
    const [learningSkills] = await db.execute(
      'SELECT name FROM learning_skills WHERE user_id = ? ORDER BY id',
      [userId]
    );

    const user = users[0];

    return res.json({
      profile: {
        id: user.id,
        name: user.name,
        major: user.major,
        bio: user.bio,
        teachSkills: teachingSkills.map(skill => skill.name),
        learnSkills: learningSkills.map(skill => skill.name)
      }
    });
  } catch (error) {
    console.error('Could not load user profile:', error.code);
    return res.status(500).json({
      message: 'Could not load this profile. Please try again.'
    });
  }
});

module.exports = router;
