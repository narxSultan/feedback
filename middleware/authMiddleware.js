import jwt from "jsonwebtoken";

const secretKey = process.env.JWT_SECRET || "supersecretkey";

export const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authorization token missing or invalid' });
    }
    
    try {
      const decoded = jwt.verify(token, secretKey); // Verify the token
      req.user = decoded; // Attach the decoded user info to the request
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token format or expired token' });
    }
    
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};
