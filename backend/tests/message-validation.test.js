
const { isValidMessageContent } = require('../routes/send-message');

describe('Message Validation Unit Tests', () => {

  test('Accepts a valid message', () => {
    expect(isValidMessageContent('Hello!')).toBe(true);
  });

  test('Rejects an empty message', () => {
    expect(isValidMessageContent('')).toBe(false);
  });

  test('Rejects a message containing only spaces', () => {
    expect(isValidMessageContent('   ')).toBe(false);
  });

  test('Rejects a message longer than 2000 characters', () => {
    expect(isValidMessageContent('A'.repeat(2001))).toBe(false);
  });

  test('Accepts a message with exactly 2000 characters', () => {
    expect(isValidMessageContent('A'.repeat(2000))).toBe(true);
  });

  test('Rejects non-string messages', () => {
    expect(isValidMessageContent(123)).toBe(false);
    expect(isValidMessageContent(null)).toBe(false);
  });

});

