/**
 * Statistics Repository
 * Data access layer for usage statistics operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class StatsRepository {
  /**
   * Track template usage
   */
  async trackUsage(userId, templateName, category) {
    const db = getDatabaseWrapper();
    const query = `
      INSERT INTO usage_stats (user_id, template_name, category)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    try {
      logger.db('INSERT', 'usage_stats', { userId, templateName, category });
      const result = await db.prepare(query).get(userId, templateName, category);
      return result.id;
    } catch (error) {
      logger.error('Error tracking usage', error);
      throw error;
    }
  }

  /**
   * Get total usage count for a user
   */
  async getTotalUsage(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT COUNT(*) as count FROM usage_stats WHERE user_id = $1';

    try {
      const result = await db.prepare(query).get(userId);
      return parseInt(result.count, 10);
    } catch (error) {
      logger.error('Error getting total usage', error);
      throw error;
    }
  }

  /**
   * Get usage statistics by category
   */
  async getUsageByCategory(userId) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT category, COUNT(*) as count
      FROM usage_stats
      WHERE user_id = $1
      GROUP BY category
      ORDER BY count DESC
    `;

    try {
      logger.db('SELECT', 'usage_stats', { userId });
      const results = await db.prepare(query).all(userId);
      // Parse count from PostgreSQL string to number
      return results.map(row => ({
        ...row,
        count: parseInt(row.count, 10)
      }));
    } catch (error) {
      logger.error('Error getting category stats', error);
      throw error;
    }
  }

  /**
   * Get recent activity for a user
   */
  async getRecentActivity(userId, limit = 10) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT template_name, category, used_at
      FROM usage_stats
      WHERE user_id = $1
      ORDER BY used_at DESC
      LIMIT $2
    `;

    try {
      logger.db('SELECT', 'usage_stats', { userId, limit });
      return await db.prepare(query).all(userId, limit);
    } catch (error) {
      logger.error('Error getting recent activity', error);
      throw error;
    }
  }

  /**
   * Get most used templates for a user
   */
  async getMostUsedTemplates(userId, limit = 5) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT template_name, category, COUNT(*) as count
      FROM usage_stats
      WHERE user_id = $1
      GROUP BY template_name, category
      ORDER BY count DESC
      LIMIT $2
    `;

    try {
      const results = await db.prepare(query).all(userId, limit);
      // Parse count from PostgreSQL string to number
      return results.map(row => ({
        ...row,
        count: parseInt(row.count, 10)
      }));
    } catch (error) {
      logger.error('Error getting most used templates', error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics for a user
   */
  async getUserStats(userId) {
    try {
      const totalUsage = await this.getTotalUsage(userId);
      const categoryStats = await this.getUsageByCategory(userId);
      const recentActivity = await this.getRecentActivity(userId);
      const mostUsedTemplates = await this.getMostUsedTemplates(userId);

      return {
        totalUsage,
        categoryStats,
        recentActivity,
        mostUsedTemplates
      };
    } catch (error) {
      logger.error('Error getting user stats', error);
      throw error;
    }
  }

  /**
   * Delete all usage stats for a user
   */
  async deleteByUserId(userId) {
    const db = getDatabaseWrapper();
    const query = 'DELETE FROM usage_stats WHERE user_id = $1';

    try {
      logger.db('DELETE', 'usage_stats', { userId });
      const result = await db.prepare(query).run(userId);
      return result.changes;
    } catch (error) {
      logger.error('Error deleting usage stats', error);
      throw error;
    }
  }
}

module.exports = new StatsRepository();
