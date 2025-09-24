import { jwttoken } from '../utils/jwt.js';
import { cookies } from '../utils/cookies.js';
import logger from '../config/logger.js';

// Middleware to authenticate JWT token
export const authenticateToken = (req, res, next) => {
  try {
    const token =
      cookies.get(req, 'token') || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
    }

    const decoded = jwttoken.verify(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Access denied',
      message: 'Invalid token',
    });
  }
};

// Middleware to check if user has required role(s)
export const requireRole = roles => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Insufficient permissions. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
};
