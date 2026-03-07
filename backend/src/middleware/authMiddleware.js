const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.actor = decoded;
    if (decoded.role === 'admin') {
      req.admin = decoded;
    }
    if (decoded.role === 'user') {
      req.user = decoded;
    }
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
