/**
 * Statistics Routes
 */

const express = require('express');
const statsRepository = require('../db/statsRepository');
const promptRepository = require('../db/promptRepository');
const validators = require('../validators');
const { handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/usage
 * Track template usage
 */
router.post(
  '/',
  csrfProtection,
  validators.trackUsage,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { templateName, category } = req.body;
    const userId = req.session.userId;

    await statsRepository.trackUsage(userId, templateName, category);

    logger.debug('Usage tracked', {
      userId,
      templateName,
      category
    });

    res.json({
      success: true,
      message: 'Usage tracked successfully'
    });
  })
);

/**
 * GET /api/stats
 * Get comprehensive user statistics
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    // Get usage stats
    const totalUsage = await statsRepository.getTotalUsage(userId);
    const categoryStats = await statsRepository.getUsageByCategory(userId);
    const recentActivity = await statsRepository.getRecentActivity(userId);
    const mostUsedTemplates = await statsRepository.getMostUsedTemplates(userId);

    // Get prompt count
    const totalPrompts = await promptRepository.countByUserId(userId);

    logger.debug('Stats retrieved', { userId });

    res.json({
      totalPrompts,
      totalUsage,
      categoryStats,
      recentActivity,
      mostUsedTemplates
    });
  })
);

/**
 * GET /api/stats/category
 * Get usage by category
 */
router.get(
  '/category',
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const categoryStats = await statsRepository.getUsageByCategory(userId);

    res.json(categoryStats);
  })
);

/**
 * GET /api/stats/recent
 * Get recent activity
 */
router.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 10;

    const recentActivity = await statsRepository.getRecentActivity(userId, limit);

    res.json(recentActivity);
  })
);

/**
 * GET /api/stats/templates
 * Get most used templates
 */
router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 5;

    const mostUsedTemplates = await statsRepository.getMostUsedTemplates(userId, limit);

    res.json(mostUsedTemplates);
  })
);

module.exports = router;
