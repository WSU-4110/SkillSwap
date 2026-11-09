
class PartialMatchStrategy {
  getCondition() {
    return `LOWER(TRIM(t.name)) LIKE
            CONCAT('%', LOWER(TRIM(l.name)), '%')`;
  }

  getSearchCondition() {
    return 'LOWER(TRIM(t.name)) LIKE ?';
  }

  getSearchValue(skill) {
    return `%${skill.toLowerCase()}%`;
  }
}

module.exports = PartialMatchStrategy;
