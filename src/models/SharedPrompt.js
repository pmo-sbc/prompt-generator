/**
 * SharedPrompt Model
 * Handles database operations for shared prompts
 */

const { getDatabaseWrapper } = require('../db');
const crypto = require('crypto');
const logger = require('../utils/logger');

class SharedPrompt {
  /**
   * Create a shared prompt with a unique token
   */
  static async create(userId, templateName, category, promptText, expiresInDays = null) {
    const db = getDatabaseWrapper();
    const shareToken = crypto.randomBytes(16).toString('hex');

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await db.prepare(
      `INSERT INTO shared_prompts (share_token, user_id, template_name, category, prompt_text, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`
    ).run(shareToken, userId, templateName, category, promptText, expiresAt);

    logger.info(`Shared prompt created: ${shareToken}`, { userId, templateName });
    return shareToken;
  }

  /**
   * Get shared prompt by token
   */
  static async getByToken(shareToken) {
    const db = getDatabaseWrapper();
    const prompt = await db.prepare(
      'SELECT * FROM shared_prompts WHERE share_token = $1'
    ).get(shareToken);

    if (!prompt) return null;

    // Check if expired
    if (prompt.expires_at && new Date(prompt.expires_at) < new Date()) {
      return null;
    }

    // Increment view count
    await db.prepare(
      'UPDATE shared_prompts SET views = views + 1 WHERE share_token = $1'
    ).run(shareToken);

    return prompt;
  }

  /**
   * Get all shared prompts by user
   */
  static async getByUser(userId) {
    const db = getDatabaseWrapper();
    return await db.prepare(
      `SELECT * FROM shared_prompts
       WHERE user_id = $1
       ORDER BY created_at DESC`
    ).all(userId);
  }

  /**
   * Delete a shared prompt
   */
  static async delete(shareToken, userId) {
    const db = getDatabaseWrapper();
    const result = await db.prepare(
      'DELETE FROM shared_prompts WHERE share_token = $1 AND user_id = $2'
    ).run(shareToken, userId);

    logger.info(`Shared prompt deleted: ${shareToken}`);
    return result.changes > 0;
  }

  /**
   * Delete expired shared prompts (cleanup)
   */
  static async deleteExpired() {
    const db = getDatabaseWrapper();
    const result = await db.prepare(
      'DELETE FROM shared_prompts WHERE expires_at < CURRENT_TIMESTAMP'
    ).run();

    logger.info(`Deleted ${result.changes} expired shared prompts`);
    return result.changes;
  }
}

module.exports = SharedPrompt;
