/**
 * Security Middleware
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Configure Helmet security headers
 */
function configureHelmet() {
  // Create helmet instance with CSP completely disabled
  const helmetConfig = {
    ...config.security.helmet
  };
  
  // Explicitly remove CSP if it exists
  delete helmetConfig.contentSecurityPolicy;
  
  // Create helmet middleware
  const helmetMiddleware = helmet(helmetConfig);
  
  // Add a middleware to explicitly remove CSP header if it somehow gets set
  return (req, res, next) => {
    helmetMiddleware(req, res, () => {
      // Remove CSP header if it exists
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('content-security-policy');
      next();
    });
  };
}

/**
 * API Rate Limiter
 */
function configureApiRateLimit() {
  return rateLimit({
    windowMs: config.security.rateLimit.api.windowMs,
    max: config.security.rateLimit.api.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl
      });
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.'
      });
    }
  });
}

/**
 * Authentication Rate Limiter (stricter)
 */
function configureAuthRateLimit() {
  return rateLimit({
    windowMs: config.security.rateLimit.auth.windowMs,
    max: config.security.rateLimit.auth.max,
    skipSuccessfulRequests: config.security.rateLimit.auth.skipSuccessfulRequests,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl
      });
      res.status(429).json({
        error: 'Too many authentication attempts, please try again after 15 minutes.'
      });
    }
  });
}

/**
 * CSRF Protection
 */
function configureCsrf() {
  return csrf({ cookie: true });
}

/**
 * Send CSRF token to frontend
 */
function sendCsrfToken(req, res, next) {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false, // Must be readable by JavaScript
    secure: config.isProduction,
    sameSite: 'strict'
  });
  next();
}

/**
 * Email Rate Limiter (very strict to prevent abuse)
 * 3 requests per 15 minutes per IP
 */
function configureEmailRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per window
    skipSuccessfulRequests: false,
    message: 'Too many email requests from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.security('Email rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl
      });
      res.status(429).json({
        error: 'Too many email requests',
        message: 'Please try again after 15 minutes. If you need assistance, contact support.'
      });
    }
  });
}

/**
 * Security headers middleware
 * Additional custom security headers not covered by Helmet
 */
function securityHeaders(req, res, next) {
  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options: Prevent clickjacking (also set by Helmet, but explicit here)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-XSS-Protection: Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy: Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // X-Permitted-Cross-Domain-Policies: Restrict Adobe Flash/PDF cross-domain access
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Clear-Site-Data: Allow clearing of site data (optional, for logout)
  // Only set when needed (e.g., on logout endpoint)
  if (req.path === '/api/logout' || req.path === '/logout') {
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  }

  next();
}

module.exports = {
  configureHelmet,
  configureApiRateLimit,
  configureAuthRateLimit,
  configureEmailRateLimit,
  configureCsrf,
  sendCsrfToken,
  securityHeaders
};
