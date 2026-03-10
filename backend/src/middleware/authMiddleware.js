const jwt = require('jsonwebtoken');
const sessionService = require('../services/sessionService');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sessionId) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const session = await sessionService.getSessionById(decoded.sessionId);
    if (!session) {
      return res.status(401).json({ message: 'Session not found or expired' });
    }

    const tokenSessionType = decoded.sessionType || session.account_type;
    if (session.account_type && tokenSessionType && session.account_type !== tokenSessionType) {
      return res.status(401).json({ message: 'Session mismatch' });
    }

    const lastActivity = new Date(session.last_activity).getTime();
    const idleMs = Date.now() - lastActivity;
    if (idleMs > sessionService.SESSION_IDLE_TIMEOUT_MS) {
      await sessionService.deleteSession(session.session_id);
      return res.status(401).json({ message: 'Session expired due to inactivity' });
    }

    await sessionService.refreshSession(session.session_id);
    req.actor = decoded;
    if (decoded.role === 'admin') {
      req.admin = decoded;
    }
    if (decoded.role === 'user') {
      req.user = decoded;
    }
    req.session = session;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.actor || req.actor.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

function requireUser(req, res, next) {
  if (!req.actor || req.actor.role !== 'user') {
    return res.status(403).json({ message: 'User access required' });
  }
  return next();
}

module.exports = { authMiddleware, requireAdmin, requireUser };
