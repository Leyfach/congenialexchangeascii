const jwt = require('jsonwebtoken');
const UserModel = require('../../services/user/userModel');
const fs = require('fs');
const path = require('path');

// Load users from file (for compatibility with server.js)
function loadUsersFromFile() {
  try {
    const usersFile = path.join(__dirname, '../../data/users.json');
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, 'utf8');
      return JSON.parse(data).users || [];
    }
  } catch (error) {
    console.error('Error loading users from file:', error);
  }
  return [];
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Handle demo tokens for backward compatibility
  if (token === 'demo-token-demo') {
    req.user = {
      id: 'demo',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      accountType: 'demo'
    };
    return next();
  }

  // Handle old-style demo tokens (demo-token-{id})
  if (token.startsWith('demo-token-')) {
    const userId = token.replace('demo-token-', '');
    const fileUsers = loadUsersFromFile();
    const user = fileUsers.find(u => u.id.toString() === userId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Handle registered user tokens from file storage (old token system)
  const fileUsers = loadUsersFromFile();
  const fileUser = fileUsers.find(u => u.token === token);
  if (fileUser) {
    req.user = fileUser;
    return next();
  }

  // Handle JWT tokens
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Always try file storage first since database might not be available
    const fileUsers = loadUsersFromFile();
    let user = fileUsers.find(u => u.id === parseInt(decoded.userId) || u.id === decoded.userId);
    
    // If not found in file, try database
    if (!user) {
      try {
        user = await UserModel.findById(decoded.userId);
      } catch (dbError) {
        console.log('Database not available, user not found in files');
      }
    }
    
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
    // Handle demo tokens
    if (token === 'demo-token-demo') {
      req.user = {
        id: 'demo',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User',
        accountType: 'demo'
      };
      return next();
    }

    // Handle old-style demo tokens
    if (token.startsWith('demo-token-')) {
      const userId = token.replace('demo-token-', '');
      const fileUsers = loadUsersFromFile();
      const user = fileUsers.find(u => u.id.toString() === userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Handle registered user tokens from file storage
    const fileUsers = loadUsersFromFile();
    const fileUser = fileUsers.find(u => u.token === token);
    if (fileUser) {
      req.user = fileUser;
      return next();
    }

    // Handle JWT tokens
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Always try file storage first since database might not be available
      const fileUsers = loadUsersFromFile();
      let user = fileUsers.find(u => u.id === parseInt(decoded.userId) || u.id === decoded.userId);
      
      // If not found in file, try database
      if (!user) {
        try {
          user = await UserModel.findById(decoded.userId);
        } catch (dbError) {
          console.log('Database not available, user not found in files');
        }
      }
      
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