/**
 * Admin Template Management Routes
 * Admin-only CRUD operations for templates
 */

const express = require('express');
const { body, param } = require('express-validator');
const Template = require('../models/Template');
const { handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { configureCsrf, sendCsrfToken } = require('../middleware/security');
const logger = require('../utils/logger');
const path = require('path');

const router = express.Router();
const csrfProtection = configureCsrf();

// All routes require admin authentication
// Skip /approve-users as it's handled by approvalRoutes with requireManagerOrAdmin
router.use((req, res, next) => {
  // Skip approval routes - they're handled by approvalRoutes
  // When mounted at /admin, req.path will be /approve-users (without /admin prefix)
  if (req.path === '/approve-users') {
    return next(); // Skip admin check - let approvalRoutes handle it
  }
  requireAuth(req, res, () => {
    requireAdmin(req, res, next);
  });
});

/**
 * GET /admin/templates
 * Serve admin template management page
 */
router.get('/templates', csrfProtection, sendCsrfToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-templates.html'));
});

/**
 * GET /api/admin/templates
 * Get all templates (including inactive)
 */
router.get('/api/templates', asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const templates = await Template.getAll(includeInactive);

  logger.debug('Admin fetched templates', {
    userId: req.session.userId,
    count: templates.length,
    includeInactive
  });

  res.json({
    success: true,
    templates,
    count: templates.length
  });
}));

/**
 * GET /api/admin/templates/:id
 * Get a specific template by ID
 */
router.get('/api/templates/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid template ID')
      .toInt()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const template = await Template.getById(req.params.id);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  })
);

/**
 * POST /api/admin/templates
 * Create a new template
 */
router.post('/api/templates',
  csrfProtection,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Template name must be 1-200 characters'),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be 1-100 characters'),

    body('subcategory')
      .trim()
      .notEmpty()
      .withMessage('Subcategory is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Subcategory must be 1-100 characters'),

    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Description must be 1-1000 characters'),

    body('prompt_template')
      .trim()
      .notEmpty()
      .withMessage('Prompt template is required')
      .isLength({ min: 1, max: 10000 })
      .withMessage('Prompt template must be 1-10000 characters'),

    body('inputs')
      .isArray()
      .withMessage('Inputs must be an array'),

    body('inputs.*.name')
      .trim()
      .notEmpty()
      .withMessage('Input name is required'),

    body('inputs.*.label')
      .trim()
      .notEmpty()
      .withMessage('Input label is required'),

    body('inputs.*.type')
      .isIn(['text', 'textarea', 'number', 'select'])
      .withMessage('Invalid input type'),

    body('is_premium')
      .optional()
      .isBoolean()
      .withMessage('is_premium must be a boolean')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const templateData = {
      name: req.body.name,
      category: req.body.category,
      subcategory: req.body.subcategory,
      description: req.body.description,
      prompt_template: req.body.prompt_template,
      inputs: req.body.inputs,
      is_premium: req.body.is_premium || false
    };

    const templateId = await Template.create(templateData);

    logger.info('Admin created template', {
      userId: req.session.userId,
      templateId,
      name: templateData.name
    });

    const template = await Template.getById(templateId);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template
    });
  })
);

/**
 * PUT /api/admin/templates/:id
 * Update a template
 */
