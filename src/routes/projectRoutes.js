/**
 * Project Management Routes
 * API routes for managing user projects
 */

const express = require('express');
const { body } = require('express-validator');
const projectRepository = require('../db/projectRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf, sendCsrfToken } = require('../middleware/security');
const { handleValidationErrors } = require('../middleware/validation');
const logger = require('../utils/logger');
const path = require('path');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /api/projects
 * Get all projects for the authenticated user
 */
router.get('/projects', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  logger.info('GET /api/projects called', { userId });

  try {
    const projects = await projectRepository.getAllByUserId(userId);

    logger.info('Projects fetched successfully', { userId, count: projects?.length || 0 });

    res.json({
      success: true,
      projects: projects || []
    });
  } catch (error) {
    logger.error('Error in GET /api/projects', { userId, error: error.message, stack: error.stack });
    throw error;
  }
}));

/**
 * GET /api/projects/:id
 * Get a specific project with its prompts
 */
router.get('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const projectId = parseInt(req.params.id);

  const project = await projectRepository.getById(projectId, userId);

  if (!project) {
    return res.status(404).json({
      error: 'Project not found'
    });
  }

  const prompts = await projectRepository.getPrompts(projectId, userId);

  res.json({
    success: true,
    project,
    prompts
  });
}));

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/projects', requireAuth, csrfProtection,
  [
    body('name').trim().notEmpty().withMessage('Project name is required')
      .isLength({ max: 100 }).withMessage('Project name must be 100 characters or less'),
    body('description').optional().trim()
      .isLength({ max: 500 }).withMessage('Description must be 500 characters or less'),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { name, description, color } = req.body;

    const projectId = await projectRepository.create(
      userId,
      name,
      description || null,
      color || '#3498db'
    );

    const project = await projectRepository.getById(projectId, userId);

    logger.info('Project created', { userId, projectId, name });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  })
);

/**
 * PUT /api/projects/:id
 * Update a project
 */
const updateProjectHandler = [
  body('name').trim().notEmpty().withMessage('Project name is required')
    .isLength({ max: 100 }).withMessage('Project name must be 100 characters or less'),
  body('description').optional().trim()
    .isLength({ max: 500 }).withMessage('Description must be 500 characters or less'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const projectId = parseInt(req.params.id);
    const { name, description, color } = req.body;

    const success = await projectRepository.update(projectId, userId, {
      name,
      description: description || null,
      color: color || '#3498db'
    });

    if (!success) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const project = await projectRepository.getById(projectId, userId);

    logger.info('Project updated', { userId, projectId });

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  })
];

router.put('/projects/:id', requireAuth, csrfProtection, updateProjectHandler);
router.patch('/projects/:id', requireAuth, csrfProtection, updateProjectHandler);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/projects/:id', requireAuth, csrfProtection, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const projectId = parseInt(req.params.id);

  const success = await projectRepository.delete(projectId, userId);

  if (!success) {
    return res.status(404).json({
      error: 'Project not found'
    });
  }

  logger.info('Project deleted', { userId, projectId });

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
}));

/**
 * POST /api/projects/:id/prompts/:promptId
 * Assign a prompt to a project
 */
router.post('/projects/:id/prompts/:promptId', requireAuth, csrfProtection, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const projectId = parseInt(req.params.id);
  const promptId = parseInt(req.params.promptId);

  try {
    const success = await projectRepository.assignPrompt(promptId, projectId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Prompt or project not found'
      });
    }

    logger.info('Prompt assigned to project', { userId, projectId, promptId });

    res.json({
      success: true,
      message: 'Prompt assigned to project successfully'
    });
  } catch (error) {
    if (error.message === 'Project not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    throw error;
  }
}));

/**
 * DELETE /api/prompts/:promptId/project
 * Unassign a prompt from its project
 */
router.delete('/prompts/:promptId/project', requireAuth, csrfProtection, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const promptId = parseInt(req.params.promptId);

  const success = await projectRepository.unassignPrompt(promptId, userId);

  if (!success) {
    return res.status(404).json({
      error: 'Prompt not found'
    });
  }

  logger.info('Prompt unassigned from project', { userId, promptId });

  res.json({
    success: true,
    message: 'Prompt removed from project'
  });
}));

module.exports = router;
