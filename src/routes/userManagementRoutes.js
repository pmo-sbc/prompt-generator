/**
 * User Management Routes
 * Admin routes for managing users
 */

const express = require('express');
const userRepository = require('../db/userRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { configureCsrf, sendCsrfToken } = require('../middleware/security');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const path = require('path');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /admin/users
 * Serve user management page
 */
router.get('/admin/users', requireAdmin, csrfProtection, sendCsrfToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-users.html'));
});

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/api/admin/users', requireAdmin, asyncHandler(async (req, res) => {
  const { getDatabaseWrapper } = require('../db');
  const db = getDatabaseWrapper();

  try {
    logger.db('SELECT', 'users', { action: 'list_all_users' });
    const users = await db.prepare(`
      SELECT id, username, email, email_verified, is_admin, is_manager, tokens, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json({
      success: true,
      users
    });
  } catch (error) {
    logger.error('Error fetching users', error);
    throw error;
  }
}));

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/api/admin/users/:id', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  // Prevent user from deleting themselves
  if (userId === req.session.userId) {
    return res.status(400).json({
      error: 'Cannot delete your own account'
    });
  }

  const deleted = userRepository.delete(userId);

  if (!deleted) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  logger.info('User deleted', {
    deletedUserId: userId,
    deletedBy: req.session.userId
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

/**
 * PATCH /api/admin/users/:id/tokens
 * Add tokens to a user account
 */
router.patch('/api/admin/users/:id/tokens', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { amount } = req.body;

  // Validate amount
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      error: 'Invalid token amount. Must be a positive number.'
    });
  }

  // Add tokens to user
  const success = userRepository.addTokens(userId, amount);

  if (!success) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  // Get updated token balance
  const newBalance = userRepository.getTokens(userId);

  logger.info('Tokens added to user', {
    userId,
    amount,
    newBalance,
    addedBy: req.session.userId
  });

  res.json({
    success: true,
    message: `${amount} token${amount > 1 ? 's' : ''} added successfully`,
    newBalance
  });
}));

/**
 * PATCH /api/admin/users/:id/admin
 * Toggle admin status for a user
 */
router.patch('/api/admin/users/:id/admin', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { isAdmin } = req.body;

  // Prevent user from removing their own admin status
  if (userId === req.session.userId && !isAdmin) {
    return res.status(400).json({
      error: 'Cannot remove your own admin privileges'
    });
  }

  const { getDatabaseWrapper } = require('../db');
  const db = getDatabaseWrapper();

  try {
    const result = await db.prepare('UPDATE users SET is_admin = $1 WHERE id = $2').run(isAdmin ? true : false, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info('User admin status changed', {
      userId,
      isAdmin,
      changedBy: req.session.userId
    });

    res.json({
      success: true,
      message: `User ${isAdmin ? 'promoted to' : 'removed from'} admin successfully`
    });
  } catch (error) {
    logger.error('Error updating admin status', { error, userId });
    throw error;
  }
}));

/**
 * PATCH /api/admin/users/:id/manager
 * Toggle manager status for a user
 */
router.patch('/api/admin/users/:id/manager', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { isManager } = req.body;

  // Prevent user from removing their own manager status
  if (userId === req.session.userId && !isManager) {
    return res.status(400).json({
      error: 'Cannot remove your own manager privileges'
    });
  }

  const { getDatabaseWrapper } = require('../db');
  const db = getDatabaseWrapper();

  try {
    const result = await db.prepare('UPDATE users SET is_manager = $1 WHERE id = $2').run(isManager ? true : false, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info('User manager status changed', {
      userId,
      isManager,
      changedBy: req.session.userId
    });

    res.json({
      success: true,
      message: `User ${isManager ? 'promoted to' : 'removed from'} manager successfully`
    });
  } catch (error) {
    logger.error('Error updating manager status', { error, userId });
    throw error;
  }
}));

/**
 * POST /api/admin/users/:id/verify-email
 * Manually verify a user's email (admin action)
 */
router.post('/api/admin/users/:id/verify-email', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  const { getDatabase } = require('../db');
  const db = getDatabase();

  try {
    const result = db.prepare(`
      UPDATE users
      SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL
      WHERE id = ?
    `).run(userId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info('Email verified by admin', {
      userId,
      verifiedBy: req.session.userId
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Error verifying email', { error, userId });
    throw error;
  }
}));

/**
 * POST /api/admin/users/:id/send-password-reset
 * Send password reset email to user (admin action)
 */
router.post('/api/admin/users/:id/send-password-reset', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  const user = userRepository.findById(userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  if (!user.email_verified) {
    return res.status(400).json({
      error: 'Cannot send password reset to unverified email'
    });
  }

  // Generate reset token
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  userRepository.setPasswordResetToken(user.id, resetToken, expiresAt);

  // Send reset email
  const emailService = require('../services/emailService');
  await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);

  logger.info('Password reset sent by admin', {
    userId,
    sentBy: req.session.userId
  });

  res.json({
    success: true,
    message: 'Password reset email sent successfully'
  });
}));

/**
 * GET /api/admin/users/:id/activity
 * Get activity logs for a specific user with IP addresses
 */
router.get('/api/admin/users/:id/activity', requireAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const activityLogRepository = require('../db/activityLogRepository');
  const logs = activityLogRepository.findByUserId(userId, limit, offset);

  res.json({
    success: true,
    logs,
    count: logs.length
  });
}));

/**
 * GET /api/admin/users/:id/login-history
 * Get unique IP addresses that have logged into this user's account
 */
router.get('/api/admin/users/:id/login-history', requireAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  const { getDatabase } = require('../db');
  const db = getDatabase();

  try {
    const loginHistory = db.prepare(`
      SELECT DISTINCT ip_address, user_agent, created_at, action
      FROM activity_logs
      WHERE user_id = ? AND action IN ('user.login', 'user.register')
      ORDER BY created_at DESC
    `).all(userId);

    res.json({
      success: true,
      history: loginHistory
    });
  } catch (error) {
    logger.error('Error fetching login history', { error, userId });
    throw error;
  }
}));

module.exports = router;
