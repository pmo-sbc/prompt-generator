/**
 * Device Fingerprinting Utility
 * Generates and validates device fingerprints for session security
 */

const crypto = require('crypto');

/**
 * Generate a device fingerprint from request headers
 * @param {Object} req - Express request object
 * @returns {string} - SHA-256 hash of user-agent and IP
 */
function generateFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  
  // Create a hash from user-agent and IP
  const fingerprint = crypto
    .createHash('sha256')
    .update(userAgent + ip)
    .digest('hex');
  
  return fingerprint;
}

/**
 * Validate device fingerprint against session
 * @param {Object} req - Express request object
 * @param {Object} session - Express session object
 * @returns {boolean} - True if fingerprint matches, false otherwise
 */
function validateFingerprint(req, session) {
  if (!session.deviceFingerprint) {
    // No fingerprint stored, consider it valid (first request)
    return true;
  }
  
  const currentFingerprint = generateFingerprint(req);
  return currentFingerprint === session.deviceFingerprint;
}

module.exports = {
  generateFingerprint,
  validateFingerprint
};

