/**
 * Prompt Repository
 * Data access layer for prompt operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class PromptRepository {
  /**
   * Save a new prompt
   */
  async create(userId, templateName, category, promptText, inputs = {}, projectId = null) {
    const db = getDatabaseWrapper();
    const query = `
      INSERT INTO saved_prompts (user_id, template_name, category, prompt_text, inputs, project_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    try {
      logger.db('INSERT', 'saved_prompts', { userId, templateName, projectId });
      const result = await db.prepare(query).get(
        userId,
        templateName,
        category,
        promptText,
        JSON.stringify(inputs),
        projectId
      );

      return {
        id: result.id,
        userId,
        templateName,
        category,
        promptText,
        inputs,
        projectId
      };
    } catch (error) {
      // Check if it's a duplicate key error (sequence out of sync)
      if (error.code === '23505' && error.constraint === 'saved_prompts_pkey') {
        logger.warn('Sequence out of sync for saved_prompts, attempting to fix...', {
          userId,
          error: error.message
        });
        
        try {
          // Fix the sequence by setting it to max(id) + 1
          const fixQuery = `
            SELECT setval('saved_prompts_id_seq', 
              COALESCE((SELECT MAX(id) FROM saved_prompts), 0) + 1, 
              true)
          `;
          await db.prepare(fixQuery).get();
          
          logger.info('Sequence fixed, retrying insert...');
          
          // Retry the insert
          const retryResult = await db.prepare(query).get(
            userId,
            templateName,
            category,
            promptText,
            JSON.stringify(inputs),
            projectId
          );
          
          return {
            id: retryResult.id,
            userId,
            templateName,
            category,
            promptText,
            inputs,
            projectId
          };
        } catch (retryError) {
          logger.error('Error after sequence fix attempt', retryError);
          throw retryError;
        }
      }
      
      logger.error('Error saving prompt', error);
      throw error;
    }
  }

  /**
   * Get all prompts for a user
   */
  async findByUserId(userId, limit = 100, offset = 0) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT * FROM saved_prompts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      logger.db('SELECT', 'saved_prompts', { userId, limit, offset });
      const prompts = await db.prepare(query).all(userId, limit, offset);

      // Parse JSON inputs (PostgreSQL JSONB returns as object, but handle both)
      return prompts.map(prompt => ({
        ...prompt,
        inputs: typeof prompt.inputs === 'string' ? JSON.parse(prompt.inputs) : prompt.inputs
      }));
    } catch (error) {
      logger.error('Error retrieving prompts', error);
      throw error;
    }
  }

  /**
   * Get a specific prompt by ID
   */
  async findById(promptId, userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT * FROM saved_prompts WHERE id = $1 AND user_id = $2';

    try {
      logger.db('SELECT', 'saved_prompts', { promptId, userId });
      const prompt = await db.prepare(query).get(promptId, userId);

      if (prompt) {
        prompt.inputs = typeof prompt.inputs === 'string' ? JSON.parse(prompt.inputs) : prompt.inputs;
      }

      return prompt;
    } catch (error) {
      logger.error('Error finding prompt', error);
      throw error;
    }
  }

  /**
   * Update prompt's project assignment
   */
  async updateProject(promptId, userId, projectId) {
    const db = getDatabaseWrapper();
    const query = 'UPDATE saved_prompts SET project_id = $1 WHERE id = $2 AND user_id = $3';

    try {
      logger.db('UPDATE', 'saved_prompts', { promptId, userId, projectId });
      const result = await db.prepare(query).run(projectId, promptId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating prompt project', error);
      throw error;
    }
  }

  /**
   * Delete a prompt
   */
  async delete(promptId, userId) {
    const db = getDatabaseWrapper();
    const query = 'DELETE FROM saved_prompts WHERE id = $1 AND user_id = $2';

    try {
      logger.db('DELETE', 'saved_prompts', { promptId, userId });
      const result = await db.prepare(query).run(promptId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting prompt', error);
      throw error;
    }
  }

  /**
   * Get count of saved prompts for a user
   */
  async countByUserId(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT COUNT(*) as count FROM saved_prompts WHERE user_id = $1';

    try {
      const result = await db.prepare(query).get(userId);
      return parseInt(result.count, 10);
    } catch (error) {
      logger.error('Error counting prompts', error);
      throw error;
    }
  }

  /**
   * Search prompts by template name or category
   */
  async search(userId, searchTerm) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT * FROM saved_prompts
      WHERE user_id = $1
      AND (template_name ILIKE $2 OR category ILIKE $2 OR prompt_text ILIKE $2)
      ORDER BY created_at DESC
    `;

    try {
      const term = `%${searchTerm}%`;
      logger.db('SELECT', 'saved_prompts', { userId, searchTerm });
      const prompts = await db.prepare(query).all(userId, term);

      return prompts.map(prompt => ({
        ...prompt,
        inputs: typeof prompt.inputs === 'string' ? JSON.parse(prompt.inputs) : prompt.inputs
      }));
    } catch (error) {
      logger.error('Error searching prompts', error);
      throw error;
    }
  }

  /**
   * Get prompts by project ID
   */
  async findByProjectId(userId, projectId, limit = 100, offset = 0) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT * FROM saved_prompts
      WHERE user_id = $1 AND project_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    try {
      logger.db('SELECT', 'saved_prompts', { userId, projectId, limit, offset });
      const prompts = await db.prepare(query).all(userId, projectId, limit, offset);

      return prompts.map(prompt => ({
        ...prompt,
        inputs: typeof prompt.inputs === 'string' ? JSON.parse(prompt.inputs) : prompt.inputs
      }));
    } catch (error) {
      logger.error('Error retrieving prompts by project', error);
      throw error;
    }
  }

  /**
   * Bulk update project assignment for multiple prompts
   */
  async bulkUpdateProject(userId, promptIds, projectId) {
    const db = getDatabaseWrapper();

    try {
      logger.db('UPDATE', 'saved_prompts', { userId, count: promptIds.length, projectId });
      
      if (promptIds.length === 0) return 0;
      
      const placeholders = promptIds.map((_, i) => `$${i + 2}`).join(',');
      const query = `
        UPDATE saved_prompts
        SET project_id = $1
        WHERE user_id = $2 AND id IN (${placeholders})
      `;

      const result = await db.prepare(query).run(projectId, userId, ...promptIds);
      return result.changes;
    } catch (error) {
      logger.error('Error bulk updating prompt projects', error);
      throw error;
    }
  }

  /**
   * Bulk delete multiple prompts
   */
  async bulkDelete(userId, promptIds) {
    const db = getDatabaseWrapper();

    try {
      logger.db('DELETE', 'saved_prompts', { userId, count: promptIds.length });
      
      if (promptIds.length === 0) return 0;
      
      const placeholders = promptIds.map((_, i) => `$${i + 2}`).join(',');
      const query = `
        DELETE FROM saved_prompts
        WHERE user_id = $1 AND id IN (${placeholders})
      `;

      const result = await db.prepare(query).run(userId, ...promptIds);
      return result.changes;
    } catch (error) {
      logger.error('Error bulk deleting prompts', error);
      throw error;
    }
  }
}

module.exports = new PromptRepository();
