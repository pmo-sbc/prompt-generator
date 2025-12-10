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
 * POST /api/admin/pending-users/:id/resend-email
 * Resend approval notification email for a pending user
 */
router.post(
  '/api/admin/pending-users/:id/resend-email',
  requireManagerOrAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const pendingUserId = parseInt(req.params.id);

    // Get pending user
    const pendingUser = await pendingUserRepository.findById(pendingUserId);
    if (!pendingUser) {
      return res.status(404).json({
        error: 'Pending user not found'
      });
    }

    if (pendingUser.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only resend emails for pending users'
      });
    }

    // Get notification emails from settings
    const emailValue = await settingsRepository.get('approval_notification_email', null);
    if (!emailValue) {
      return res.status(400).json({
        error: 'Notification email is not configured. Please set it in the settings above.'
      });
    }

    // Parse emails (support both JSON array and single email string)
    let notificationEmails = [];
    try {
      const parsed = JSON.parse(emailValue);
      if (Array.isArray(parsed)) {
        notificationEmails = parsed.filter(e => e && e.trim());
      } else {
        notificationEmails = [parsed];
      }
    } catch (e) {
      // Not JSON, treat as single email string
      notificationEmails = [emailValue];
    }

    if (notificationEmails.length === 0) {
      return res.status(400).json({
        error: 'Notification email is not configured. Please set it in the settings above.'
      });
    }

    try {
      // Check if tokens exist and are still valid, otherwise generate new ones
      let approvalToken = pendingUser.approval_token;
      let rejectToken = pendingUser.reject_token;
      const expiresAt = pendingUser.approval_token_expires;

      // Generate new tokens if they don't exist or are expired
      if (!approvalToken || !rejectToken || !expiresAt || new Date(expiresAt) < new Date()) {
        approvalToken = crypto.randomBytes(32).toString('hex');
        rejectToken = crypto.randomBytes(32).toString('hex');
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Save new tokens
        await pendingUserRepository.setApprovalTokens(
          pendingUserId,
          approvalToken,
          rejectToken,
          newExpiresAt.toISOString()
        );

        logger.info('Generated new approval tokens for resend', {
          pendingUserId,
          expiresAt: newExpiresAt
        });
      }

      // Send approval notification email to all recipients
      const emailResults = [];
      for (const notificationEmail of notificationEmails) {
        try {
          const emailResult = await emailService.sendApprovalNotificationEmail(
            notificationEmail,
            {
              id: pendingUser.id,
              username: pendingUser.username,
              email: pendingUser.email,
              created_at: pendingUser.created_at
            },
            approvalToken,
            rejectToken
          );
          emailResults.push({ email: notificationEmail, result: emailResult });
        } catch (error) {
          logger.error('Failed to send approval notification email to one recipient', {
            email: notificationEmail,
            error: error.message
          });
          emailResults.push({ email: notificationEmail, result: { success: false, error: error.message } });
        }
      }

      const successCount = emailResults.filter(r => r.result.success).length;
      logger.info('Approval notification email resent', {
        pendingUserId,
        totalRecipients: notificationEmails.length,
        successCount,
        emailResults
      });

      res.json({
        success: true,
        message: 'Approval notification email sent successfully'
      });
    } catch (error) {
      logger.error('Failed to resend approval notification email', {
        error: error.message,
        stack: error.stack,
        pendingUserId,
        notificationEmail
      });

      res.status(500).json({
        error: 'Failed to resend approval notification email',
        details: error.message
      });
    }
  })
);

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

    // Send rejection email to the user
    try {
      logger.info('Attempting to send rejection email (admin portal rejection)', {
        service: 'ai-prompt-templates',
        pendingUserId,
        email: pendingUser.email,
        username: pendingUser.username,
        emailType: 'rejection',
        timestamp: new Date().toISOString()
      });
      
      // Verify email address is valid
      if (!pendingUser.email || !pendingUser.email.includes('@')) {
        logger.error('Invalid email address for rejection email', {
          pendingUserId,
          email: pendingUser.email,
          username: pendingUser.username
        });
        throw new Error('Invalid email address');
      }
      
      const emailResult = await emailService.sendRejectionEmail(
        pendingUser.email.trim(),
        pendingUser.username
      );
      
      logger.info('Rejection email sent to user successfully (admin portal)', {
        service: 'ai-prompt-templates',
        pendingUserId,
        email: pendingUser.email.trim(),
        username: pendingUser.username,
        emailResult: emailResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to send rejection email (admin portal)', {
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        pendingUserId,
        email: pendingUser.email,
        username: pendingUser.username,
        timestamp: new Date().toISOString()
      });
      // Continue anyway - rejection is complete
    }

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

