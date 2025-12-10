/**
 * Authentication Routes
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userRepository = require('../db/userRepository');
const pendingUserRepository = require('../db/pendingUserRepository');
const settingsRepository = require('../db/settingsRepository');
const emailService = require('../services/emailService');
const validators = require('../validators');
const { handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { configureAuthRateLimit, configureEmailRateLimit, configureCsrf, sendCsrfToken } = require('../middleware/security');
const { redirectIfAuthenticated } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');
const { logManualActivity, ActivityTypes } = require('../middleware/activityLogger');
const { generateFingerprint } = require('../utils/deviceFingerprint');

const router = express.Router();
const authLimiter = configureAuthRateLimit();
const emailLimiter = configureEmailRateLimit();
const csrfProtection = configureCsrf();

/**
 * GET /login
 * Serve login page
 */
router.get('/login', csrfProtection, sendCsrfToken, redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

/**
 * GET /signup
 * Serve signup page
 */
router.get('/signup', csrfProtection, sendCsrfToken, redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'signup.html'));
});

/**
 * POST /api/register
 * Register new user
 */
router.post(
  '/api/register',
  authLimiter,
  emailLimiter,
  csrfProtection,
  validators.register,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists in users table
    const existingUser = await userRepository.findByUsernameOrEmail(username, email);
    if (existingUser) {
      logger.warn('Registration attempt with existing credentials', { username, email });
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Check if approval mode is enabled
    let approvalEnabled = false;
    try {
      approvalEnabled = await settingsRepository.get('user_approval_enabled', false);
      logger.info('Approval mode check', { approvalEnabled, type: typeof approvalEnabled });
    } catch (error) {
      logger.error('Error checking approval mode setting', error);
      // Default to false if error checking setting
      approvalEnabled = false;
    }

    if (approvalEnabled === true || approvalEnabled === 'true') {
      // Initialize pendingUser variable
      let pendingUser = null;
      
      // Check if pending user already exists (any status - pending, approved, or rejected)
      const existingPendingUser = await pendingUserRepository.findByUsernameOrEmail(username, email);
      if (existingPendingUser) {
        if (existingPendingUser.status === 'pending') {
          return res.status(400).json({
            error: 'A registration request is already pending for this username or email. Please wait for approval or contact support.'
          });
        } else if (existingPendingUser.status === 'approved') {
          // If user was approved but doesn't exist in users table (deleted), allow re-registration
          // This handles edge cases where user was approved but account creation failed or user was deleted
          logger.info('Approved pending user found but not in users table - allowing re-registration', {
            pendingUserId: existingPendingUser.id,
            username,
            email,
            oldUsername: existingPendingUser.username
          });
          // Reset to pending with new username and email to ensure correct data
          await pendingUserRepository.resetToPending(existingPendingUser.id, hashedPassword, username, email);
          pendingUser = await pendingUserRepository.findById(existingPendingUser.id);
        } else if (existingPendingUser.status === 'rejected') {
          // Previously rejected - allow re-registration by resetting to pending
          logger.info('Re-registration attempt for previously rejected user', { 
            pendingUserId: existingPendingUser.id,
            username,
            email,
            oldUsername: existingPendingUser.username
          });
          // Update the rejected user back to pending with new password, username, and email
          await pendingUserRepository.resetToPending(existingPendingUser.id, hashedPassword, username, email);
          // Use the updated record
          pendingUser = await pendingUserRepository.findById(existingPendingUser.id);
        }
      }

      // Create pending user if it doesn't exist yet
      if (!pendingUser) {
        try {
          pendingUser = await pendingUserRepository.create(username, email, hashedPassword);
        } catch (error) {
          // Handle duplicate key errors gracefully (race condition or other edge case)
          // PostgreSQL error code 23505 = unique_violation
          if (error.code === '23505' || error.code === 23505) {
            logger.warn('Duplicate pending user registration attempt', { 
              username, 
              email, 
              errorCode: error.code,
              constraint: error.constraint,
              errorMessage: error.message 
            });
            
            // Check which constraint was violated for a more specific message
            let errorMessage = 'A registration request for this username or email already exists. Please wait for approval or contact support.';
            if (error.constraint === 'pending_users_email_key') {
              errorMessage = 'A registration request with this email address already exists. Please wait for approval or contact support.';
            } else if (error.constraint === 'pending_users_username_key') {
              errorMessage = 'A registration request with this username already exists. Please wait for approval or contact support.';
            }
            
            return res.status(400).json({
              error: errorMessage
            });
          }
          // Re-throw other errors to be handled by global error handler
          throw error;
        }
      }

      logger.info('Pending user created (approval mode)', {
        pendingUserId: pendingUser.id,
        username: pendingUser.username
      });

      // Log registration activity
      logManualActivity(req, ActivityTypes.USER_REGISTER, 'pending_user', pendingUser.id, { username, email });

      // Generate approval tokens for email-based approval/rejection
      const approvalToken = crypto.randomBytes(32).toString('hex');
      const rejectToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Store tokens in pending_users table
      await pendingUserRepository.setApprovalTokens(pendingUser.id, approvalToken, rejectToken, tokenExpiresAt.toISOString());

      // Get notification email from settings
      let notificationEmail = 'txrba.2025.training@3rdrockads.com'; // Default fallback
      try {
        const configuredEmail = await settingsRepository.get('approval_notification_email', null);
        if (configuredEmail && configuredEmail.trim()) {
          notificationEmail = configuredEmail.trim();
        }
      } catch (error) {
        logger.warn('Error getting approval notification email setting, using default', error);
      }

      // Send approval notification email with approve/reject buttons (non-blocking)
      try {
        logger.info('Attempting to send approval notification email', {
          service: 'ai-prompt-templates',
          pendingUserId: pendingUser.id,
          notificationEmail,
          username: pendingUser.username,
          email: email,
          timestamp: new Date().toISOString()
        });

        const emailResult = await emailService.sendApprovalNotificationEmail(
          notificationEmail,
          {
            id: pendingUser.id,
            username: pendingUser.username,
            email: email,
            created_at: pendingUser.created_at
          },
          approvalToken,
          rejectToken
        );
        
        logger.info('Approval notification email sent successfully', {
          service: 'ai-prompt-templates',
          pendingUserId: pendingUser.id,
          notificationEmail,
          emailResult: emailResult,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to send approval notification email', {
          error: error.message,
          errorCode: error.code,
          stack: error.stack,
          pendingUserId: pendingUser.id,
          notificationEmail,
          timestamp: new Date().toISOString()
        });
        // Continue anyway - registration is successful
      }

      // Also send the regular admin notification (non-blocking)
      try {
        await emailService.sendNewUserNotification({
          id: pendingUser.id,
          username: pendingUser.username,
          email: email,
          isPending: true
        });
        logger.info('Admin notification sent for new pending user', {
          pendingUserId: pendingUser.id
        });
      } catch (error) {
        logger.warn('Failed to send admin notification for pending user', {
          error: error.message,
          pendingUserId: pendingUser.id
        });
      }

      // Return approval message
      return res.json({
        success: true,
        message: 'Thank you for signing up, this is a service for Texas Rural Broadband Association members. You will be notified when your account has been approved.',
        requiresApproval: true,
        email: email
      });
    }

    // Normal registration flow (approval disabled)
    // Create user
    const newUser = await userRepository.create(username, email, hashedPassword);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    await userRepository.setVerificationToken(newUser.id, verificationToken, expiresAt.toISOString());

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, username, verificationToken);
      logger.info('Verification email sent', {
        userId: newUser.id,
        email
      });
    } catch (error) {
      logger.error('Failed to send verification email', error);
      // Continue anyway - user can resend
    }

    logger.info('User registered successfully', {
      userId: newUser.id,
      username: newUser.username
    });

    // Log registration activity
    logManualActivity(req, ActivityTypes.USER_REGISTER, 'user', newUser.id, { username, email });

    // Send admin notification for new user registration (non-blocking)
    try {
      await emailService.sendNewUserNotification({
        id: newUser.id,
        username: newUser.username,
        email: email
      });
      logger.info('Admin notification sent for new user registration', {
        userId: newUser.id
      });
    } catch (error) {
      logger.warn('Failed to send admin notification for new user', {
        error: error.message,
        userId: newUser.id
      });
      // Continue anyway - registration is successful
    }

    // Do NOT create session until email is verified
    res.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      email: email
    });
  })
);

