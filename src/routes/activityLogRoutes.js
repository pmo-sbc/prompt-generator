/**
 * Activity Log Routes
 * API endpoints for viewing user activity logs
 */

const express = require('express');
const ActivityLogRepository = require('../db/activityLogRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/activity/my
 * Get current user's activity logs
 */
router.get('/my',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const logs = ActivityLogRepository.findByUserId(userId, limit, offset);
    const total = ActivityLogRepository.countByUserId(userId);

    res.json({
      success: true,
      logs,
      total,
      limit,
      offset
    });
  })
);

/**
 * GET /api/admin/activity
 * Get all activity logs (admin only)
 */
router.get('/admin/activity',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const filters = {};
    if (req.query.userId) filters.userId = parseInt(req.query.userId);
    if (req.query.action) filters.action = req.query.action;
    if (req.query.resourceType) filters.resourceType = req.query.resourceType;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const logs = ActivityLogRepository.findAll(limit, offset, filters);

    logger.debug('Admin fetched activity logs', {
      adminUserId: req.session.userId,
      filters,
      count: logs.length
    });

    res.json({
      success: true,
      logs,
      filters,
      limit,
      offset
    });
  })
);

/**
 * GET /api/admin/activity/stats
 * Get activity statistics (admin only)
 */
router.get('/admin/activity/stats',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const stats = ActivityLogRepository.getStats(filters);

    res.json({
      success: true,
      stats
    });
  })
);

/**
 * DELETE /api/admin/activity/cleanup
 * Delete old activity logs (admin only)
 */
router.delete('/admin/activity/cleanup',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 90; // Default 90 days

    if (days < 30) {
      return res.status(400).json({
        error: 'Minimum retention period is 30 days'
      });
    }

    const deletedCount = ActivityLogRepository.deleteOlderThan(days);

    logger.info('Activity logs cleanup performed', {
      adminUserId: req.session.userId,
      days,
      deletedCount
    });

    res.json({
      success: true,
      message: `Deleted ${deletedCount} activity logs older than ${days} days`,
      deletedCount
    });
  })
);

module.exports = router;
