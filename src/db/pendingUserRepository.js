/**
 * Pending User Repository
 * Data access layer for pending user operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class PendingUserRepository {
  /**
   * Create a pending user
   */
  async create(username, email, hashedPassword) {
    const db = getDatabaseWrapper();

    try {
      logger.db('INSERT', 'pending_users', { username, email });

      const result = await db.prepare(`
        INSERT INTO pending_users (username, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, username, email, created_at, status
      `).get(username, email, hashedPassword);

      return result;
    } catch (error) {
      // Preserve the error code for duplicate key detection
      logger.error('Error creating pending user', {
        code: error.code,
        constraint: error.constraint,
        message: error.message,
        username,
        email
      });
      throw error; // Re-throw to let the route handler deal with it
    }
  }

  /**
   * Find pending user by username or email
   */
  async findByUsernameOrEmail(username, email) {
    const db = getDatabaseWrapper();

    try {
      logger.db('SELECT', 'pending_users', { username, email });

      const result = await db.prepare(`
        SELECT * FROM pending_users
        WHERE username = $1 OR email = $2
        LIMIT 1
      `).get(username, email);

      return result;
    } catch (error) {
      logger.error('Error finding pending user', error);
      throw error;
    }
  }

  /**
   * Get all pending users
   */
  async findAll(status = 'pending') {
    const db = getDatabaseWrapper();

    try {
      logger.db('SELECT', 'pending_users', { status });

      const results = await db.prepare(`
        SELECT 
          pu.*,
          u.username as reviewed_by_username
        FROM pending_users pu
        LEFT JOIN users u ON pu.reviewed_by = u.id
        WHERE pu.status = $1
        ORDER BY pu.created_at DESC
      `).all(status);

      return results;
    } catch (error) {
      logger.error('Error fetching pending users', error);
      throw error;
    }
  }

  /**
   * Get pending user by ID
   */
  async findById(id) {
    const db = getDatabaseWrapper();

    try {
      logger.db('SELECT', 'pending_users', { id });

      const result = await db.prepare(`
        SELECT 
          pu.*,
          u.username as reviewed_by_username
        FROM pending_users pu
        LEFT JOIN users u ON pu.reviewed_by = u.id
        WHERE pu.id = $1
      `).get(id);

      return result;
    } catch (error) {
      logger.error('Error finding pending user by ID', error);
      throw error;
    }
  }

  /**
   * Approve pending user - moves user to users table
   */
  async approve(pendingUserId, reviewedBy, reviewNotes = null) {
    const db = getDatabaseWrapper();

    try {
      logger.db('UPDATE', 'pending_users', { pendingUserId, reviewedBy });

      // Get pending user
      const pendingUser = await this.findById(pendingUserId);
      if (!pendingUser) {
        throw new Error('Pending user not found');
      }

      if (pendingUser.status !== 'pending') {
        throw new Error('User has already been reviewed');
      }

      // Note: We don't actually move the user here - that's done in the route handler
      // This just marks them as approved
      const result = await db.prepare(`
        UPDATE pending_users
        SET status = 'approved',
            reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by = $1,
            review_notes = $2
        WHERE id = $3
        RETURNING *
      `).get(reviewedBy, reviewNotes, pendingUserId);

      return result;
    } catch (error) {
      logger.error('Error approving pending user', error);
      throw error;
    }
  }

  /**
   * Reject pending user
   */
  async reject(pendingUserId, reviewedBy, reviewNotes = null) {
    const db = getDatabaseWrapper();

    try {
      logger.db('UPDATE', 'pending_users', { pendingUserId, reviewedBy });

      const result = await db.prepare(`
        UPDATE pending_users
        SET status = 'rejected',
            reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by = $1,
            review_notes = $2
        WHERE id = $3
        RETURNING *
      `).get(reviewedBy, reviewNotes, pendingUserId);

      return result;
    } catch (error) {
      logger.error('Error rejecting pending user', error);
      throw error;
    }
  }

  /**
   * Reset a rejected user back to pending status (for re-registration)
   */
  async resetToPending(id, newHashedPassword) {
    const db = getDatabaseWrapper();

    try {
      logger.db('UPDATE', 'pending_users', { id, action: 'reset_to_pending' });

      const result = await db.prepare(`
        UPDATE pending_users
        SET status = 'pending',
            password = $1,
            reviewed_at = NULL,
            reviewed_by = NULL,
            review_notes = NULL,
            created_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, username, email, created_at, status
      `).get(newHashedPassword, id);

      return result;
    } catch (error) {
      logger.error('Error resetting pending user to pending', error);
      throw error;
    }
  }

  /**
   * Delete pending user (after approval/rejection cleanup)
   */
  async delete(id) {
    const db = getDatabaseWrapper();

    try {
      logger.db('DELETE', 'pending_users', { id });

      const result = await db.prepare(`
        DELETE FROM pending_users
        WHERE id = $1
      `).run(id);

      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting pending user', error);
      throw error;
    }
  }
}

module.exports = new PendingUserRepository();

