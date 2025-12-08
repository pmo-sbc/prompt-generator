/**
 * Activity Log Repository
 * Handles database operations for user activity tracking
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class ActivityLogRepository {
  /**
   * Create a new activity log entry
   */
  static create(userId, action, resourceType = null, resourceId = null, details = null, ipAddress = null, userAgent = null) {
    const db = getDatabase();

    try {
      const result = db.prepare(`
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        action,
        resourceType,
        resourceId,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent
      );

      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Error creating activity log', { error, userId, action });
      throw error;
    }
  }

  /**
   * Get activity logs for a specific user
   */
  static findByUserId(userId, limit = 100, offset = 0) {
    const db = getDatabase();

    try {
      const logs = db.prepare(`
        SELECT * FROM activity_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset);

      return logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }));
    } catch (error) {
      logger.error('Error fetching activity logs', { error, userId });
      throw error;
    }
  }

  /**
   * Get all activity logs (admin only)
   */
  static findAll(limit = 100, offset = 0, filters = {}) {
    const db = getDatabase();

    try {
      let query = 'SELECT al.*, u.username FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id';
      const params = [];
      const conditions = [];

      // Apply filters
      if (filters.userId) {
        conditions.push('al.user_id = ?');
        params.push(filters.userId);
      }

      if (filters.action) {
        conditions.push('al.action = ?');
        params.push(filters.action);
      }

      if (filters.resourceType) {
        conditions.push('al.resource_type = ?');
        params.push(filters.resourceType);
      }

      if (filters.startDate) {
        conditions.push('al.created_at >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('al.created_at <= ?');
        params.push(filters.endDate);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const logs = db.prepare(query).all(...params);

      return logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }));
    } catch (error) {
      logger.error('Error fetching all activity logs', { error, filters });
      throw error;
    }
  }

  /**
   * Get activity log statistics
   */
  static getStats(filters = {}) {
    const db = getDatabase();

    try {
      let whereClause = '';
      const params = [];

      if (filters.startDate || filters.endDate) {
        const conditions = [];
        if (filters.startDate) {
          conditions.push('created_at >= ?');
          params.push(filters.startDate);
        }
        if (filters.endDate) {
          conditions.push('created_at <= ?');
          params.push(filters.endDate);
        }
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      // Total activities
      const totalQuery = `SELECT COUNT(*) as count FROM activity_logs ${whereClause}`;
      const total = db.prepare(totalQuery).get(...params).count;

      // Activities by action
      const actionQuery = `
        SELECT action, COUNT(*) as count
        FROM activity_logs ${whereClause}
        GROUP BY action
        ORDER BY count DESC
      `;
      const byAction = db.prepare(actionQuery).all(...params);

      // Activities by resource type
      const resourceQuery = `
        SELECT resource_type, COUNT(*) as count
        FROM activity_logs
        ${whereClause ? whereClause + ' AND' : 'WHERE'} resource_type IS NOT NULL
        GROUP BY resource_type
        ORDER BY count DESC
      `;
      const byResource = db.prepare(resourceQuery).all(...params);

      // Most active users
      const userQuery = `
        SELECT u.username, COUNT(*) as count
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        GROUP BY al.user_id
        ORDER BY count DESC
        LIMIT 10
      `;
      const topUsers = db.prepare(userQuery).all(...params);

      // Recent activity count (last 24 hours)
      const last24hQuery = `
        SELECT COUNT(*) as count
        FROM activity_logs
        WHERE created_at >= datetime('now', '-1 day')
      `;
      const last24h = db.prepare(last24hQuery).get().count;

      return {
        total,
        last24h,
        byAction,
        byResource,
        topUsers
      };
    } catch (error) {
      logger.error('Error getting activity stats', { error });
      throw error;
    }
  }

  /**
   * Delete old activity logs (for cleanup)
   */
  static deleteOlderThan(days) {
    const db = getDatabase();

    try {
      const result = db.prepare(`
        DELETE FROM activity_logs
        WHERE created_at < datetime('now', '-' || ? || ' days')
      `).run(days);

      logger.info(`Deleted ${result.changes} activity logs older than ${days} days`);
      return result.changes;
    } catch (error) {
      logger.error('Error deleting old activity logs', { error, days });
      throw error;
    }
  }

  /**
   * Get count of logs for a user
   */
  static countByUserId(userId) {
    const db = getDatabase();

    try {
      const result = db.prepare('SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ?').get(userId);
      return result.count;
    } catch (error) {
      logger.error('Error counting activity logs', { error, userId });
      throw error;
    }
  }
}

module.exports = ActivityLogRepository;
