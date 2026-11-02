const db = require('./db');

async function testConnection() {
  try {
    await db.query('SELECT 1');
    console.log('Connected to MySQL successfully!');
  } catch (error) {
    console.error('Connection failed:', error.message);
  } finally {
    await db.end();
  }
}

testConnection();