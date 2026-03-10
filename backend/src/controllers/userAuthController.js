const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const sessionService = require('../services/sessionService');
const { signUserToken, signAdminToken } = require('../utils/tokenHelper');

async function registerUser(req, res, next) {
  try {
    const { name, email, password, organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await pool.query(
      `INSERT INTO users (name, email, password_hash, organization, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, name, email, organization, role, profile_image_url, created_at`,
      [name, email, passwordHash, organization || null]
    );

    const user = inserted.rows[0];
    const sessionId = await sessionService.createSession({
      accountType: 'user',
      accountId: user.id,
      deviceInfo: req.headers['user-agent'] || null
    });

    return res.status(201).json({
      token: signUserToken(user, sessionId),
      user,
    });
  } catch (error) {
    return next(error);
  }
}

async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userResult = await pool.query(
      `SELECT id, name, email, password_hash, organization, role, profile_image_url
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length) {
      const user = userResult.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.role === 'admin') {
        let adminResult = await pool.query(
          `SELECT id, name, email, profile_image_url
           FROM admins
           WHERE linked_user_id = $1
           LIMIT 1`,
          [user.id]
        );

        if (!adminResult.rows.length) {
          adminResult = await pool.query(
            `INSERT INTO admins (name, email, password_hash, profile_image_url, linked_user_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email)
             DO UPDATE SET
               linked_user_id = COALESCE(admins.linked_user_id, EXCLUDED.linked_user_id),
               name = EXCLUDED.name,
               password_hash = EXCLUDED.password_hash,
               profile_image_url = COALESCE(EXCLUDED.profile_image_url, admins.profile_image_url)
             RETURNING id, name, email, profile_image_url`,
            [user.name, user.email, user.password_hash, user.profile_image_url || null, user.id]
          );
        }

        const admin = adminResult.rows[0];
        const sessionId = await sessionService.createSession({
          accountType: 'admin',
          accountId: admin.id,
          deviceInfo: req.headers['user-agent'] || null
        });

        return res.json({
          token: signAdminToken(admin, sessionId),
          user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            organization: user.organization,
            role: 'admin',
            profile_image_url: admin.profile_image_url,
          },
        });
      }

      const sessionId = await sessionService.createSession({
        accountType: 'user',
        accountId: user.id,
        deviceInfo: req.headers['user-agent'] || null
      });

      return res.json({
        token: signUserToken(user, sessionId),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          organization: user.organization,
          role: user.role,
          profile_image_url: user.profile_image_url,
        },
      });
    }

    // Legacy admin login support through user login form.
    const adminResult = await pool.query(
      `SELECT id, name, email, password_hash, profile_image_url
       FROM admins
       WHERE email = $1`,
      [email]
    );

    if (!adminResult.rows.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = adminResult.rows[0];
    const adminOk = await bcrypt.compare(password, admin.password_hash);
    if (!adminOk) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const sessionId = await sessionService.createSession({
      accountType: 'admin',
      accountId: admin.id,
      deviceInfo: req.headers['user-agent'] || null
    });

    return res.json({
      token: signAdminToken(admin, sessionId),
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        organization: null,
        role: 'admin',
        profile_image_url: admin.profile_image_url,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const result = await pool.query(
      `SELECT id, email
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (!result.rows.length) {
      return res.json({
        message: 'Email not found',
        emailExists: false,
      });
    }

    const user = result.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    await pool.query(
      `UPDATE users
       SET reset_token_hash = $1,
           reset_token_expires_at = $2
       WHERE id = $3`,
      [tokenHash, expiresAt, user.id]
    );

    return res.json({
      message: 'Email verified. Set your new password.',
      emailExists: true,
      resetToken: rawToken,
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'token and valid newPassword are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const result = await pool.query(
      `SELECT id, reset_token_expires_at
       FROM users
       WHERE reset_token_hash = $1`,
      [tokenHash]
    );

    if (!result.rows.length) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];
    if (!user.reset_token_expires_at || new Date(user.reset_token_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           reset_token_hash = NULL,
           reset_token_expires_at = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };
