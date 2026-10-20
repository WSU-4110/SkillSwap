const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const session = require('express-session');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');

const app = express();

// Prevent browsers and shared caches from storing API responses.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
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
const profileImageDir = path.join(__dirname, 'uploads', 'profiles');

const uploadProfileImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 3,
    fieldSize: 16 * 1024
  }
}).single('image');

function receiveProfileImage(req, res, next) {
  uploadProfileImage(req, res, error => {
    if (error) {
      return res.status(400).json({
        message: 'Upload one image of at most 5 MB with your profile details.'
      });
    }

    next();
  });
}

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
// Return only permitted public profile fields.
app.get('/api/users/:userId/profile', requireLogin, async (req, res) => {
  const { userId } = req.params;

  if (!/^[1-9]\d*$/.test(userId) ||
      !Number.isSafeInteger(Number(userId))) {
    return res.status(400).json({
      message: 'Invalid user ID.'
    });
  }

  try {
    const [users] = await db.execute(
      'SELECT name, bio FROM users WHERE id = ?',
      [userId]
    );

    if (!users[0]) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    return res.json({
      profile: {
        name: users[0].name,
        bio: users[0].bio
      }
    });
  } catch (error) {
    console.error('Public profile lookup failed:', error.code);

    return res.status(500).json({
      message: 'Could not load the profile.'
    });
  }
});
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
// Only signed-in users can access their own profile.
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  next();
}

// Read the signed-in user's profile.
app.get('/api/profile', requireLogin, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, name, major, bio, profile_image FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!users[0]) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ profile: users[0] });
  } catch (error) {
    console.error('Profile lookup failed:', error.code);
    return res.status(500).json({
      message: 'Could not load your profile.'
    });
  }
});

// Serve the signed-in user's saved profile image.
app.get('/api/profile/image', requireLogin, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT profile_image FROM users WHERE id = ?',
      [req.session.userId]
    );

    const filename = users[0]?.profile_image;

    if (
      !filename ||
      !/^[a-f0-9-]{36}\.webp$/.test(filename)
    ) {
      return res.status(404).json({ message: 'No profile image.' });
    }

    res.set('Cache-Control', 'private, no-store');

    return res.sendFile(
      path.join(profileImageDir, filename),
      error => {
        if (error && !res.headersSent) {
          res.status(error.statusCode === 404 ? 404 : 500).json({
            message: 'Could not load the profile image.'
          });
        }
      }
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Could not load the profile image.'
    });
  }
});

// Save profile details and an optional image.
app.put(
  '/api/profile',
  requireLogin,
  receiveProfileImage,
  async (req, res) => {
    const { name, major = '', bio = '' } = req.body || {};

    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        message: 'Full name must contain 1–100 characters.'
      });
    }

    if (typeof major !== 'string' || major.length > 100) {
      return res.status(400).json({
        message: 'Major must be text with at most 100 characters.'
      });
    }

    if (typeof bio !== 'string' || bio.length > 500) {
      return res.status(400).json({
        message: 'Bio must be text with at most 500 characters.'
      });
    }

    let imageBuffer;
    let newFilename;

    if (req.file) {
      try {
        const image = sharp(req.file.buffer, {
          limitInputPixels: 25000000
        });

        const metadata = await image.metadata();

        if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
          return res.status(400).json({
            message: 'Choose a JPEG, PNG, or WebP image.'
          });
        }

        imageBuffer = await image
          .rotate()
          .resize(512, 512, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
      } catch (error) {
        return res.status(400).json({
          message: 'The image is invalid or too large to process.'
        });
      }
    }

    try {
      const [users] = await db.execute(
        'SELECT id, profile_image FROM users WHERE id = ?',
        [req.session.userId]
      );

      if (!users[0]) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (imageBuffer) {
        await fs.mkdir(profileImageDir, { recursive: true });
        newFilename = `${randomUUID()}.webp`;

        await fs.writeFile(
          path.join(profileImageDir, newFilename),
          imageBuffer,
          { flag: 'wx' }
        );
      }

      if (newFilename) {
        await db.execute(
          `UPDATE users
           SET name = ?, major = ?, bio = ?, profile_image = ?
           WHERE id = ?`,
          [
            name.trim(),
            major.trim(),
            bio,
            newFilename,
            req.session.userId
          ]
        );
      } else {
        await db.execute(
          'UPDATE users SET name = ?, major = ?, bio = ? WHERE id = ?',
          [name.trim(), major.trim(), bio, req.session.userId]
        );
      }
    } catch (error) {
      // Remove the new upload if saving fails.
      if (newFilename) {
        await fs.unlink(
          path.join(profileImageDir, newFilename)
        ).catch(() => {});
      }

      console.error('Profile update failed:', error.code);

      return res.status(500).json({
        message: 'Could not save your profile. Please try again.'
      });
    }

    return res.json({
      message: 'Profile saved successfully!'
    });
  }
);
// End the current login session.
app.post('/api/logout', requireLogin, (req, res) => {
  req.session.destroy(error => {
    if (error) {
      return res.status(500).json({
        message: 'Could not log out. Please try again.'
      });
    }

    res.clearCookie('skillswap.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    return res.json({
      message: 'Logged out successfully!'
    });
  });
});
// Read the signed-in user's teaching skills.
app.get('/api/skills/teach', requireLogin, async (req, res) => {
  try {
    const [skills] = await db.execute(
      'SELECT id, name FROM teaching_skills WHERE user_id = ? ORDER BY id',
      [req.session.userId]
    );

    return res.json({ skills });
  } catch (error) {
    console.error('Teaching skills lookup failed:', error.code);
    return res.status(500).json({
      message: 'Could not load your teaching skills. Please try again.'
    });
  }
});

// Add a teaching skill to the signed-in user's profile.
app.post('/api/skills/teach', requireLogin, async (req, res) => {
  const { name } = req.body || {};

  if (typeof name !== 'string') {
    return res.status(400).json({
      message: 'Enter a skill name.'
    });
  }

  const cleanName = name.trim().replace(/\s+/g, ' ');

  if (cleanName.length === 0 || cleanName.length > 100) {
    return res.status(400).json({
      message: 'Skill name must contain 1–100 characters.'
    });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO teaching_skills (user_id, name) VALUES (?, ?)',
      [req.session.userId, cleanName]
    );

    return res.status(201).json({
      message: 'Teaching skill added successfully!',
      skill: {
        id: result.insertId,
        name: cleanName
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'This skill is already in your teaching list.'
      });
    }

    console.error('Teaching skill save failed:', error.code);
    return res.status(500).json({
      message: 'Could not save the skill. Please try again.'
    });
  }
});
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});