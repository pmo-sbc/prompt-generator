/**
 * Project Repository
 * Data access layer for project operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

/**
 * Create a new project
 */
function create(userId, name, description = null, color = '#3498db') {
  const db = getDatabaseWrapper();

  try {
    logger.db('INSERT', 'projects', { userId, name });

    const result = db.prepare(`
      INSERT INTO projects (user_id, name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(userId, name, description, color);

    return result.lastInsertRowid;
  } catch (error) {
    logger.error('Error creating project', error);
    throw error;
  }
}

/**
 * Get all projects for a user
 */
async function getAllByUserId(userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('SELECT', 'projects', { userId });

    const projects = await db.prepare(`
      SELECT
        p.*,
        COUNT(sp.id) as prompt_count
      FROM projects p
      LEFT JOIN saved_prompts sp ON sp.project_id = p.id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `).all(userId);

    return projects;
  } catch (error) {
    logger.error('Error fetching projects', error);
    throw error;
  }
}

/**
 * Get a project by ID
 */
function getById(projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('SELECT', 'projects', { projectId, userId });

    const project = db.prepare(`
      SELECT
        p.*,
        COUNT(sp.id) as prompt_count
      FROM projects p
      LEFT JOIN saved_prompts sp ON sp.project_id = p.id
      WHERE p.id = ? AND p.user_id = ?
      GROUP BY p.id
    `).get(projectId, userId);

    return project;
  } catch (error) {
    logger.error('Error fetching project', error);
    throw error;
  }
}

/**
 * Update a project
 */
function update(projectId, userId, updates) {
  const db = getDatabaseWrapper();

  try {
    logger.db('UPDATE', 'projects', { projectId, userId, updates });

    const { name, description, color } = updates;

    const result = db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(name, description, color, projectId, userId);

    return result.changes > 0;
  } catch (error) {
    logger.error('Error updating project', error);
    throw error;
  }
}

/**
 * Delete a project
 */
function deleteProject(projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('DELETE', 'projects', { projectId, userId });

    // First, unlink all prompts from this project
    db.prepare(`
      UPDATE saved_prompts
      SET project_id = NULL
      WHERE project_id = ?
    `).run(projectId);

    // Then delete the project
    const result = db.prepare(`
      DELETE FROM projects
      WHERE id = ? AND user_id = ?
    `).run(projectId, userId);

    return result.changes > 0;
  } catch (error) {
    logger.error('Error deleting project', error);
    throw error;
  }
}

/**
 * Get prompts for a specific project
 */
function getPrompts(projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('SELECT', 'saved_prompts', { projectId, userId });

    const prompts = db.prepare(`
      SELECT sp.*
      FROM saved_prompts sp
      JOIN projects p ON p.id = sp.project_id
      WHERE sp.project_id = ? AND p.user_id = ?
      ORDER BY sp.created_at DESC
    `).all(projectId, userId);

    return prompts;
  } catch (error) {
    logger.error('Error fetching project prompts', error);
    throw error;
  }
}

/**
 * Assign a prompt to a project
 */
function assignPrompt(promptId, projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('UPDATE', 'saved_prompts', { promptId, projectId, userId });

    // Verify the project belongs to the user
    const project = getById(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Update the prompt
    const result = db.prepare(`
      UPDATE saved_prompts
      SET project_id = ?
      WHERE id = ? AND user_id = ?
    `).run(projectId, promptId, userId);

    // Update project timestamp
    if (result.changes > 0) {
      db.prepare(`
        UPDATE projects
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(projectId);
    }

    return result.changes > 0;
  } catch (error) {
    logger.error('Error assigning prompt to project', error);
    throw error;
  }
}

/**
 * Unassign a prompt from a project
 */
function unassignPrompt(promptId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('UPDATE', 'saved_prompts', { promptId, userId });

    const result = db.prepare(`
      UPDATE saved_prompts
      SET project_id = NULL
      WHERE id = ? AND user_id = ?
    `).run(promptId, userId);

    return result.changes > 0;
  } catch (error) {
    logger.error('Error unassigning prompt from project', error);
    throw error;
  }
}

module.exports = {
  create,
  getAllByUserId,
  getById,
  update,
  delete: deleteProject,
  getPrompts,
  assignPrompt,
  unassignPrompt
};
