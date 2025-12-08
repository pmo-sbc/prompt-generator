/**
 * reCAPTCHA Verification Middleware
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Verify reCAPTCHA token
 * @param {string} token - reCAPTCHA token from frontend
 * @param {string} remoteIp - Client IP address
 * @returns {Promise<boolean>} - True if verification succeeds
 */
async function verifyRecaptcha(token, remoteIp) {
  if (!config.recaptcha.enabled) {
    logger.warn('reCAPTCHA is disabled - skipping verification');
    return true;
  }

  if (!token) {
    logger.warn('reCAPTCHA token missing');
    return false;
  }

  try {
    const response = await axios.post(config.recaptcha.verifyUrl, null, {
      params: {
        secret: config.recaptcha.secretKey,
        response: token,
        remoteip: remoteIp
      }
    });

    const { success, score, 'error-codes': errorCodes } = response.data;

    if (!success) {
      logger.warn('reCAPTCHA verification failed', {
        errorCodes,
        ip: remoteIp
      });
      return false;
    }

    // For v3, check score (optional - only if using v3)
    if (score !== undefined && score < 0.5) {
      logger.warn('reCAPTCHA score too low', {
        score,
        ip: remoteIp
      });
      return false;
    }

    logger.info('reCAPTCHA verified successfully', {
      ip: remoteIp,
      score: score || 'N/A'
    });

    return true;
  } catch (error) {
    logger.error('reCAPTCHA verification error', error);
    // Fail open in case of reCAPTCHA service issues (optional - you can change this to fail closed)
    return false;
  }
}

/**
 * Middleware to verify reCAPTCHA token
 */
function recaptchaMiddleware(req, res, next) {
  // Skip if reCAPTCHA is disabled
  if (!config.recaptcha.enabled) {
    return next();
  }

  const token = req.body['g-recaptcha-response'] || req.body.recaptchaToken;
  const remoteIp = req.ip || req.connection.remoteAddress;

  verifyRecaptcha(token, remoteIp)
    .then(isValid => {
      if (!isValid) {
        return res.status(400).json({
          error: 'reCAPTCHA verification failed',
          message: 'Please complete the CAPTCHA verification.'
        });
      }
      next();
    })
    .catch(error => {
      logger.error('reCAPTCHA middleware error', error);
      res.status(500).json({
        error: 'CAPTCHA verification error',
        message: 'An error occurred during verification. Please try again.'
      });
    });
}

module.exports = {
  verifyRecaptcha,
  recaptchaMiddleware
};
