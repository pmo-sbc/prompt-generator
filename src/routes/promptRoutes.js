/**
 * Prompt Routes
 */

const express = require('express');
const promptRepository = require('../db/promptRepository');
const validators = require('../validators');
const { handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/prompts/save
 * Save a new prompt
 */
router.post(
  '/save',
  csrfProtection,
  validators.savePrompt,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { templateName, category, promptText, inputs, projectId } = req.body;
    const userId = req.session.userId;

    const prompt = await promptRepository.create(
      userId,
      templateName,
      category,
      promptText,
      inputs,
      projectId || null
    );

    logger.info('Prompt saved', {
      userId,
      promptId: prompt.id,
      templateName,
      projectId
    });

    res.json({
      success: true,
      promptId: prompt.id,
      message: 'Prompt saved successfully'
    });
  })
);

/**
 * GET /api/prompts
 * Get all prompts for current user (with optional project filter)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;

    let prompts;
    if (projectId) {
      prompts = await promptRepository.findByProjectId(userId, projectId, limit, offset);
    } else {
      prompts = await promptRepository.findByUserId(userId, limit, offset);
    }

    logger.debug('Prompts retrieved', {
      userId,
      projectId,
      count: prompts.length
    });

    res.json(prompts);
  })
);

/**
 * PATCH /api/prompts/:id
 * Update a prompt (e.g., assign to project)
 */
router.patch(
  '/:id',
  csrfProtection,
  asyncHandler(async (req, res) => {
    const promptId = parseInt(req.params.id);
    const userId = req.session.userId;
    const { project_id } = req.body;

    const updated = await promptRepository.updateProject(promptId, userId, project_id);

    if (!updated) {
      return res.status(404).json({
        error: 'Prompt not found'
      });
    }

    logger.info('Prompt updated', {
      userId,
      promptId,
      projectId: project_id
    });

    res.json({
      success: true,
      message: 'Prompt updated successfully'
    });
  })
);

/**
 * DELETE /api/prompts/:id
 * Delete a prompt
 */
router.delete(
  '/:id',
  csrfProtection,
  validators.deletePrompt,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const promptId = parseInt(req.params.id);
    const userId = req.session.userId;

    const deleted = await promptRepository.delete(promptId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Prompt not found or already deleted'
      });
    }

    logger.info('Prompt deleted', {
      userId,
      promptId
    });

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });
  })
);

/**
 * GET /api/prompts/:id
 * Get a specific prompt
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const promptId = parseInt(req.params.id);
    const userId = req.session.userId;

    const prompt = await promptRepository.findById(promptId, userId);

    if (!prompt) {
      return res.status(404).json({
        error: 'Prompt not found'
      });
    }

    res.json(prompt);
  })
);

/**
 * POST /api/prompts/search
 * Search prompts
 */
router.post(
  '/search',
  validators.searchPrompts,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { searchTerm } = req.body;

    const prompts = await promptRepository.search(userId, searchTerm);

    res.json({
      results: prompts,
      count: prompts.length
    });
  })
);

/**
 * POST /api/prompts/bulk-assign
 * Assign multiple prompts to a project
 */
router.post(
  '/bulk-assign',
  csrfProtection,
  validators.bulkAssignPrompts,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { promptIds, projectId } = req.body;

    if (!Array.isArray(promptIds) || promptIds.length === 0) {
      return res.status(400).json({
        error: 'promptIds must be a non-empty array'
      });
    }

    const updated = await promptRepository.bulkUpdateProject(userId, promptIds, projectId);

    logger.info('Bulk prompt assignment', {
      userId,
      count: updated,
      projectId
    });

    res.json({
      success: true,
      updated,
      message: `${updated} prompt(s) assigned to project`
    });
  })
);

/**
 * POST /api/prompts/bulk-delete
 * Delete multiple prompts
 */
router.post(
  '/bulk-delete',
  csrfProtection,
  validators.bulkDeletePrompts,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { promptIds } = req.body;

    if (!Array.isArray(promptIds) || promptIds.length === 0) {
      return res.status(400).json({
        error: 'promptIds must be a non-empty array'
      });
    }

    const deleted = await promptRepository.bulkDelete(userId, promptIds);

    logger.info('Bulk prompt deletion', {
      userId,
      count: deleted
    });

    res.json({
      success: true,
      deleted,
      message: `${deleted} prompt(s) deleted`
    });
  })
);

module.exports = router;
