/**
 * auth.js
 * JWT Authentication middleware.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'cybex-super-secret-jwt-key-2026';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account is inactive or no longer exists.' });
    }

    req.user = user;
    req.userId = user.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

// Optional Auth (doesn't reject if not authenticated, but attaches req.user if valid)
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        req.userId = user.userId;
      }
    } catch (e) {}
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  JWT_SECRET
};