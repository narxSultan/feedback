const jwt = require('jsonwebtoken');

function signUserToken(user, sessionId) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      sessionType: 'user',
      sessionId
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function signAdminToken(admin, sessionId) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'admin',
      sessionType: 'admin',
      sessionId
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

module.exports = { signUserToken, signAdminToken };
