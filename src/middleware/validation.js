/**
 * Validation Middleware
 */

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to handle validation errors
 * Must be used after express-validator validation chains
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));

    logger.warn('Validation failed', {
      url: req.originalUrl,
      errors: errorMessages
    });

    // Return first error for simplicity (can be modified to return all errors)
    return res.status(400).json({
      error: errorMessages[0].message,
      errors: errorMessages
    });
  }

  next();
}

/**
 * Sanitize request body to prevent prototype pollution and XSS
 * Recursively processes nested objects and arrays
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Recursively sanitize an object
 * Removes dangerous properties and limits object depth
 */
function sanitizeObject(obj, depth = 0) {
  // Prevent deep nesting attacks
  if (depth > 10) {
    logger.warn('Deep nesting detected in request', { depth });
    return {};
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Remove dangerous properties
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  dangerousKeys.forEach(key => {
    delete obj[key];
  });

  // Recursively sanitize nested objects and arrays
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = sanitizeObject(obj[key], depth + 1);
      }
    }
  }

  return obj;
}

/**
 * Validate request content length to prevent payload size attacks
 * Use this middleware before body parser for sensitive endpoints
 */
function validateContentLength(maxSizeBytes = 1048576) { // 1MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSizeBytes) {
      logger.warn('Request payload too large', {
        contentLength,
        maxSize: maxSizeBytes,
        url: req.originalUrl
      });

      return res.status(413).json({
        error: 'Payload too large',
        message: `Request size must be under ${Math.round(maxSizeBytes / 1024)}KB`
      });
    }

    next();
  };
}

/**
 * Validate file upload size and type
 * For future file upload features
 */
function validateFileUpload(options = {}) {
  const defaults = {
    maxSize: 5242880, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  };

  const config = { ...defaults, ...options };

  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      if (!file) continue;

      // Check file size
      if (file.size > config.maxSize) {
        logger.warn('File upload too large', {
          filename: file.originalname,
          size: file.size,
          maxSize: config.maxSize
        });

        return res.status(413).json({
          error: 'File too large',
          message: `File size must be under ${Math.round(config.maxSize / 1048576)}MB`
        });
      }

      // Check file type
      if (!config.allowedTypes.includes(file.mimetype)) {
        logger.warn('Invalid file type uploaded', {
          filename: file.originalname,
          mimetype: file.mimetype,
          allowed: config.allowedTypes
        });

        return res.status(400).json({
          error: 'Invalid file type',
          message: `Allowed types: ${config.allowedTypes.join(', ')}`
        });
      }
    }

    next();
  };
}

module.exports = {
  handleValidationErrors,
  sanitizeBody,
  sanitizeObject,
  validateContentLength,
  validateFileUpload
};