/**
 * POST /api/login
 * Login user
 */
router.post(
  '/api/login',
  authLimiter,
  csrfProtection,
  validators.login,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, password, rememberMe } = req.body;

    // Find user
    const user = await userRepository.findByUsernameOrEmail(username);

    if (!user) {
      logger.warn('Login attempt with invalid username', { username });
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.warn('Login attempt with invalid password', {
        userId: user.id,
        username: user.username
      });
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      logger.warn('Login attempt with unverified email', {
        userId: user.id,
        email: user.email
      });
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session regeneration failed', err);
        return res.status(500).json({
          error: 'Session error',
          message: 'Failed to create secure session. Please try again.'
        });
      }

      // Create new session with user data
      req.session.userId = user.id;
      req.session.username = user.username;
      
      // Generate and store device fingerprint for session validation
      req.session.deviceFingerprint = generateFingerprint(req);
      req.session.lastActivity = Date.now();

      // If remember me is checked, extend cookie duration to 30 days
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      logger.info('User logged in successfully', {
        userId: user.id,
        username: user.username,
        rememberMe: !!rememberMe,
        deviceFingerprint: req.session.deviceFingerprint.substring(0, 8) + '...' // Log first 8 chars only
      });

      // Log login activity
      logManualActivity(req, ActivityTypes.USER_LOGIN, 'user', user.id, { 
        username: user.username, 
        rememberMe: !!rememberMe 
      });

      // Send admin notification for user login (non-blocking)
      emailService.sendUserLoginNotification({
        id: user.id,
        username: user.username,
        email: user.email
      }).then(() => {
        logger.info('Admin notification sent for user login', {
          userId: user.id
        });
      }).catch((error) => {
        logger.warn('Failed to send admin notification for user login', {
          error: error.message,
          userId: user.id
        });
        // Continue anyway - login is successful
      });

      res.json({
        success: true,
        message: 'Login successful',
        username: user.username
      });
    });
  })
);

