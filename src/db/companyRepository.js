/**
 * Company Repository
 * Data access layer for company operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class CompanyRepository {
  /**
   * Find all companies for a user
   */
  async findByUserId(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT * FROM companies WHERE user_id = $1 ORDER BY created_at DESC';

    try {
      logger.db('SELECT', 'companies', { userId });
      return await db.prepare(query).all(userId);
    } catch (error) {
      logger.error('Error finding companies by user ID', error);
      throw error;
    }
  }

  /**
   * Find company by ID
   */
  async findById(companyId, userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT * FROM companies WHERE id = $1 AND user_id = $2';

    try {
      logger.db('SELECT', 'companies', { companyId, userId });
      return await db.prepare(query).get(companyId, userId);
    } catch (error) {
      logger.error('Error finding company by ID', error);
      throw error;
    }
  }

  /**
   * Create new company
   */
  async create(userId, name, legalName = null, marketingName = null) {
    const db = getDatabaseWrapper();
    const query = 'INSERT INTO companies (user_id, name, legal_name, marketing_name, created_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id';

    try {
      logger.db('INSERT', 'companies', { userId, name, legalName, marketingName });
      const result = await db.prepare(query).get(userId, name, legalName || null, marketingName || null);
      return {
        id: result.id,
        user_id: userId,
        name,
        legal_name: legalName || null,
        marketing_name: marketingName || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error creating company', error);
      throw error;
    }
  }

  /**
   * Update company
   */
  async update(companyId, userId, name, legalName = null, marketingName = null) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE companies SET name = $1, legal_name = $2, marketing_name = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5';

    try {
      logger.db('UPDATE', 'companies', { companyId, userId, name, legalName, marketingName });
      const result = await db.prepare(query).run(name, legalName || null, marketingName || null, companyId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating company', error);
      throw error;
    }
  }

  /**
   * Delete company
   */
  async delete(companyId, userId) {
    const db = getDatabaseWrapper();
    const query = 'DELETE FROM companies WHERE id = $1 AND user_id = $2';

    try {
      logger.db('DELETE', 'companies', { companyId, userId });
      const result = await db.prepare(query).run(companyId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting company', error);
      throw error;
    }
  }
}

module.exports = new CompanyRepository();

