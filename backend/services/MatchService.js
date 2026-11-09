
const db = require('../db');

class MatchService {
  constructor(strategy) {
    this.strategy = strategy;
  }

  async findMatches(userId) {
    const [rows] = await db.execute(
      `SELECT DISTINCT u.id, u.name, u.major,
              t.name AS matchingSkill
       FROM users u
       JOIN teaching_skills t ON t.user_id = u.id
       JOIN learning_skills l
         ON ${this.strategy.getCondition()}
       WHERE l.user_id = ? AND u.id <> ?
       ORDER BY u.name, u.id, t.name`,
      [userId, userId]
    );

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

    return Array.from(matches.values());
  }
}

module.exports = MatchService;