/**
 * GET /api/admin/settings/approval-notification-email
 * Get approval notification email setting (supports both single email and array)
 */
router.get('/api/admin/settings/approval-notification-email', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const emailValue = await settingsRepository.get('approval_notification_email', null);
  
  // Try to parse as JSON array, fallback to single email string
  let emails = [];
  if (emailValue) {
    try {
      const parsed = JSON.parse(emailValue);
      if (Array.isArray(parsed)) {
        emails = parsed;
      } else {
        // Legacy single email format
        emails = [parsed];
      }
    } catch (e) {
      // Not JSON, treat as single email string
      emails = [emailValue];
    }
  }
  
  res.json({
    success: true,
    emails: emails,
    email: emails.length > 0 ? emails[0] : null // Legacy support
  });
}));

/**
 * POST /api/admin/settings/approval-notification-email
 * Update approval notification email setting (supports both single email and array)
 */
router.post(
  '/api/admin/settings/approval-notification-email',
  requireManagerOrAdmin,
  csrfProtection,
  [
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address'),
    body('emails')
      .optional()
      .isArray()
      .withMessage('emails must be an array'),
    body('emails.*')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Each email must be valid')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, emails } = req.body;
    const updatedBy = req.session.userId;

    // Support both legacy single email and new array format
    let emailArray = [];
    if (emails && Array.isArray(emails)) {
      // New format: array of emails
      emailArray = emails.filter(e => e && e.trim()).map(e => e.trim());
    } else if (email) {
      // Legacy format: single email
      emailArray = [email.trim()];
    }

    // Remove duplicates
    emailArray = [...new Set(emailArray)];

    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailArray.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: `Invalid email addresses: ${invalidEmails.join(', ')}`
      });
    }

    // Store as JSON array
    const valueToStore = emailArray.length > 0 ? JSON.stringify(emailArray) : null;

    await settingsRepository.set(
      'approval_notification_email',
      valueToStore,
      'Email addresses that receive notifications when users need approval (with approve/reject buttons). Can be a single email or multiple emails.',
      updatedBy
    );

    logger.info('Approval notification email setting updated', {
      emails: emailArray,
      count: emailArray.length,
      updatedBy
    });

    res.json({
      success: true,
      message: `Notification email${emailArray.length !== 1 ? 's' : ''} updated successfully (${emailArray.length} recipient${emailArray.length !== 1 ? 's' : ''})`,
      emails: emailArray,
      email: emailArray.length > 0 ? emailArray[0] : null // Legacy support
    });
  })
);

/**
 * GET /api/approve-user-by-email
 * Approve a pending user via email token
 */