router.put('/api/templates/:id',
  csrfProtection,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid template ID')
      .toInt(),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Template name must be 1-200 characters'),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be 1-100 characters'),

    body('subcategory')
      .trim()
      .notEmpty()
      .withMessage('Subcategory is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Subcategory must be 1-100 characters'),

    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Description must be 1-1000 characters'),

    body('prompt_template')
      .trim()
      .notEmpty()
      .withMessage('Prompt template is required')
      .isLength({ min: 1, max: 10000 })
      .withMessage('Prompt template must be 1-10000 characters'),

    body('inputs')
      .isArray()
      .withMessage('Inputs must be an array'),

    body('is_premium')
      .optional()
      .isBoolean()
      .withMessage('is_premium must be a boolean'),

    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    // Check if template exists
    const existingTemplate = await Template.getById(templateId);
    if (!existingTemplate) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    const templateData = {
      name: req.body.name,
      category: req.body.category,
      subcategory: req.body.subcategory,
      description: req.body.description,
      prompt_template: req.body.prompt_template,
      inputs: req.body.inputs,
      is_premium: req.body.is_premium !== undefined ? req.body.is_premium : existingTemplate.is_premium,
      is_active: req.body.is_active !== undefined ? req.body.is_active : existingTemplate.is_active
    };

    const updated = await Template.update(templateId, templateData);

    if (!updated) {
      return res.status(500).json({
        error: 'Failed to update template'
      });
    }

    logger.info('Admin updated template', {
      userId: req.session.userId,
      templateId,
      name: templateData.name
    });

    const template = await Template.getById(templateId);

    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });
  })
);

/**
 * DELETE /api/admin/templates/:id
 * Soft delete a template (set is_active = false)
 */
router.delete('/api/templates/:id',
  csrfProtection,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid template ID')
      .toInt()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    // Check if template exists
    const existingTemplate = await Template.getById(templateId);
    if (!existingTemplate) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    const deleted = await Template.softDelete(templateId);

    if (!deleted) {
      return res.status(500).json({
        error: 'Failed to delete template'
      });
    }

    logger.info('Admin soft deleted template', {
      userId: req.session.userId,
      templateId,
      name: existingTemplate.name
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  })
);

/**
 * POST /api/admin/templates/:id/restore
 * Restore a soft-deleted template (set is_active = true)
 */
router.post('/api/templates/:id/restore',
  csrfProtection,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid template ID')
      .toInt()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    // Check if template exists
    const existingTemplate = await Template.getById(templateId);
    if (!existingTemplate) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    const restored = await Template.update(templateId, {
      ...existingTemplate,
      is_active: true
    });

    if (!restored) {
      return res.status(500).json({
        error: 'Failed to restore template'
      });
    }

    logger.info('Admin restored template', {
      userId: req.session.userId,
      templateId,
      name: existingTemplate.name
    });

    const template = await Template.getById(templateId);

    res.json({
      success: true,
      message: 'Template restored successfully',
      template
    });
  })
);

/**
 * DELETE /api/admin/templates/:id/permanent
 * Permanently delete a template
 */
router.delete('/api/templates/:id/permanent',
  csrfProtection,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid template ID')
      .toInt()
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const templateId = req.params.id;

    // Check if template exists
    const existingTemplate = await Template.getById(templateId);
    if (!existingTemplate) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    const deleted = await Template.hardDelete(templateId);

    if (!deleted) {
      return res.status(500).json({
        error: 'Failed to permanently delete template'
      });
    }

    logger.security('Admin permanently deleted template', {
      userId: req.session.userId,
      templateId,
      name: existingTemplate.name
    });

    res.json({
      success: true,
      message: 'Template permanently deleted'
    });
  })
);

/**
 * GET /api/admin/templates/stats
 * Get template statistics
 */
router.get('/api/templates/stats', asyncHandler(async (req, res) => {
  const allTemplates = await Template.getAll(true);
  const activeTemplates = allTemplates.filter(t => t.is_active);
  const inactiveTemplates = allTemplates.filter(t => !t.is_active);
  const premiumTemplates = allTemplates.filter(t => t.is_premium);

  const categories = {};
  allTemplates.forEach(template => {
    if (!categories[template.category]) {
      categories[template.category] = 0;
    }
    categories[template.category]++;
  });

  res.json({
    success: true,
    stats: {
      total: allTemplates.length,
      active: activeTemplates.length,
      inactive: inactiveTemplates.length,
      premium: premiumTemplates.length,
      free: allTemplates.length - premiumTemplates.length,
      byCategory: categories
    }
  });
}));

module.exports = router;
