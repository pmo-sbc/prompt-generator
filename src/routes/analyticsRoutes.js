/**
 * Analytics Routes
 * API endpoints for admin analytics and statistics
 */

const express = require('express');
const { getDatabase } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/analytics/overview
 * Get overview statistics for admin dashboard
 */
router.get('/overview',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = getDatabase();

    // User statistics
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE email_verified = 1').get().count;
    const adminUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get().count;

    // Users registered in last 30 days
    const recentUsers = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at > datetime('now', '-30 days')
    `).get().count;

    // Template statistics
    const totalTemplates = db.prepare('SELECT COUNT(*) as count FROM templates').get().count;
    const premiumTemplates = db.prepare('SELECT COUNT(*) as count FROM templates WHERE is_premium = 1').get().count;
    const deletedTemplates = db.prepare('SELECT COUNT(*) as count FROM templates WHERE deleted = 1').get().count;

    // Prompt statistics
    const totalPrompts = db.prepare('SELECT COUNT(*) as count FROM prompts').get().count;
    const promptsLast30Days = db.prepare(`
      SELECT COUNT(*) as count
      FROM prompts
      WHERE created_at > datetime('now', '-30 days')
    `).get().count;

    // Project statistics
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const projectsLast30Days = db.prepare(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE created_at > datetime('now', '-30 days')
    `).get().count;

    // Activity statistics
    const totalActivities = db.prepare('SELECT COUNT(*) as count FROM activity_logs').get().count;
    const activitiesLast24Hours = db.prepare(`
      SELECT COUNT(*) as count
      FROM activity_logs
      WHERE created_at > datetime('now', '-1 day')
    `).get().count;

    // Most active users
    const mostActiveUsers = db.prepare(`
      SELECT
        u.id,
        u.username,
        u.email,
        COUNT(al.id) as activity_count
      FROM users u
      LEFT JOIN activity_logs al ON u.id = al.user_id
      WHERE al.created_at > datetime('now', '-30 days')
      GROUP BY u.id
      ORDER BY activity_count DESC
      LIMIT 10
    `).all();

    // Popular templates
    const popularTemplates = db.prepare(`
      SELECT
        t.id,
        t.name,
        t.category,
        COUNT(p.id) as usage_count
      FROM templates t
      LEFT JOIN prompts p ON t.id = p.template_id
      WHERE t.deleted = 0
      GROUP BY t.id
      ORDER BY usage_count DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      overview: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          admins: adminUsers,
          recentRegistrations: recentUsers
        },
        templates: {
          total: totalTemplates,
          premium: premiumTemplates,
          deleted: deletedTemplates,
          active: totalTemplates - deletedTemplates
        },
        prompts: {
          total: totalPrompts,
          last30Days: promptsLast30Days
        },
        projects: {
          total: totalProjects,
          last30Days: projectsLast30Days
        },
        activities: {
          total: totalActivities,
          last24Hours: activitiesLast24Hours
        },
        mostActiveUsers,
        popularTemplates
      }
    });
  })
);

/**
 * GET /api/analytics/users/growth
 * Get user growth statistics over time
 */
router.get('/users/growth',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const days = parseInt(req.query.days) || 30;

    // Daily user registrations
    const dailyRegistrations = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    // Cumulative user count
    const cumulativeUsers = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total
      FROM users
      WHERE created_at <= datetime('now')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    res.json({
      success: true,
      growth: {
        dailyRegistrations,
        cumulativeUsers: cumulativeUsers.slice(-days)
      }
    });
  })
);

/**
 * GET /api/analytics/activity/timeline
 * Get activity timeline statistics
 */
router.get('/activity/timeline',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const days = parseInt(req.query.days) || 7;

    // Activity by day
    const dailyActivity = db.prepare(`
      SELECT
        DATE(created_at) as date,
        action,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY DATE(created_at), action
      ORDER BY date ASC, count DESC
    `).all();

    // Activity by hour (last 24 hours)
    const hourlyActivity = db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00:00', created_at) as hour,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at > datetime('now', '-1 day')
      GROUP BY strftime('%Y-%m-%d %H:00:00', created_at)
      ORDER BY hour ASC
    `).all();

    res.json({
      success: true,
      timeline: {
        dailyActivity,
        hourlyActivity
      }
    });
  })
);

/**
 * GET /api/analytics/templates/usage
 * Get template usage statistics
 */
router.get('/templates/usage',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = getDatabase();

    // Usage by category
    const usageByCategory = db.prepare(`
      SELECT
        t.category,
        COUNT(DISTINCT t.id) as template_count,
        COUNT(p.id) as prompt_count
      FROM templates t
      LEFT JOIN prompts p ON t.id = p.template_id
      WHERE t.deleted = 0
      GROUP BY t.category
      ORDER BY prompt_count DESC
    `).all();

    // Usage over time (last 30 days)
    const usageOverTime = db.prepare(`
      SELECT
        DATE(p.created_at) as date,
        COUNT(*) as count
      FROM prompts p
      WHERE p.created_at > datetime('now', '-30 days')
      GROUP BY DATE(p.created_at)
      ORDER BY date ASC
    `).all();

    // Premium vs Free usage
    const premiumVsFree = db.prepare(`
      SELECT
        CASE WHEN t.is_premium = 1 THEN 'Premium' ELSE 'Free' END as type,
        COUNT(p.id) as usage_count
      FROM templates t
      LEFT JOIN prompts p ON t.id = p.template_id
      WHERE t.deleted = 0
      GROUP BY t.is_premium
    `).all();

    res.json({
      success: true,
      usage: {
        byCategory: usageByCategory,
        overTime: usageOverTime,
        premiumVsFree
      }
    });
  })
);

/**
 * GET /api/analytics/system/health
 * Get system health metrics
 */
router.get('/system/health',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = getDatabase();

    // Database size
    const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();

    // Table row counts
    const tableCounts = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      templates: db.prepare('SELECT COUNT(*) as count FROM templates').get().count,
      prompts: db.prepare('SELECT COUNT(*) as count FROM prompts').get().count,
      projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
      activity_logs: db.prepare('SELECT COUNT(*) as count FROM activity_logs').get().count
    };

    // Session count (if sessions table exists)
    let sessionCount = 0;
    try {
      sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
    } catch (error) {
      // Sessions table might not exist
      logger.debug('Sessions table not found');
    }

    // Memory and process info
    const processMemory = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      success: true,
      health: {
        database: {
          size: dbSize.size,
          sizeFormatted: `${(dbSize.size / 1024 / 1024).toFixed(2)} MB`
        },
        tables: tableCounts,
        sessions: sessionCount,
        process: {
          memoryUsage: {
            rss: `${(processMemory.rss / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(processMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(processMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            external: `${(processMemory.external / 1024 / 1024).toFixed(2)} MB`
          },
          uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
          uptimeSeconds: uptime
        }
      }
    });
  })
);

module.exports = router;
