const jwt = require('jsonwebtoken');
const UserModel = require('../../services/user/userModel');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message, 'Token:', token?.substring(0, 20) + '...');
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await UserModel.findById(decoded.userId);
      req.user = user;
    } catch (error) {
      // Token invalid but continue without user
      req.user = null;
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth
};