/**
 * POST /api/logout
 * Logout user
 */
router.post('/api/logout', csrfProtection, (req, res) => {
  const userId = req.session.userId;

  // Log logout before destroying session
  if (userId) {
    logManualActivity(req, ActivityTypes.USER_LOGOUT, 'user', userId);
  }

  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout failed', err);
      return res.status(500).json({
        error: 'Logout failed'
      });
    }

    logger.info('User logged out', { userId });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /api/user
 * Get current user information
 */
router.get('/api/user', asyncHandler(async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      error: 'Not authenticated'
    });
  }

  const user = await userRepository.findById(req.session.userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  res.json(user);
}));

/**
 * GET /api/session/status
 * Check session status and get session info
 */
router.get('/api/session/status', asyncHandler(async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({
      authenticated: false,
      expiresIn: null,
      username: null
    });
  }

  // Get user details to include is_admin and is_manager
  const user = await userRepository.findById(req.session.userId);

  // Calculate time until session expires
  const expiresIn = req.session.cookie.maxAge;
  const expiresAt = new Date(Date.now() + expiresIn);

  res.json({
    authenticated: true,
    expiresIn: expiresIn,
    expiresAt: expiresAt.toISOString(),
    username: req.session.username,
    userId: req.session.userId,
    is_admin: user ? (user.is_admin || false) : false,
    is_manager: user ? (user.is_manager || false) : false,
    tokens: user ? user.tokens : 0
  });
}));

/**
 * GET /api/debug/my-permissions
 * Debug endpoint to check current user's permissions
 */
router.get('/api/debug/my-permissions', asyncHandler(async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Not authenticated'
    });
  }

  const user = await userRepository.findById(req.session.userId);
  
  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  // Test the middleware logic
  const isAdmin = !!(user.is_admin === true || user.is_admin === 'true' || user.is_admin === 1 || user.is_admin === '1');
  const isManager = !!(user.is_manager === true || user.is_manager === 'true' || user.is_manager === 1 || user.is_manager === '1');
  const hasAdmin = user.is_admin !== null && user.is_admin !== undefined && isAdmin;
  const hasManager = user.is_manager !== null && user.is_manager !== undefined && isManager;

  res.json({
    userId: user.id,
    username: user.username,
    email: user.email,
    raw_values: {
      is_admin: user.is_admin,
      is_admin_type: typeof user.is_admin,
      is_manager: user.is_manager,
      is_manager_type: typeof user.is_manager
    },
    computed: {
      isAdmin,
      isManager,
      hasAdmin,
      hasManager,
      hasManagerOrAdminAccess: hasAdmin || hasManager
    },
    canAccessApproveUsers: hasAdmin || hasManager
  });
}));

