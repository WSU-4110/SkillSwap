const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const session = require('express-session');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(session({
  name: 'skillswap.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000
  }
}));

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
// Log in an existing user.
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.trim().length === 0 ||
    email.trim().length > 254 ||
    password.length === 0 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      message: 'Enter a valid email and password.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const [users] = await db.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [cleanEmail]
    );

    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        message: 'Incorrect email or password.'
      });
    }

    // Create a new session ID after successful authentication.
    req.session.regenerate(error => {
      if (error) {
        return res.status(500).json({
          message: 'Could not log in. Please try again.'
        });
      }

      req.session.userId = user.id;

      req.session.save(error => {
        if (error) {
          return req.session.destroy(() => {
            res.status(500).json({
              message: 'Could not log in. Please try again.'
            });
          });
        }

        return res.status(200).json({
          message: 'Logged in successfully!',
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        });
      });
    });
  } catch (error) {
    console.error('Login failed:', error.code);

    return res.status(500).json({
      message: 'Could not log in. Please try again.'
    });
  }
});
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});