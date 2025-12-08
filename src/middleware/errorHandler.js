/**
 * Error Handling Middleware
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Custom Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found Handler
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
}

/**
 * Global Error Handler
 */
function globalErrorHandler(err, req, res, next) {
  let error = err;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = new AppError('Validation Error', 400);
  }

  if (err.code === 'EBADCSRFTOKEN') {
    error = new AppError('Invalid CSRF token', 403);
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    error = new AppError('Database constraint violation', 400);
  }

  // Set default values
  error.statusCode = error.statusCode || 500;
  error.message = error.message || 'Internal Server Error';

  // Log error
  if (error.statusCode >= 500) {
    logger.error(`${error.statusCode} - ${error.message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: error.stack
    });
  } else {
    logger.warn(`${error.statusCode} - ${error.message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
  }

  // Send response
  const response = {
    error: error.message,
    statusCode: error.statusCode
  };

  // Include stack trace in development
  if (!config.isProduction && error.stack) {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log response after it's sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.request(req, res, duration);
  });

  next();
}

module.exports = {
  AppError,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler,
  requestLogger
};
