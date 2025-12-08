/**
 * Template Model
 * Handles database operations for templates
 */

const { getDatabaseWrapper } = require('../db');
const logger = require('../utils/logger');

class Template {
  /**
   * Get all active templates
   */
  static async getAll(includeInactive = false) {
    const db = getDatabaseWrapper();
    const query = includeInactive
      ? 'SELECT * FROM templates ORDER BY category, subcategory, name'
      : 'SELECT * FROM templates WHERE is_active = TRUE ORDER BY category, subcategory, name';

    const templates = await db.prepare(query).all();

    // Parse JSON inputs field
    return templates.map(template => ({
      ...template,
      inputs: typeof template.inputs === 'string' ? JSON.parse(template.inputs) : template.inputs,
      is_premium: !!template.is_premium,
      is_active: !!template.is_active
    }));
  }

  /**
   * Get templates by category
   */
  static async getByCategory(category) {
    const db = getDatabaseWrapper();
    const templates = await db.prepare(
      'SELECT * FROM templates WHERE category = $1 AND is_active = TRUE ORDER BY subcategory, name'
    ).all(category);

    return templates.map(template => ({
      ...template,
      inputs: typeof template.inputs === 'string' ? JSON.parse(template.inputs) : template.inputs,
      is_premium: !!template.is_premium,
      is_active: !!template.is_active
    }));
  }

  /**
   * Get templates by subcategory
   */
  static async getBySubcategory(subcategory) {
    const db = getDatabaseWrapper();
    const templates = await db.prepare(
      'SELECT * FROM templates WHERE subcategory = $1 AND is_active = TRUE ORDER BY name'
    ).all(subcategory);

    return templates.map(template => ({
      ...template,
      inputs: typeof template.inputs === 'string' ? JSON.parse(template.inputs) : template.inputs,
      is_premium: !!template.is_premium,
      is_active: !!template.is_active
    }));
  }

  /**
   * Get template by ID
   */
  static async getById(id) {
    const db = getDatabaseWrapper();
    const template = await db.prepare('SELECT * FROM templates WHERE id = $1').get(id);

    if (!template) return null;

    return {
      ...template,
      inputs: typeof template.inputs === 'string' ? JSON.parse(template.inputs) : template.inputs,
      is_premium: !!template.is_premium,
      is_active: !!template.is_active
    };
  }

  /**
   * Search templates by name or description
   */
  static async search(searchTerm) {
    const db = getDatabaseWrapper();
    const searchPattern = `%${searchTerm}%`;
    const templates = await db.prepare(
      `SELECT * FROM templates
       WHERE (name ILIKE $1 OR description ILIKE $2) AND is_active = TRUE
       ORDER BY category, subcategory, name`
    ).all(searchPattern, searchPattern);

    return templates.map(template => ({
      ...template,
      inputs: typeof template.inputs === 'string' ? JSON.parse(template.inputs) : template.inputs,
      is_premium: !!template.is_premium,
      is_active: !!template.is_active
    }));
  }

  /**
   * Create a new template
   */
  static async create(templateData) {
    const db = getDatabaseWrapper();
    const { name, category, subcategory, description, prompt_template, inputs, is_premium = false } = templateData;

    const result = await db.prepare(
      `INSERT INTO templates (name, category, subcategory, description, prompt_template, inputs, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`
    ).run(name, category, subcategory, description, prompt_template, JSON.stringify(inputs), is_premium);

    logger.info(`Template created: ${name}`, { id: result.lastInsertRowid });
    return result.lastInsertRowid;
  }

  /**
   * Update a template
   */
  static async update(id, templateData) {
    const db = getDatabaseWrapper();
    const { name, category, subcategory, description, prompt_template, inputs, is_premium, is_active } = templateData;

    const result = await db.prepare(
      `UPDATE templates
       SET name = $1, category = $2, subcategory = $3, description = $4,
           prompt_template = $5, inputs = $6, is_premium = $7, is_active = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`
    ).run(
      name, category, subcategory, description, prompt_template,
      JSON.stringify(inputs), is_premium, is_active, id
    );

    logger.info(`Template updated: ${id}`);
    return result.changes > 0;
  }