router.get('/api/approve-user-by-email', asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Request</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">Invalid Request</h1>
        <p>No token provided.</p>
      </body>
      </html>
    `);
  }

  try {
    // Find pending user by approval token
    const pendingUser = await pendingUserRepository.findByApprovalToken(token);

    if (!pendingUser) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid or Expired Token</h1>
          <p>This approval link is invalid or has expired. Please use the admin portal to approve users.</p>
          <p><a href="${emailService.baseUrl}/admin/approve-users">Go to Admin Portal</a></p>
        </body>
        </html>
      `);
    }

    // Check if user already exists
    const existingUser = await userRepository.findByUsernameOrEmail(pendingUser.username, pendingUser.email);
    if (existingUser) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Already Exists</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">User Already Exists</h1>
          <p>A user with this username or email already exists.</p>
        </body>
        </html>
      `);
    }

    // Approve the user (system user ID for email approvals)
    await pendingUserRepository.approve(pendingUser.id, null, 'Approved via email');

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
      logger.info('User approved via email, verification email sent', {
        userId: newUser.id,
        email: pendingUser.email
      });
    } catch (error) {
      logger.error('Failed to send verification email after email approval', error);
    }

    logger.info('Pending user approved via email', {
      pendingUserId: pendingUser.id,
      userId: newUser.id
    });

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Approved</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #27ae60; }
          .info-box {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px auto;
            max-width: 500px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <h1 class="success">✓ User Approved Successfully</h1>
        <p>The user <strong>${pendingUser.username}</strong> has been approved and their account has been created.</p>
        <p>They will receive an email with instructions to verify their email address.</p>
        <div class="info-box">
          <p><strong>Username:</strong> ${pendingUser.username}</p>
          <p><strong>Email:</strong> ${pendingUser.email}</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error approving user via email', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">Error</h1>
        <p>An error occurred while approving the user. Please try using the admin portal.</p>
        <p><a href="${emailService.baseUrl}/admin/approve-users">Go to Admin Portal</a></p>
      </body>
      </html>
    `);
  }
}));

/**
 * GET /api/reject-user-by-email
 * Reject a pending user via email token
 */
router.get('/api/reject-user-by-email', asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Request</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">Invalid Request</h1>
        <p>No token provided.</p>
      </body>
      </html>
    `);
  }

  try {
    // Find pending user by reject token
    const pendingUser = await pendingUserRepository.findByRejectToken(token);

    if (!pendingUser) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid or Expired Token</h1>
          <p>This rejection link is invalid or has expired. Please use the admin portal to reject users.</p>
          <p><a href="${emailService.baseUrl}/admin/approve-users">Go to Admin Portal</a></p>
        </body>
        </html>
      `);
    }

    // Reject the user (system user ID for email rejections)
    await pendingUserRepository.reject(pendingUser.id, null, 'Rejected via email');

    // Send rejection email to the user
    try {
      logger.info('Attempting to send rejection email (email-based rejection)', {
        service: 'ai-prompt-templates',
        pendingUserId: pendingUser.id,
        email: pendingUser.email,
        username: pendingUser.username,
        emailType: 'rejection',
        timestamp: new Date().toISOString()
      });
      
      // Verify email address is valid
      if (!pendingUser.email || !pendingUser.email.includes('@')) {
        logger.error('Invalid email address for rejection email', {
          pendingUserId: pendingUser.id,
          email: pendingUser.email,
          username: pendingUser.username
        });
        throw new Error('Invalid email address');
      }
      
      const emailResult = await emailService.sendRejectionEmail(
        pendingUser.email.trim(),
        pendingUser.username
      );
      
      logger.info('User rejected via email, rejection email sent successfully', {
        service: 'ai-prompt-templates',
        pendingUserId: pendingUser.id,
        email: pendingUser.email.trim(),
        username: pendingUser.username,
        emailResult: emailResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to send rejection email after email-based rejection', {
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        pendingUserId: pendingUser.id,
        email: pendingUser.email,
        username: pendingUser.username,
        timestamp: new Date().toISOString()
      });
      // Continue anyway - rejection is complete
    }

    logger.info('Pending user rejected via email', {
      pendingUserId: pendingUser.id
    });

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Rejected</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .warning { color: #f39c12; }
          .info-box {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px auto;
            max-width: 500px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <h1 class="warning">✗ User Rejected</h1>
        <p>The user registration for <strong>${pendingUser.username}</strong> has been rejected.</p>
        <div class="info-box">
          <p><strong>Username:</strong> ${pendingUser.username}</p>
          <p><strong>Email:</strong> ${pendingUser.email}</p>
        </div>
        <p>This user will not be able to access the platform.</p>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error rejecting user via email', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">Error</h1>
        <p>An error occurred while rejecting the user. Please try using the admin portal.</p>
        <p><a href="${emailService.baseUrl}/admin/approve-users">Go to Admin Portal</a></p>
      </body>
      </html>
    `);
  }
}));

module.exports = router;