/**
 * GET /verify-email
 * Serve email verification page
 */
router.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'verify-email.html'));
});

/**
 * POST /api/verify-email
 * Verify email with token
 */
router.post(
  '/api/verify-email',
  authLimiter,
  validators.emailToken,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    logger.info('Verification attempt', { 
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 8) + '...' : 'missing'
    });

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    // Find user by verification token
    logger.info('Looking up user by verification token...');
    const user = await userRepository.findByVerificationToken(token);

    if (!user) {
      logger.warn('Invalid or expired verification token', { 
        token: token ? token.substring(0, 8) + '...' : 'missing'
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
        message: 'This verification link is invalid or has expired. Please request a new one.'
      });
    }

    // Verify email
    const verified = await userRepository.verifyEmail(user.id);

    if (!verified) {
      logger.error('Failed to verify email', { userId: user.id });
      return res.status(500).json({
        error: 'Failed to verify email',
        message: 'An error occurred while verifying your email. Please try again.'
      });
    }

    logger.info('Email verified successfully', {
      userId: user.id,
      email: user.email
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.username);
      logger.info('Welcome email sent', { userId: user.id });
    } catch (error) {
      logger.error('Failed to send welcome email', error);
      // Continue anyway - user is verified
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      username: user.username
    });
  })
);

/**
 * POST /api/resend-verification
 * Resend verification email
 */
router.post(
  '/api/resend-verification',
  emailLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Find user by email
    const user = await userRepository.findByUsernameOrEmail(email, email);

    if (!user) {
      // Don't reveal if user exists
      logger.warn('Verification resend attempt for non-existent email', { email });
      return res.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.'
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'This email is already verified. You can log in now.'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    await userRepository.setVerificationToken(user.id, verificationToken, expiresAt.toISOString());

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
      logger.info('Verification email resent', {
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      logger.error('Failed to resend verification email', error);
      return res.status(500).json({
        error: 'Failed to send verification email',
        message: 'An error occurred while sending the email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  })
);

/**
 * GET /forgot-password
 * Serve forgot password page
 */
router.get('/forgot-password', csrfProtection, sendCsrfToken, redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'forgot-password.html'));
});

/**
 * POST /api/forgot-password
 * Request password reset
 */
router.post(
  '/api/forgot-password',
  emailLimiter,
  csrfProtection,
  validators.forgotPassword,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Find user by email
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists - security best practice
      logger.warn('Password reset attempt for non-existent email', { email });
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      logger.warn('Password reset attempt for unverified email', { email, userId: user.id });
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email before resetting your password.'
      });
    }

    // Generate password reset token (1 hour expiry)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await userRepository.setPasswordResetToken(user.id, resetToken, expiresAt.toISOString());

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
      logger.info('Password reset email sent', {
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      logger.error('Failed to send password reset email', error);
      return res.status(500).json({
        error: 'Failed to send email',
        message: 'An error occurred while sending the password reset email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  })
);

/**
 * GET /reset-password
 * Serve reset password page
 */
router.get('/reset-password', csrfProtection, sendCsrfToken, redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'reset-password.html'));
});

/**
 * POST /api/reset-password
 * Reset password with token
 */
router.post(
  '/api/reset-password',
  authLimiter,
  csrfProtection,
  validators.resetPassword,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Token and password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Find user by reset token
    const user = await userRepository.findByPasswordResetToken(token);

    if (!user) {
      logger.warn('Invalid or expired password reset token', { token });
      return res.status(400).json({
        error: 'Invalid or expired reset link',
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Update password
    const updated = await userRepository.updatePassword(user.id, hashedPassword);

    if (!updated) {
      logger.error('Failed to update password', { userId: user.id });
      return res.status(500).json({
        error: 'Failed to reset password',
        message: 'An error occurred while resetting your password. Please try again.'
      });
    }

    // Clear reset token
    await userRepository.clearPasswordResetToken(user.id);

    logger.info('Password reset successfully', {
      userId: user.id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  })
);

module.exports = router;
