/**
 * Project Repository
 * Data access layer for project operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

/**
 * Create a new project
 */
async function create(userId, name, description = null, color = '#3498db') {
  const db = getDatabaseWrapper();

  try {
    logger.db('INSERT', 'projects', { userId, name });

    const result = await db.prepare(`
      INSERT INTO projects (user_id, name, description, color, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `).get(userId, name, description, color);

    return result.id;
  } catch (error) {
    // Check if it's a duplicate key error (sequence out of sync)
    if (error.code === '23505' && error.constraint === 'projects_pkey') {
      logger.warn('Sequence out of sync for projects, attempting to fix...', {
        userId,
        error: error.message
      });
      
      try {
        // Fix the sequence by setting it to max(id) + 1
        const fixQuery = `
          SELECT setval('projects_id_seq', 
            COALESCE((SELECT MAX(id) FROM projects), 0) + 1, 
            true)
        `;
        await db.prepare(fixQuery).get();
        
        logger.info('Sequence fixed, retrying insert...');
        
        // Retry the insert
        const retryResult = await db.prepare(`
          INSERT INTO projects (user_id, name, description, color, created_at, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `).get(userId, name, description, color);
        
        return retryResult.id;
      } catch (retryError) {
        logger.error('Error after sequence fix attempt', retryError);
        throw retryError;
      }
    }
    
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
async function getById(projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('SELECT', 'projects', { projectId, userId });

    const project = await db.prepare(`
      SELECT
        p.*,
        COUNT(sp.id) as prompt_count
      FROM projects p
      LEFT JOIN saved_prompts sp ON sp.project_id = p.id
      WHERE p.id = $1 AND p.user_id = $2
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
async function update(projectId, userId, updates) {
  const db = getDatabaseWrapper();

  try {
    logger.db('UPDATE', 'projects', { projectId, userId, updates });

    const { name, description, color } = updates;

    const result = await db.prepare(`
      UPDATE projects
      SET name = $1, description = $2, color = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
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
async function deleteProject(projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('DELETE', 'projects', { projectId, userId });

    // First, unlink all prompts from this project
    await db.prepare(`
      UPDATE saved_prompts
      SET project_id = NULL
      WHERE project_id = $1
    `).run(projectId);

    // Then delete the project
    const result = await db.prepare(`
      DELETE FROM projects
      WHERE id = $1 AND user_id = $2
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
async function getPrompts(projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('SELECT', 'saved_prompts', { projectId, userId });

    const prompts = await db.prepare(`
      SELECT sp.*
      FROM saved_prompts sp
      JOIN projects p ON p.id = sp.project_id
      WHERE sp.project_id = $1 AND p.user_id = $2
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
async function assignPrompt(promptId, projectId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('UPDATE', 'saved_prompts', { promptId, projectId, userId });

    // Verify the project belongs to the user
    const project = await getById(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Update the prompt
    const result = await db.prepare(`
      UPDATE saved_prompts
      SET project_id = $1
      WHERE id = $2 AND user_id = $3
    `).run(projectId, promptId, userId);

    // Update project timestamp
    if (result.changes > 0) {
      await db.prepare(`
        UPDATE projects
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
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
async function unassignPrompt(promptId, userId) {
  const db = getDatabaseWrapper();

  try {
    logger.db('UPDATE', 'saved_prompts', { promptId, userId });

    const result = await db.prepare(`
      UPDATE saved_prompts
      SET project_id = NULL
      WHERE id = $1 AND user_id = $2
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
