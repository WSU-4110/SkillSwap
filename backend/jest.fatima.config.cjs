module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/fatima/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: ['controllers/*.js'],
  coverageDirectory: 'coverage/fatima',
  coverageReporters: ['text', 'json-summary', 'html'],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 }
  }
};
