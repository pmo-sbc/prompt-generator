/**
 * Activity Logging Middleware
 * Automatically logs user activities for audit trail
 */

const ActivityLogRepository = require('../db/activityLogRepository');
const logger = require('../utils/logger');

/**
 * Activity logging middleware
 * Logs user actions after successful operations
 */
function logActivity(action, resourceType = null) {
  return (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to log after response
    res.send = function(data) {
      // Only log on success (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.session?.userId || null;
          const resourceId = req.params?.id || req.body?.id || null;
          const ipAddress = req.ip || req.connection?.remoteAddress;
          const userAgent = req.get('user-agent');

          // Extract relevant details
          const details = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          };

          // Add resource-specific details
          if (req.body && Object.keys(req.body).length > 0) {
            // Don't log sensitive data
            const sanitizedBody = { ...req.body };
            delete sanitizedBody.password;
            delete sanitizedBody.currentPassword;
            delete sanitizedBody.newPassword;
            details.body = sanitizedBody;
          }

          // Log activity asynchronously
          setImmediate(() => {
            try {
              ActivityLogRepository.create(
                userId,
                action,
                resourceType,
                resourceId,
                details,
                ipAddress,
                userAgent
              );
            } catch (error) {
              logger.error('Failed to log activity', { error, action, userId });
            }
          });
        } catch (error) {
          logger.error('Activity logging error', { error, action });
        }
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Manual activity logging helper
 * For custom logging scenarios
 */
function logManualActivity(req, action, resourceType = null, resourceId = null, details = null) {
  try {
    const userId = req.session?.userId || null;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');

    ActivityLogRepository.create(
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent
    );
  } catch (error) {
    logger.error('Manual activity logging failed', { error, action });
  }
}

/**
 * Predefined activity types
 */
const ActivityTypes = {
  // Authentication
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  PASSWORD_CHANGE: 'user.password_change',
  PASSWORD_RESET: 'user.password_reset',
  EMAIL_VERIFY: 'user.email_verify',

  // Profile
  PROFILE_UPDATE: 'profile.update',
  PROFILE_VIEW: 'profile.view',
  ACCOUNT_DELETE: 'account.delete',

  // Prompts
  PROMPT_CREATE: 'prompt.create',
  PROMPT_UPDATE: 'prompt.update',
  PROMPT_DELETE: 'prompt.delete',
  PROMPT_VIEW: 'prompt.view',
  PROMPT_BULK_DELETE: 'prompt.bulk_delete',
  PROMPT_BULK_ASSIGN: 'prompt.bulk_assign',

  // Projects
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_VIEW: 'project.view',

  // Templates
  TEMPLATE_CREATE: 'template.create',
  TEMPLATE_UPDATE: 'template.update',
  TEMPLATE_DELETE: 'template.delete',
  TEMPLATE_VIEW: 'template.view',
  TEMPLATE_USE: 'template.use',

  // Admin
  ADMIN_USER_DELETE: 'admin.user_delete',
  ADMIN_USER_UPDATE: 'admin.user_update',
  ADMIN_TOKEN_ADJUST: 'admin.token_adjust',

  // System
  EXPORT_DATA: 'system.export_data',
  IMPORT_DATA: 'system.import_data'
};

module.exports = {
  logActivity,
  logManualActivity,
  ActivityTypes
};
