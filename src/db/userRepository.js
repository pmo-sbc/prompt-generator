/**
 * User Repository
 * Data access layer for user operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class UserRepository {
  /**
   * Find user by username or email
   */
  async findByUsernameOrEmail(username, email = null) {
    const db = getDatabaseWrapper();
    let query, params;
    
    if (email) {
      query = 'SELECT * FROM users WHERE username = $1 OR email = $2';
      params = [username, email];
    } else {
      query = 'SELECT * FROM users WHERE username = $1 OR email = $1';
      params = [username];
    }

    try {
      logger.db('SELECT', 'users', { username, email });
      return await db.prepare(query).get(...params);
    } catch (error) {
      logger.error('Error finding user', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT id, username, email, email_verified, is_admin, is_manager, tokens, created_at FROM users WHERE id = $1';

    try {
      logger.db('SELECT', 'users', { userId });
      return await db.prepare(query).get(userId);
    } catch (error) {
      logger.error('Error finding user by ID', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async create(username, email, hashedPassword) {
    const db = getDatabaseWrapper();
    const query = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id';

    try {
      logger.db('INSERT', 'users', { username, email });
      const result = await db.prepare(query).get(username, email, hashedPassword);
      return {
        id: result.id,
        username,
        email
      };
    } catch (error) {
      // Check if it's a duplicate key error (sequence out of sync)
      if (error.code === '23505' && error.constraint === 'users_pkey') {
        logger.warn('Users sequence out of sync, attempting to fix and retry', {
          username,
          error: error.message
        });

        try {
          // Reset the sequence to MAX(id) + 1
          const maxIdResult = await db.prepare('SELECT MAX(id) as max_id FROM users').get();
          const maxId = maxIdResult ? (maxIdResult.max_id || 0) : 0;
          const nextId = maxId + 1;

          // Reset sequence (false = don't mark as called, so next value will be exactly this)
          await db.prepare(`SELECT setval('users_id_seq', $1, false)`).get(nextId);

          logger.info('Users sequence reset', { nextId });

          // Retry the insert
          const retryResult = await db.prepare(query).get(username, email, hashedPassword);
          return {
            id: retryResult.id,
            username,
            email
          };
        } catch (retryError) {
          logger.error('Error retrying user creation after sequence reset', retryError);
          throw retryError;
        }
      }

      logger.error('Error creating user', error);
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username) {
    const db = getDatabaseWrapper();
    const query = 'SELECT id FROM users WHERE username = $1';

    try {
      const result = await db.prepare(query).get(username);
      return !!result;
    } catch (error) {
      logger.error('Error checking username existence', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email) {
    const db = getDatabaseWrapper();
    const query = 'SELECT id FROM users WHERE email = $1';

    try {
      const result = await db.prepare(query).get(email);
      return !!result;
    } catch (error) {
      logger.error('Error checking email existence', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId, hashedPassword) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE users SET password = $1 WHERE id = $2';

    try {
      logger.db('UPDATE', 'users', { userId });
      const result = await db.prepare(query).run(hashedPassword, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating password', error);
      throw error;
    }
  }

  /**
   * Update user email
   */
  async updateEmail(userId, email) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE users SET email = $1, email_verified = FALSE WHERE id = $2';

    try {
      logger.db('UPDATE', 'users', { userId, email, action: 'update_email' });
      const result = await db.prepare(query).run(email, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating email', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete(userId) {
    const db = getDatabaseWrapper();
    const query = 'DELETE FROM users WHERE id = $1';

    try {
      logger.db('DELETE', 'users', { userId });
      const result = await db.prepare(query).run(userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting user', error);
      throw error;
    }
  }

  /**
   * Set email verification token
   */
  async setVerificationToken(userId, token, expiresAt) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3';

    try {
      logger.db('UPDATE', 'users', { userId, action: 'set_verification_token' });
      const result = await db.prepare(query).run(token, expiresAt, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error setting verification token', error);
      throw error;
    }
  }

  /**
   * Find user by verification token
   */
  async findByVerificationToken(token) {
    const db = getDatabaseWrapper();
    // First check if token exists (without expiration check) for better error logging
    const checkQuery = `
      SELECT id, verification_token, verification_token_expires, email_verified
      FROM users
      WHERE verification_token = $1
    `;
    
    // Then check with expiration
    const query = `
      SELECT * FROM users
      WHERE verification_token = $1
      AND verification_token_expires IS NOT NULL
      AND verification_token_expires > NOW()
    `;

    try {
      logger.db('SELECT', 'users', { action: 'find_by_verification_token' });
      
      // First check if token exists at all
      const tokenCheck = await db.prepare(checkQuery).get(token);
      
      if (!tokenCheck) {
        logger.warn('Verification token not found in database', { token: token.substring(0, 8) + '...' });
        return null;
      }
      
      // Check if already verified
      if (tokenCheck.email_verified) {
        logger.warn('Verification token for already verified user', { 
          userId: tokenCheck.id,
          token: token.substring(0, 8) + '...'
        });
        return null;
      }
      
      // Check expiration
      if (!tokenCheck.verification_token_expires) {
        logger.warn('Verification token has no expiration date', { 
          userId: tokenCheck.id,
          token: token.substring(0, 8) + '...'
        });
        return null;
      }
      
      const expiresAt = new Date(tokenCheck.verification_token_expires);
      const now = new Date();
      
      if (expiresAt <= now) {
        logger.warn('Verification token has expired', { 
          userId: tokenCheck.id,
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString(),
          token: token.substring(0, 8) + '...'
        });
        return null;
      }
      
      // Token is valid - return full user object
      const user = await db.prepare(query).get(token);
      return user;
    } catch (error) {
      logger.error('Error finding user by verification token', error);
      throw error;
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId) {
    const db = getDatabaseWrapper();
    const query = `
      UPDATE users
      SET email_verified = TRUE,
          verification_token = NULL,
          verification_token_expires = NULL
      WHERE id = $1
    `;

    try {
      logger.db('UPDATE', 'users', { userId, action: 'verify_email' });
      const result = await db.prepare(query).run(userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error verifying email', error);
      throw error;
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT email_verified FROM users WHERE id = $1';

    try {
      const result = await db.prepare(query).get(userId);
      return result ? !!result.email_verified : false;
    } catch (error) {
      logger.error('Error checking email verification', error);
      throw error;
    }
  }

  /**
   * Get user's token balance
   */
  async getTokens(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT tokens FROM users WHERE id = $1';

    try {
      const result = await db.prepare(query).get(userId);
      return result ? result.tokens : 0;
    } catch (error) {
      logger.error('Error getting user tokens', error);
      throw error;
    }
  }

  /**
   * Deduct tokens from user
   */
  async deductTokens(userId, amount) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE users SET tokens = tokens - $1 WHERE id = $2 AND tokens >= $1';

    try {
      logger.db('UPDATE', 'users', { userId, amount, action: 'deduct_tokens' });
      const result = await db.prepare(query).run(amount, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deducting tokens', error);
      throw error;
    }
  }

  /**
   * Add tokens to user
   */
  async addTokens(userId, amount) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE users SET tokens = tokens + $1 WHERE id = $2';

    try {
      logger.db('UPDATE', 'users', { userId, amount, action: 'add_tokens' });
      const result = await db.prepare(query).run(amount, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error adding tokens', error);
      throw error;
    }
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(userId, token, expiresAt) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE users SET password_reset_token = $1, password_reset_token_expires = $2 WHERE id = $3';

    try {
      logger.db('UPDATE', 'users', { userId, action: 'set_password_reset_token' });
      const result = await db.prepare(query).run(token, expiresAt, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error setting password reset token', error);
      throw error;
    }
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT * FROM users
      WHERE password_reset_token = $1
      AND password_reset_token_expires > NOW()
    `;

    try {
      logger.db('SELECT', 'users', { action: 'find_by_password_reset_token' });
      return await db.prepare(query).get(token);
    } catch (error) {
      logger.error('Error finding user by password reset token', error);
      throw error;
    }
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(userId) {
    const db = getDatabaseWrapper();
    const query = `
      UPDATE users
      SET password_reset_token = NULL,
          password_reset_token_expires = NULL
      WHERE id = $1
    `;

    try {
      logger.db('UPDATE', 'users', { userId, action: 'clear_password_reset_token' });
      const result = await db.prepare(query).run(userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error clearing password reset token', error);
      throw error;
    }
  }

  /**
   * Find user by email (for password reset)
   */
  async findByEmail(email) {
    const db = getDatabaseWrapper();
    const query = 'SELECT * FROM users WHERE email = $1';

    try {
      logger.db('SELECT', 'users', { email, action: 'find_by_email' });
      return await db.prepare(query).get(email);
    } catch (error) {
      logger.error('Error finding user by email', error);
      throw error;
    }
  }

  /**
   * Update customer information
   */
  async updateCustomerInfo(userId, customerData) {
    const db = getDatabaseWrapper();
    const query = `
      UPDATE users 
      SET first_name = $1,
          last_name = $2,
          phone = $3,
          address = $4,
          city = $5,
          state = $6,
          zip_code = $7,
          country = $8
      WHERE id = $9
    `;

    try {
      logger.db('UPDATE', 'users', { userId, action: 'update_customer_info' });
      const result = await db.prepare(query).run(
        customerData.firstName || null,
        customerData.lastName || null,
        customerData.phone || null,
        customerData.address || null,
        customerData.city || null,
        customerData.state || null,
        customerData.zipCode || null,
        customerData.country || null,
        userId
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating customer info', error);
      throw error;
    }
  }

  /**
   * Get customer information
   */
  async getCustomerInfo(userId) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT first_name, last_name, phone, address, city, state, zip_code, country, email
      FROM users 
      WHERE id = $1
    `;

    try {
      logger.db('SELECT', 'users', { userId, action: 'get_customer_info' });
      const result = await db.prepare(query).get(userId);
      if (!result) return null;
      
      return {
        firstName: result.first_name || null,
        lastName: result.last_name || null,
        phone: result.phone || null,
        address: result.address || null,
        city: result.city || null,
        state: result.state || null,
        zipCode: result.zip_code || null,
        country: result.country || null,
        email: result.email || null
      };
    } catch (error) {
      logger.error('Error getting customer info', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();
