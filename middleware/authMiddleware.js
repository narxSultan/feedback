import jwt from 'jsonwebtoken';

export const protectAdmin = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];  // Get token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your_secret_key');  // Verify token
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to access this resource' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
