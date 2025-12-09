/**
 * User Approval Routes
 * Admin routes for managing user approvals
 */

const express = require('express');
const pendingUserRepository = require('../db/pendingUserRepository');
const userRepository = require('../db/userRepository');
const settingsRepository = require('../db/settingsRepository');
const emailService = require('../services/emailService');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireManagerOrAdmin } = require('../middleware/auth');
const { configureCsrf, sendCsrfToken } = require('../middleware/security');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const logger = require('../utils/logger');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /admin/approve-users
 * Serve user approval page
 */
router.get('/admin/approve-users', requireManagerOrAdmin, csrfProtection, sendCsrfToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-approve-users.html'));
});

/**
 * GET /api/admin/pending-users
 * Get all pending users
 */
router.get('/api/admin/pending-users', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const pendingUsers = await pendingUserRepository.findAll('pending');
  
  res.json({
    success: true,
    pendingUsers
  });
}));

/**
 * POST /api/admin/pending-users/:id/approve
 * Approve a pending user
 */
router.post(
  '/api/admin/pending-users/:id/approve',
  requireManagerOrAdmin,
  csrfProtection,
  [
    body('reviewNotes').optional().trim().isLength({ max: 500 })
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const pendingUserId = parseInt(req.params.id);
    const { reviewNotes } = req.body;
    const reviewedBy = req.session.userId;

    // Get pending user
    const pendingUser = await pendingUserRepository.findById(pendingUserId);
    if (!pendingUser) {
      return res.status(404).json({
        error: 'Pending user not found'
      });
    }

    if (pendingUser.status !== 'pending') {
      return res.status(400).json({
        error: 'User has already been reviewed'
      });
    }

    // Check if username/email already exists in users table
    const existingUser = await userRepository.findByUsernameOrEmail(pendingUser.username, pendingUser.email);
    if (existingUser) {
      return res.status(400).json({
        error: 'A user with this username or email already exists'
      });
    }

    // Mark as approved in pending_users
    await pendingUserRepository.approve(pendingUserId, reviewedBy, reviewNotes);

    // Create actual user account
    const newUser = await userRepository.create(
      pendingUser.username,
      pendingUser.email,
      pendingUser.password
    );

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    await userRepository.setVerificationToken(newUser.id, verificationToken, expiresAt.toISOString());

    // Send approval email to user
    try {
      await emailService.sendVerificationEmail(
        pendingUser.email,
        pendingUser.username,
        verificationToken
      );
      logger.info('Approval email sent', {
        userId: newUser.id,
        email: pendingUser.email
      });
    } catch (error) {
      logger.error('Failed to send approval email', error);
    }

    logger.info('Pending user approved', {
      pendingUserId,
      userId: newUser.id,
      reviewedBy
    });

    res.json({
      success: true,
      message: 'User approved successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  })
);

/**
 * POST /api/admin/pending-users/:id/reject
 * Reject a pending user
 */
router.post(
  '/api/admin/pending-users/:id/reject',
  requireManagerOrAdmin,
  csrfProtection,
  [
    body('reviewNotes').optional().trim().isLength({ max: 500 })
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const pendingUserId = parseInt(req.params.id);
    const { reviewNotes } = req.body;
    const reviewedBy = req.session.userId;

    // Get pending user
    const pendingUser = await pendingUserRepository.findById(pendingUserId);
    if (!pendingUser) {
      return res.status(404).json({
        error: 'Pending user not found'
      });
    }

    if (pendingUser.status !== 'pending') {
      return res.status(400).json({
        error: 'User has already been reviewed'
      });
    }

    // Mark as rejected
    await pendingUserRepository.reject(pendingUserId, reviewedBy, reviewNotes);

    // Optionally send rejection email (you may want to add this to emailService)
    // For now, we'll just log it
    logger.info('Pending user rejected', {
      pendingUserId,
      reviewedBy,
      reviewNotes
    });

    res.json({
      success: true,
      message: 'User rejected successfully'
    });
  })
);

/**
 * GET /api/admin/settings/approval-mode
 * Get approval mode setting
 */
router.get('/api/admin/settings/approval-mode', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const enabled = await settingsRepository.get('user_approval_enabled', false);
  
  res.json({
    success: true,
    enabled
  });
}));

/**
 * POST /api/admin/settings/approval-mode
 * Update approval mode setting
 */
router.post(
  '/api/admin/settings/approval-mode',
  requireManagerOrAdmin,
  csrfProtection,
  [
    body('enabled').isBoolean().withMessage('Enabled must be a boolean')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    const updatedBy = req.session.userId;

    await settingsRepository.set(
      'user_approval_enabled',
      enabled,
      'Enable/disable user approval mode for new signups',
      updatedBy
    );

    logger.info('Approval mode setting updated', {
      enabled,
      updatedBy
    });

    res.json({
      success: true,
      message: 'Approval mode updated successfully',
      enabled
    });
  })
);

module.exports = router;

