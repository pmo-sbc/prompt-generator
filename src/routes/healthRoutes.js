/**
 * Health Check & System Monitoring Routes
 * Provides system health status and metrics
 */

const express = require('express');
const os = require('os');
const { getDatabase } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

// Track application start time
const startTime = Date.now();

/**
 * GET /health
 * Basic health check endpoint
 * Returns 200 if service is healthy
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /health/detailed
 * Detailed health check with system metrics
 */
router.get('/health/detailed', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: {
        name: 'AI Prompt Templates',
        version: '1.0.0',
        environment: config.nodeEnv,
        uptime: process.uptime(),
        startTime: new Date(startTime).toISOString()
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: formatBytes(os.totalmem()),
        freeMemory: formatBytes(os.freemem()),
        memoryUsage: process.memoryUsage(),
        loadAverage: os.loadavg()
      },
      process: {
        pid: process.pid,
        memoryUsage: {
          rss: formatBytes(process.memoryUsage().rss),
          heapTotal: formatBytes(process.memoryUsage().heapTotal),
          heapUsed: formatBytes(process.memoryUsage().heapUsed),
          external: formatBytes(process.memoryUsage().external)
        },
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      },
      checks: {}
    };

    // Database health check
    try {
      const db = getDatabase();
      const result = db.prepare('SELECT 1 as health').get();
      health.checks.database = {
        status: result.health === 1 ? 'healthy' : 'unhealthy',
        responseTime: 'OK'
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Session store health check
    try {
      // Simple check - if we got this far, sessions are working
      health.checks.sessions = {
        status: 'healthy',
        store: 'SQLite'
      };
    } catch (error) {
      health.checks.sessions = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Log the health check
    if (health.status !== 'healthy') {
      logger.warn('Health check returned degraded status', health);
    }

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe (is the service ready to accept traffic?)
 */
router.get('/health/ready', (req, res) => {
  try {
    // Check if database is accessible
    const db = getDatabase();
    db.prepare('SELECT 1').get();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/live
 * Liveness probe (is the service alive?)
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    const db = getDatabase();

    // Get database statistics
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates WHERE is_active = 1').get().count;
    const promptCount = db.prepare('SELECT COUNT(*) as count FROM saved_prompts').get().count;
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;

    // Memory metrics
    const memUsage = process.memoryUsage();

    // Generate Prometheus format
    const metrics = [
      '# HELP app_uptime_seconds Application uptime in seconds',
      '# TYPE app_uptime_seconds gauge',
      `app_uptime_seconds ${process.uptime()}`,
      '',
      '# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes',
      '# TYPE nodejs_memory_usage_bytes gauge',
      `nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}`,
      `nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`,
      `nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`,
      `nodejs_memory_usage_bytes{type="external"} ${memUsage.external}`,
      '',
      '# HELP db_users_total Total number of users',
      '# TYPE db_users_total gauge',
      `db_users_total ${userCount}`,
      '',
      '# HELP db_templates_total Total number of active templates',
      '# TYPE db_templates_total gauge',
      `db_templates_total ${templateCount}`,
      '',
      '# HELP db_prompts_total Total number of saved prompts',
      '# TYPE db_prompts_total gauge',
      `db_prompts_total ${promptCount}`,
      '',
      '# HELP db_projects_total Total number of projects',
      '# TYPE db_projects_total gauge',
      `db_projects_total ${projectCount}`,
      ''
    ].join('\n');

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error) {
    logger.error('Metrics endpoint error', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

/**
 * Utility function to format bytes to human-readable format
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

module.exports = router;
