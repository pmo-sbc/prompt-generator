/**
 * Settings Repository
 * Data access layer for system settings
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class SettingsRepository {
  /**
   * Get a setting value
   */
  async get(key, defaultValue = null) {
    const db = getDatabaseWrapper();

    try {
      logger.db('SELECT', 'settings', { key });

      const result = await db.prepare(`
        SELECT value FROM settings WHERE key = $1
      `).get(key);

      if (!result) {
        return defaultValue;
      }

      // Try to parse as boolean if value is 'true' or 'false'
      const value = result.value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      
      return value;
    } catch (error) {
      logger.error('Error getting setting', error);
      throw error;
    }
  }

  /**
   * Set a setting value
   */
  async set(key, value, description = null, updatedBy = null) {
    const db = getDatabaseWrapper();

    try {
      logger.db('UPSERT', 'settings', { key, value });

      const stringValue = String(value);

      const result = await db.prepare(`
        INSERT INTO settings (key, value, description, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          description = COALESCE(EXCLUDED.description, settings.description),
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `).get(key, stringValue, description, updatedBy);

      return result;
    } catch (error) {
      logger.error('Error setting setting', error);
      throw error;
    }
  }

  /**
   * Get all settings
   */
  async getAll() {
    const db = getDatabaseWrapper();

    try {
      logger.db('SELECT', 'settings', {});

      const results = await db.prepare(`
        SELECT 
          s.*,
          u.username as updated_by_username
        FROM settings s
        LEFT JOIN users u ON s.updated_by = u.id
        ORDER BY s.key
      `).all();

      return results;
    } catch (error) {
      logger.error('Error fetching all settings', error);
      throw error;
    }
  }
}

module.exports = new SettingsRepository();

