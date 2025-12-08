/**
 * Authentication Middleware
 */

const logger = require('../utils/logger');
const userRepository = require('../db/userRepository');
const { validateFingerprint, generateFingerprint } = require('../utils/deviceFingerprint');

/**
 * Middleware to validate device fingerprint
 * Checks if the current request matches the device that created the session
 */
function validateDeviceFingerprint(req, res, next) {
  if (req.session && req.session.userId && req.session.deviceFingerprint) {
    const isValid = validateFingerprint(req, req.session);
    
    if (!isValid) {
      logger.warn('Device fingerprint mismatch - possible session hijacking', {
        userId: req.session.userId,
        url: req.originalUrl,
        ip: req.ip
      });
      
      // Destroy the session for security
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session on fingerprint mismatch', err);
        }
      });
      
      return res.status(401).json({
        error: 'Session invalid',
        message: 'Your session has been invalidated for security reasons. Please log in again.',
        redirect: '/login?error=session_invalid'
      });
    }
    
    // Update last activity timestamp
    req.session.lastActivity = Date.now();
  }
  
  next();
}

/**
 * Middleware to require authentication
 * Checks if user is logged in via session and validates device fingerprint
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    // Validate device fingerprint for authenticated users
    if (req.session.deviceFingerprint) {
      const isValid = validateFingerprint(req, req.session);
      
      if (!isValid) {
        logger.warn('Device fingerprint mismatch', {
          userId: req.session.userId,
          url: req.originalUrl
        });
        
        req.session.destroy((err) => {
          if (err) logger.error('Error destroying session', err);
        });
        
        return res.status(401).json({
          error: 'Session invalid',
          message: 'Your session has been invalidated. Please log in again.',
          redirect: '/login?error=session_invalid'
        });
      }
    } else {
      // If no fingerprint exists, generate one (for existing sessions)
      req.session.deviceFingerprint = generateFingerprint(req);
    }
    
    // Update last activity
    req.session.lastActivity = Date.now();
    
    logger.debug(`Authenticated request from user ${req.session.userId}`);
    return next();
  }

  logger.warn(`Unauthorized access attempt to ${req.originalUrl}`);
  return res.status(401).json({
    error: 'Authentication required',
    message: 'You must be logged in to access this resource'
  });
}

/**
 * Middleware to check if user is already authenticated
 * Redirects to dashboard if logged in
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Middleware to attach user info to request
 */
function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username
    };
  }
  next();
}

/**
 * Middleware to authenticate using Bearer token or session
 * Compatible with both JWT and session-based auth
 */
function authenticateToken(req, res, next) {
  // Check session first
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    req.username = req.session.username;
    return next();
  }

  // Check Authorization header for Bearer token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  // For now, just validate that token exists in localStorage
  // In a real app, you'd verify the JWT token here
  // Since we're using session-based auth, we'll accept any token
  // and rely on session validation in the API calls

  logger.warn('Bearer token provided but session-based auth is primary');
  return res.status(401).json({
    error: 'Invalid authentication method',
    message: 'Please use session-based authentication'
  });
}

/**
 * Middleware to require admin privileges
 * Checks if user is logged in and has admin role
 */
async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    logger.warn(`Unauthorized access attempt to admin resource: ${req.originalUrl}`);
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  try {
    const { getDatabaseWrapper } = require('../db');
    const db = getDatabaseWrapper();
    const user = await db.prepare('SELECT is_admin FROM users WHERE id = $1').get(req.session.userId);

    if (!user || !user.is_admin) {
      logger.warn(`Non-admin user ${req.session.userId} attempted to access admin resource: ${req.originalUrl}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    logger.debug(`Admin access granted to user ${req.session.userId}`);
    next();
  } catch (error) {
    logger.error('Error checking admin status', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  attachUser,
  authenticateToken,
  requireAdmin,
  validateDeviceFingerprint
};
