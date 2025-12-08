/**
 * Service Package Repository
 * Data access layer for service package operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class ServicePackageRepository {
  /**
   * Find all service packages for a user
   */
  async findByUserId(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT * FROM service_packages WHERE user_id = $1 ORDER BY created_at DESC';

    try {
      logger.db('SELECT', 'service_packages', { userId });
      return await db.prepare(query).all(userId);
    } catch (error) {
      logger.error('Error finding service packages by user ID', error);
      throw error;
    }
  }

  /**
   * Find service package by ID (must belong to user)
   */
  async findById(servicePackageId, userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT * FROM service_packages WHERE id = $1 AND user_id = $2';

    try {
      logger.db('SELECT', 'service_packages', { servicePackageId, userId });
      return await db.prepare(query).get(servicePackageId, userId);
    } catch (error) {
      logger.error('Error finding service package by ID', error);
      throw error;
    }
  }

  /**
   * Check if a package with the same name and technology type already exists for the user
   */
  async findByNameAndTechnology(userId, name, technologyType, excludeId = null) {
    const db = getDatabaseWrapper();
    let query, params;
    
    if (excludeId) {
      query = `
        SELECT * FROM service_packages 
        WHERE user_id = $1 AND name = $2 AND (technology_type = $3 OR (technology_type IS NULL AND $3 IS NULL))
        AND id != $4
      `;
      params = [userId, name.trim(), technologyType || null, excludeId];
    } else {
      query = `
        SELECT * FROM service_packages 
        WHERE user_id = $1 AND name = $2 AND (technology_type = $3 OR (technology_type IS NULL AND $3 IS NULL))
      `;
      params = [userId, name.trim(), technologyType || null];
    }

    try {
      logger.db('SELECT', 'service_packages', { userId, name, technologyType, excludeId });
      return await db.prepare(query).get(...params);
    } catch (error) {
      logger.error('Error checking for duplicate package', error);
      throw error;
    }
  }

  /**
   * Create a new service package
   */
  async create(userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed) {
    const db = getDatabaseWrapper();
    
    // Check for duplicate name with same technology type
    const existing = await this.findByNameAndTechnology(userId, name, technologyType);
    if (existing) {
      const error = new Error(`A package named "${name}" with technology type "${technologyType || 'none'}" already exists`);
      error.code = 'DUPLICATE_PACKAGE';
      throw error;
    }

    const query = `
      INSERT INTO service_packages (user_id, name, technology_type, license_type, download_speed, upload_speed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    try {
      logger.db('INSERT', 'service_packages', { userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed });
      const result = await db.prepare(query).get(
        userId,
        name.trim(),
        technologyType && technologyType.trim() ? technologyType.trim() : null,
        licenseType && licenseType.trim() ? licenseType.trim() : null,
        downloadSpeed ? downloadSpeed.trim() : null,
        uploadSpeed ? uploadSpeed.trim() : null
      );

      return await this.findById(result.id, userId);
    } catch (error) {
      logger.error('Error creating service package', error);
      throw error;
    }
  }

  /**
   * Update a service package
   */
  async update(servicePackageId, userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed) {
    const db = getDatabaseWrapper();
    
    // Check for duplicate name with same technology type (excluding current package)
    const existing = await this.findByNameAndTechnology(userId, name, technologyType, servicePackageId);
    if (existing) {
      const error = new Error(`A package named "${name}" with technology type "${technologyType || 'none'}" already exists`);
      error.code = 'DUPLICATE_PACKAGE';
      throw error;
    }

    const query = `
      UPDATE service_packages 
      SET name = $1, technology_type = $2, license_type = $3, download_speed = $4, upload_speed = $5, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $6 AND user_id = $7
    `;

    try {
      logger.db('UPDATE', 'service_packages', { servicePackageId, userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed });
      const result = await db.prepare(query).run(
        name.trim(),
        technologyType && technologyType.trim() ? technologyType.trim() : null,
        licenseType && licenseType.trim() ? licenseType.trim() : null,
        downloadSpeed ? downloadSpeed.trim() : null,
        uploadSpeed ? uploadSpeed.trim() : null,
        servicePackageId,
        userId
      );

      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating service package', error);
      throw error;
    }
  }

  /**
   * Check if a service package is used in any communities
   * Returns array of communities using this package
   */
  async findCommunitiesUsingPackage(userId, packageName, packageDownloadSpeed, packageUploadSpeed) {
    const db = getDatabaseWrapper();
    
    // Get all communities for this user via their companies
    const query = `
      SELECT c.id, c.name, c.technologies, co.name as company_name
      FROM communities c
      INNER JOIN companies co ON c.company_id = co.id
      WHERE co.user_id = $1
    `;

    try {
      logger.db('SELECT', 'communities', { userId, packageName });
      const communities = await db.prepare(query).all(userId);
      const usingCommunities = [];

      communities.forEach(community => {
        if (!community.technologies) return;
        
        let technologies;
        try {
          technologies = typeof community.technologies === 'string' 
            ? JSON.parse(community.technologies) 
            : community.technologies;
        } catch (e) {
          return;
        }

        if (!Array.isArray(technologies)) return;

        // Check each technology's packages for a match
        technologies.forEach(tech => {
          if (!tech.packages || !Array.isArray(tech.packages)) return;
          
          tech.packages.forEach(pkg => {
            // Match by name, download speed, and upload speed
            if (pkg.name === packageName &&
                pkg.downloadSpeed === packageDownloadSpeed &&
                pkg.uploadSpeed === packageUploadSpeed) {
              usingCommunities.push({
                id: community.id,
                name: community.name,
                companyName: community.company_name,
                technologyType: tech.type
              });
            }
          });
        });
      });

      return usingCommunities;
    } catch (error) {
      logger.error('Error finding communities using package', error);
      throw error;
    }
  }

  /**
   * Delete a service package
   */
  async delete(servicePackageId, userId) {
    const db = getDatabaseWrapper();
    const query = 'DELETE FROM service_packages WHERE id = $1 AND user_id = $2';

    try {
      logger.db('DELETE', 'service_packages', { servicePackageId, userId });
      const result = await db.prepare(query).run(servicePackageId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting service package', error);
      throw error;
    }
  }
}

module.exports = new ServicePackageRepository();
