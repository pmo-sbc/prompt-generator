/**
 * Discount Code Management Routes (Admin Only)
 * Handles CRUD operations for discount codes
 */

const express = require('express');
const discountCodeRepository = require('../db/discountCodeRepository');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { configureCsrf } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /api/admin/discount-codes
 * Get all discount codes (admin only)
 */
router.get(
  '/api/admin/discount-codes',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const discountCodes = await discountCodeRepository.findAll(includeInactive);

    res.json({
      success: true,
      discountCodes
    });
  })
);

/**
 * GET /api/admin/discount-codes/:id
 * Get a single discount code (admin only)
 */
router.get(
  '/api/admin/discount-codes/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const discountCode = await discountCodeRepository.findById(parseInt(req.params.id));
    
    if (!discountCode) {
      return res.status(404).json({
        success: false,
        error: 'Discount code not found'
      });
    }

    res.json({
      success: true,
      discountCode
    });
  })
);

/**
 * POST /api/admin/discount-codes
 * Create a new discount code (admin only)
 */
router.post(
  '/api/admin/discount-codes',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const { code, discount_percentage, product_ids } = req.body;

    if (!code || discount_percentage === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Code and discount_percentage are required'
      });
    }

    if (typeof discount_percentage !== 'number' || discount_percentage < 0 || discount_percentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Discount percentage must be between 0 and 100'
      });
    }

    // Validate product_ids if provided
    if (product_ids !== undefined && product_ids !== null) {
      if (!Array.isArray(product_ids)) {
        return res.status(400).json({
          success: false,
          error: 'product_ids must be an array'
        });
      }
      // Validate all items are numbers
      if (product_ids.some(id => typeof id !== 'number' || id <= 0)) {
        return res.status(400).json({
          success: false,
          error: 'All product_ids must be positive numbers'
        });
      }
    }

    // Check if code already exists
    const existing = await discountCodeRepository.findByCode(code);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Discount code already exists'
      });
    }

    const discountCode = await discountCodeRepository.create(code, discount_percentage, product_ids || null);

    logger.info('Discount code created', {
      userId: req.session.userId,
      discountCodeId: discountCode.id,
      code: discountCode.code
    });

    res.status(201).json({
      success: true,
      message: 'Discount code created successfully',
      discountCode
    });
  })
);

/**
 * PUT /api/admin/discount-codes/:id
 * Update a discount code (admin only)
 */
router.put(
  '/api/admin/discount-codes/:id',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const discountCodeId = parseInt(req.params.id);
    const { code, discount_percentage, is_active, product_ids } = req.body;

    const existingDiscountCode = discountCodeRepository.findById(discountCodeId);
    if (!existingDiscountCode) {
      return res.status(404).json({
        success: false,
        error: 'Discount code not found'
      });
    }

    if (discount_percentage !== undefined && (typeof discount_percentage !== 'number' || discount_percentage < 0 || discount_percentage > 100)) {
      return res.status(400).json({
        success: false,
        error: 'Discount percentage must be between 0 and 100'
      });
    }

    // Validate product_ids if provided
    if (product_ids !== undefined && product_ids !== null) {
      if (!Array.isArray(product_ids)) {
        return res.status(400).json({
          success: false,
          error: 'product_ids must be an array'
        });
      }
      // Validate all items are numbers
      if (product_ids.some(id => typeof id !== 'number' || id <= 0)) {
        return res.status(400).json({
          success: false,
          error: 'All product_ids must be positive numbers'
        });
      }
    }

    // Check if new code conflicts with existing code
    if (code && code.toUpperCase() !== existingDiscountCode.code) {
      const existing = await discountCodeRepository.findByCode(code);
      if (existing && existing.id !== discountCodeId) {
        return res.status(400).json({
          success: false,
          error: 'Discount code already exists'
        });
      }
    }

    const updated = await discountCodeRepository.update(discountCodeId, {
      code: code || existingDiscountCode.code,
      discountPercentage: discount_percentage !== undefined ? discount_percentage : existingDiscountCode.discount_percentage,
      is_active: is_active !== undefined ? is_active : existingDiscountCode.is_active,
      productIds: product_ids !== undefined ? product_ids : existingDiscountCode.product_ids
    });

    if (!updated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update discount code'
      });
    }

    logger.info('Discount code updated', {
      userId: req.session.userId,
      discountCodeId,
      changes: req.body
    });

    const updatedDiscountCode = discountCodeRepository.findById(discountCodeId);
    res.json({
      success: true,
      message: 'Discount code updated successfully',
      discountCode: updatedDiscountCode
    });
  })
);

/**
 * DELETE /api/admin/discount-codes/:id
 * Delete a discount code (admin only)
 */
router.delete(
  '/api/admin/discount-codes/:id',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const discountCodeId = parseInt(req.params.id);

    const discountCode = discountCodeRepository.findById(discountCodeId);
    if (!discountCode) {
      return res.status(404).json({
        success: false,
        error: 'Discount code not found'
      });
    }

    const deleted = await discountCodeRepository.delete(discountCodeId);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete discount code'
      });
    }

    logger.info('Discount code deleted', {
      userId: req.session.userId,
      discountCodeId,
      code: discountCode.code
    });

    res.json({
      success: true,
      message: 'Discount code deleted successfully'
    });
  })
);

module.exports = router;

