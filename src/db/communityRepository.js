/**
 * Community Repository
 * Data access layer for community operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class CommunityRepository {
  /**
   * Find all communities for a company
   */
  async findByCompanyId(companyId, userId) {
    const db = getDatabaseWrapper();
    // Join with companies to ensure the company belongs to the user
    const query = `
      SELECT c.* FROM communities c
      INNER JOIN companies co ON c.company_id = co.id
      WHERE c.company_id = $1 AND co.user_id = $2
      ORDER BY c.created_at DESC
    `;

    try {
      logger.db('SELECT', 'communities', { companyId, userId });
      const communities = await db.prepare(query).all(companyId, userId);
      // Parse JSON fields
      return communities.map(community => {
        if (community.technologies) {
          try {
            community.technologies = typeof community.technologies === 'string' 
              ? JSON.parse(community.technologies) 
              : community.technologies;
          } catch (e) {
            community.technologies = [];
          }
        } else {
          community.technologies = [];
        }
        return community;
      });
    } catch (error) {
      logger.error('Error finding communities by company ID', error);
      throw error;
    }
  }

  /**
   * Find community by ID (with user verification)
   */
  async findById(communityId, userId) {
    const db = getDatabaseWrapper();
    // Join with companies to ensure the community's company belongs to the user
    const query = `
      SELECT c.* FROM communities c
      INNER JOIN companies co ON c.company_id = co.id
      WHERE c.id = $1 AND co.user_id = $2
    `;

    try {
      logger.db('SELECT', 'communities', { communityId, userId });
      const community = await db.prepare(query).get(communityId, userId);
      if (community) {
        // Parse JSON fields
        if (community.technologies) {
          try {
            community.technologies = typeof community.technologies === 'string' 
              ? JSON.parse(community.technologies) 
              : community.technologies;
          } catch (e) {
            community.technologies = [];
          }
        } else {
          community.technologies = [];
        }
      }
      return community;
    } catch (error) {
      logger.error('Error finding community by ID', error);
      throw error;
    }
  }

  /**
   * Verify company belongs to user
   */
  async verifyCompanyOwnership(companyId, userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT id FROM companies WHERE id = $1 AND user_id = $2';

    try {
      const result = await db.prepare(query).get(companyId, userId);
      return !!result;
    } catch (error) {
      logger.error('Error verifying company ownership', error);
      return false;
    }
  }

  /**
   * Create new community
   */
  async create(companyId, name, ilec = false, clec = false, servingCompanyName = null, technologies = []) {
    const db = getDatabaseWrapper();
    const query = `
      INSERT INTO communities (company_id, name, ilec, clec, serving_company_name, technologies, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    try {
      const technologiesJson = JSON.stringify(technologies);
      logger.db('INSERT', 'communities', { companyId, name, ilec, clec, servingCompanyName });
      const result = await db.prepare(query).get(
        companyId, 
        name, 
        ilec, 
        clec, 
        servingCompanyName || null,
        technologiesJson
      );
      return {
        id: result.id,
        company_id: companyId,
        name,
        ilec: !!ilec,
        clec: !!clec,
        serving_company_name: servingCompanyName,
        technologies: technologies,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error creating community', error);
      throw error;
    }
  }

  /**
   * Update community
   */
  async update(communityId, userId, name, ilec = false, clec = false, servingCompanyName = null, technologies = []) {
    const db = getDatabaseWrapper();
    // Update only if community belongs to user (via company)
    const query = `
      UPDATE communities 
      SET name = $1, ilec = $2, clec = $3, serving_company_name = $4, technologies = $5, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $6 AND company_id IN (
        SELECT id FROM companies WHERE user_id = $7
      )
    `;

    try {
      const technologiesJson = JSON.stringify(technologies);
      logger.db('UPDATE', 'communities', { communityId, userId, name, ilec, clec, servingCompanyName });
      const result = await db.prepare(query).run(
        name, 
        ilec, 
        clec, 
        servingCompanyName || null,
        technologiesJson,
        communityId, 
        userId
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating community', error);
      throw error;
    }
  }

  /**
   * Delete community
   */
  async delete(communityId, userId) {
    const db = getDatabaseWrapper();
    // Delete only if community belongs to user (via company)
    const query = `
      DELETE FROM communities 
      WHERE id = $1 AND company_id IN (
        SELECT id FROM companies WHERE user_id = $2
      )
    `;

    try {
      logger.db('DELETE', 'communities', { communityId, userId });
      const result = await db.prepare(query).run(communityId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting community', error);
      throw error;
    }
  }
}

module.exports = new CommunityRepository();

