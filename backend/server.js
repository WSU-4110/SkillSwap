const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();

app.use(cors());  // ← NEW
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'SkillSwap backend is running!' });
});

// Receive a request to create an account.
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  // Check that all three values are text.
  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({
      message: 'Name, email, and password are required.'
    });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  // Check the name and email.
  if (
    cleanName.length === 0 ||
    cleanName.length > 100 ||
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return res.status(400).json({
      message: 'Enter a name of 1–100 characters and a valid email.'
    });
  }

  // bcrypt supports passwords up to 72 bytes.
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters and at most 72 bytes.'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [cleanName, cleanEmail, passwordHash]
    );

    return res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'This email is already registered.'
      });
    }

    console.error('Registration failed:', error.code);

    return res.status(500).json({
      message: 'Could not create the account. Please try again.'
    });
  }
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});