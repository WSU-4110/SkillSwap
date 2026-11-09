class ExactMatchStrategy {
  getCondition() {
    return `LOWER(TRIM(t.name)) COLLATE utf8mb4_bin =
            LOWER(TRIM(l.name)) COLLATE utf8mb4_bin`;
  }
}

module.exports = ExactMatchStrategy;