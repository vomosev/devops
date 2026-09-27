const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { HttpError } = require('../middleware/errorHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SALT_ROUNDS = 10;

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    jobTitle: row.job_title || '',
    createdAt: row.created_at,
  };
}

async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, job_title, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function signup(req, res, next) {
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const jobTitle =
      typeof body.jobTitle === 'string'
        ? body.jobTitle.trim()
        : typeof body.job_title === 'string'
        ? body.job_title.trim()
        : '';

    if (name.length < 2 || name.length > 120) {
      throw new HttpError(400, 'Please provide your full name (2-120 characters).');
    }
    if (!EMAIL_RE.test(email) || email.length > 190) {
      throw new HttpError(400, 'Please provide a valid email address.');
    }
    if (password.length < 8 || password.length > 200) {
      throw new HttpError(400, 'Password must be at least 8 characters long.');
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      throw new HttpError(409, 'An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let insertId;
    try {
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, job_title) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, 'learner', jobTitle || null]
      );
      insertId = result.insertId;
    } catch (dbErr) {
      if (dbErr && dbErr.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'An account with that email already exists.');
      }
      throw dbErr;
    }

    const user = await findUserById(insertId);

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        return next(regenErr);
      }
      req.session.userId = insertId;
      req.session.save((saveErr) => {
        if (saveErr) {
          return next(saveErr);
        }
        return res.status(201).json({ user: sanitizeUser(user) });
      });
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required.');
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, job_title, created_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const row = rows[0];
    if (!row) {
      throw new HttpError(401, 'Incorrect email or password.');
    }

    const matches = await bcrypt.compare(password, row.password_hash || '');
    if (!matches) {
      throw new HttpError(401, 'Incorrect email or password.');
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        return next(regenErr);
      }
      req.session.userId = row.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          return next(saveErr);
        }
        return res.json({ user: sanitizeUser(row) });
      });
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  if (!req.session) {
    return res.json({ ok: true });
  }
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie('devops.sid', {
      httpOnly: true,
      sameSite: 'none',
      secure: process.env.SSL_ENABLED === 'true',
      path: '/',
    });
    return res.json({ ok: true });
  });
}

async function me(req, res, next) {
  try {
    const userId = req.userId || (req.session && req.session.userId);
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }
    const user = await findUserById(userId);
    if (!user) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      throw new HttpError(401, 'Authentication required');
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.userId || (req.session && req.session.userId);
    if (!userId) {
      throw new HttpError(401, 'Authentication required');
    }

    const body = req.body || {};
    const current = await findUserById(userId);
    if (!current) {
      throw new HttpError(404, 'User not found');
    }

    let name = current.name;
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120) {
        throw new HttpError(400, 'Name must be between 2 and 120 characters.');
      }
      name = body.name.trim();
    }

    let jobTitle = current.job_title;
    const rawJob = body.jobTitle !== undefined ? body.jobTitle : body.job_title;
    if (rawJob !== undefined) {
      if (rawJob !== null && typeof rawJob !== 'string') {
        throw new HttpError(400, 'Job title must be text.');
      }
      const trimmed = (rawJob || '').trim();
      if (trimmed.length > 150) {
        throw new HttpError(400, 'Job title must be 150 characters or fewer.');
      }
      jobTitle = trimmed || null;
    }

    await pool.query('UPDATE users SET name = ?, job_title = ? WHERE id = ?', [name, jobTitle, userId]);

    const updated = await findUserById(userId);
    return res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  logout,
  me,
  updateProfile,
  sanitizeUser,
};