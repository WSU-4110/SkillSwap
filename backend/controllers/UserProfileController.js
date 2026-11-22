class UserProfileController {
  constructor(db) {
    this.db = db;
  }

  async getProfile(req, res) {
    const { userId } = req.params;

    if (
      !/^[1-9]\d*$/.test(userId) ||
      !Number.isSafeInteger(Number(userId))
    ) {
      return res.status(400).json({
        message: 'Invalid user ID.'
      });
    }

    try {
      const [users] = await this.db.execute(
        'SELECT name, major, bio FROM users WHERE id = ?',
        [userId]
      );

      if (!users[0]) {
        return res.status(404).json({
          message: 'User not found.'
        });
      }

      const [teachingSkills] = await this.db.execute(
        'SELECT name FROM teaching_skills WHERE user_id = ? ORDER BY id',
        [userId]
      );

      const [learningSkills] = await this.db.execute(
        'SELECT name FROM learning_skills WHERE user_id = ? ORDER BY id',
        [userId]
      );

      return res.json({
        profile: {
          name: users[0].name,
          major: users[0].major,
          bio: users[0].bio,
          teachSkills: teachingSkills.map(skill => skill.name),
          learnSkills: learningSkills.map(skill => skill.name)
        }
      });
    } catch (error) {
      console.error('Public profile lookup failed:', error.code);

      return res.status(500).json({
        message: 'Could not load the profile.'
      });
    }
  }
}

module.exports = UserProfileController;
