/**
 * User Profile Routes
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userRepository = require('../db/userRepository');
const emailService = require('../services/emailService');
const validators = require('../validators');
const { handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf } = require('../middleware/security');
const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');
const { logManualActivity, ActivityTypes } = require('../middleware/activityLogger');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /profile
 * Serve user profile page
 */
router.get('/profile', requireAuth, csrfProtection, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'profile.html'));
});

/**
 * POST /api/profile/change-password
 * Change user password (while logged in)
 */
router.post(
  '/api/profile/change-password',
  requireAuth,
  csrfProtection,
  validators.changePassword,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long'
      });
    }

    // Get user with password
    const user = await userRepository.findByUsernameOrEmail(req.session.username);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      logger.warn('Failed password change attempt - invalid current password', {
        userId,
        username: user.username
      });
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Update password
    const updated = await userRepository.updatePassword(userId, hashedPassword);

    if (!updated) {
      return res.status(500).json({
        error: 'Failed to update password'
      });
    }

    logger.info('Password changed successfully', {
      userId,
      username: user.username
    });

    // Log password change activity
    logManualActivity(req, ActivityTypes.PASSWORD_CHANGE, 'user', userId);

    // Destroy current session and require re-login for security
    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session after password change', err);
        return res.status(500).json({
          error: 'Password changed but session cleanup failed',
          message: 'Please log out and log back in'
        });
      }

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
        redirect: '/login?message=password_changed'
      });
    });
  })
);

/**
 * POST /api/profile/update-email
 * Update user email address
 */
router.post(
  '/api/profile/update-email',
  requireAuth,
  csrfProtection,
  validators.updateEmail,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const userId = req.session.userId;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if email is already in use
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        error: 'Email is already in use'
      });
    }

    // Get user with password
    const user = await userRepository.findByUsernameOrEmail(req.session.username);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.warn('Failed email update attempt - invalid password', {
        userId,
        username: user.username
      });
      return res.status(401).json({
        error: 'Password is incorrect'
      });
    }

    // Update email
    const updated = await userRepository.updateEmail(userId, email);

    if (!updated) {
      return res.status(500).json({
        error: 'Failed to update email'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    userRepository.setVerificationToken(userId, verificationToken, expiresAt.toISOString());

    // Send verification email to new address
    try {
      await emailService.sendVerificationEmail(email, user.username, verificationToken);
      logger.info('Email changed and verification sent', {
        userId,
        oldEmail: user.email,
        newEmail: email
      });
    } catch (error) {
      logger.error('Failed to send verification email after email change', error);
      // Continue anyway - user can resend verification
    }

    // Log email update activity
    logManualActivity(req, ActivityTypes.PROFILE_UPDATE, 'user', userId, { action: 'email_change', newEmail: email });

    res.json({
      success: true,
      message: 'Email updated successfully. Please check your new email to verify it.',
      requiresVerification: true
    });
  })
);

/**
 * DELETE /api/profile/delete-account
 * Delete user account
 */
router.delete(
  '/api/profile/delete-account',
  requireAuth,
  csrfProtection,
  validators.deleteAccount,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const userId = req.session.userId;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required to delete account'
      });
    }

    // Get user with password
    const user = await userRepository.findByUsernameOrEmail(req.session.username);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.warn('Failed account deletion attempt - invalid password', {
        userId,
        username: user.username
      });
      return res.status(401).json({
        error: 'Password is incorrect'
      });
    }

    // Delete user
    const deleted = await userRepository.delete(userId);

    if (!deleted) {
      return res.status(500).json({
        error: 'Failed to delete account'
      });
    }

    logger.info('Account deleted', {
      userId,
      username: user.username,
      email: user.email
    });

    // Log account deletion before destroying session
    logManualActivity(req, ActivityTypes.ACCOUNT_DELETE, 'user', userId, { username: user.username });

    // Destroy session
    req.session.destroy();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  })
);

/**
 * GET /api/profile/activity
 * Get user activity log
 */
router.get(
  '/api/profile/activity',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    // This would require implementing activity tracking
    // For now, return basic info
    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Get customer info if available (handle gracefully if columns don't exist)
    let customerInfo = null;
    try {
      customerInfo = await userRepository.getCustomerInfo(userId);
    } catch (error) {
      // If customer info columns don't exist, log warning but don't fail
      logger.warn('Failed to get customer info (columns may not exist)', {
        userId,
        error: error.message
      });
      // Return null - the profile page will still work without customer info
      customerInfo = null;
    }

    res.json({
      user: {
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        email_verified: user.email_verified,
        tokens: user.tokens,
        is_admin: user.is_admin
      },
      customerInfo: customerInfo || null
    });
  })
);

/**
 * GET /api/profile/customer-info
 * Get customer information for checkout
 */
router.get(
  '/api/profile/customer-info',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const customerInfo = await userRepository.getCustomerInfo(userId);

    if (!customerInfo) {
      return res.json({
        customerInfo: null
      });
    }

    res.json({
      customerInfo
    });
  })
);

/**
 * POST /api/profile/customer-info
 * Save customer information
 */
router.post(
  '/api/profile/customer-info',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const {
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !address || !city || !state || !zipCode || !country) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    // Update customer info
    const updated = await userRepository.updateCustomerInfo(userId, {
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      country
    });

    if (!updated) {
      return res.status(500).json({
        error: 'Failed to update customer information'
      });
    }

    logger.info('Customer information updated', {
      userId
    });

    // Log profile update activity
    logManualActivity(req, ActivityTypes.PROFILE_UPDATE, 'user', userId, { action: 'customer_info_update' });

    res.json({
      success: true,
      message: 'Customer information saved successfully'
    });
  })
);

module.exports = router;