  /**
   * Delete a template (soft delete by setting is_active = false)
   */
  static async softDelete(id) {
    const db = getDatabaseWrapper();
    const result = await db.prepare('UPDATE templates SET is_active = FALSE WHERE id = $1').run(id);
    logger.info(`Template soft deleted: ${id}`);
    return result.changes > 0;
  }

  /**
   * Permanently delete a template
   */
  static async hardDelete(id) {
    const db = getDatabaseWrapper();
    const result = await db.prepare('DELETE FROM templates WHERE id = $1').run(id);
    logger.info(`Template permanently deleted: ${id}`);
    return result.changes > 0;
  }

  /**
   * Get all categories
   */
  static async getCategories() {
    const db = getDatabaseWrapper();
    const categories = await db.prepare(
      'SELECT DISTINCT category FROM templates WHERE is_active = TRUE ORDER BY category'
    ).all();
    return categories.map(row => row.category);
  }

  /**
   * Get subcategories by category
   */
  static async getSubcategories(category) {
    const db = getDatabaseWrapper();
    const subcategories = await db.prepare(
      'SELECT DISTINCT subcategory FROM templates WHERE category = $1 AND is_active = TRUE ORDER BY subcategory'
    ).all(category);
    return subcategories.map(row => row.subcategory);
  }

  /**
   * Get template structure grouped by category and subcategory
   */
  static async getStructured() {
    const templates = await this.getAll();
    const structured = {};

    templates.forEach(template => {
      if (!structured[template.category]) {
        structured[template.category] = {};
      }
      if (!structured[template.category][template.subcategory]) {
        structured[template.category][template.subcategory] = [];
      }
      structured[template.category][template.subcategory].push(template);
    });

    return structured;
  }

  /**
   * Save a template for a user
   */
  static async saveForUser(userId, templateId) {
    const db = getDatabaseWrapper();
    try {
      await db.prepare(
        'INSERT INTO user_saved_templates (user_id, template_id) VALUES ($1, $2)'
      ).run(userId, templateId);
      logger.info(`Template ${templateId} saved for user ${userId}`);
      return true;
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        // Already saved
        return false;
      }
      throw error;
    }
  }

  /**
   * Unsave a template for a user
   */
  static async unsaveForUser(userId, templateId) {
    const db = getDatabaseWrapper();
    const result = await db.prepare(
      'DELETE FROM user_saved_templates WHERE user_id = $1 AND template_id = $2'
    ).run(userId, templateId);
    logger.info(`Template ${templateId} unsaved for user ${userId}`);
    return result.changes > 0;
  }

  /**
   * Get user's saved templates
   */
  static async getUserSaved(userId) {
    const db = getDatabaseWrapper();
    const templates = await db.prepare(
      `SELECT t.*, ust.saved_at
       FROM templates t
       INNER JOIN user_saved_templates ust ON t.id = ust.template_id
       WHERE ust.user_id = $1 AND t.is_active = TRUE
       ORDER BY ust.saved_at DESC`
    ).all(userId);

    return templates.map(template => ({
      ...template,
      inputs: typeof template.inputs === 'string' ? JSON.parse(template.inputs) : template.inputs,
      is_premium: !!template.is_premium,
      is_active: !!template.is_active
    }));
  }

  /**
   * Check if a template is saved by user
   */
  static async isSavedByUser(userId, templateId) {
    const db = getDatabaseWrapper();
    const result = await db.prepare(
      'SELECT COUNT(*) as count FROM user_saved_templates WHERE user_id = $1 AND template_id = $2'
    ).get(userId, templateId);
    return parseInt(result.count, 10) > 0;
  }
}

module.exports = Template;
