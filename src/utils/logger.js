/**
 * Logging Utility
 * Provides structured logging with file rotation using Winston
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('../config');

// Define log directory
const LOG_DIR = path.join(__dirname, '../../logs');

// Define custom format for console output with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return logMessage;
  })
);

// Define format for file output (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.uncolorize(),
  winston.format.json()
);

// Create Winston logger
const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: fileFormat,
  defaultMeta: { service: 'ai-prompt-templates' },
  transports: [
    // Error log - only errors
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),

    // Combined log - all logs
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),

    // Console output with colors
    new winston.transports.Console({
      format: consoleFormat,
      level: config.isProduction ? 'info' : 'debug'
    })
  ]
});

// Create logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Custom Logger class that wraps Winston with convenience methods
 */
class Logger {
  constructor() {
    this.logger = logger;
    this.isProduction = config.isProduction;
  }

  /**
   * Logs error messages
   */
  error(message, error = null) {
    if (error) {
      this.logger.error(message, {
        message: error.message,
        stack: error.stack,
        ...(error.code && { code: error.code })
      });
    } else {
      this.logger.error(message);
    }
  }

  /**
   * Logs warning messages
   */
  warn(message, data = null) {
    if (data) {
      this.logger.warn(message, data);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Logs informational messages
   */
  info(message, data = null) {
    if (data) {
      this.logger.info(message, data);
    } else {
      this.logger.info(message);
    }
  }

  /**
   * Logs debug messages (only in development)
   */
  debug(message, data = null) {
    if (data) {
      this.logger.debug(message, data);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * Logs HTTP request information
   */
  request(req, res, responseTime) {
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const message = `${method} ${originalUrl} ${statusCode} - ${responseTime}ms - ${ip}`;

    if (statusCode >= 500) {
      this.error(message);
    } else if (statusCode >= 400) {
      this.warn(message);
    } else {
      this.debug(message);
    }
  }

  /**
   * Logs database operations (only in development)
   */
  db(operation, table, data = null) {
    if (!this.isProduction) {
      this.debug(`DB ${operation} on ${table}`, data);
    }
  }

  /**
   * Logs security-related events
   */
  security(message, data = null) {
    this.logger.warn(`[SECURITY] ${message}`, data);
  }

  /**
   * Logs performance metrics
   */
  performance(message, data = null) {
    this.logger.info(`[PERFORMANCE] ${message}`, data);
  }

  /**
   * Access the underlying Winston logger for advanced usage
   */
  getWinstonLogger() {
    return this.logger;
  }
}

// Export singleton instance
module.exports = new Logger();
