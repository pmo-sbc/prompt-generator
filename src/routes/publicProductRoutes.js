/**
 * Public Product Routes
 * Handles public access to products and discount codes
 */

const express = require('express');
const productRepository = require('../db/productRepository');
const discountCodeRepository = require('../db/discountCodeRepository');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/products
 * Get all active products (public)
 */
router.get(
  '/api/products',
  asyncHandler(async (req, res) => {
    const products = await productRepository.findAll(false); // Only active products
    res.json({
      success: true,
      products
    });
  })
);

/**
 * GET /api/products/:id
 * Get a single product (public)
 */
router.get(
  '/api/products/:id',
  asyncHandler(async (req, res) => {
    const product = await productRepository.findById(parseInt(req.params.id));
    
    if (!product || !product.is_active) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  })
);

/**
 * GET /api/discount-codes
 * Get all active discount codes (public)
 * Returns discount codes with their product restrictions
 */
router.get(
  '/api/discount-codes',
  asyncHandler(async (req, res) => {
    const discountCodes = await discountCodeRepository.findAll(false); // Only active codes

    res.json({
      success: true,
      discountCodes: discountCodes.map(dc => ({
        id: dc.id,
        code: dc.code,
        discount_percentage: dc.discount_percentage,
        product_ids: dc.product_ids // Array of product IDs or null for all products
      }))
    });
  })
);

/**
 * POST /api/discount-codes/validate
 * Validate a discount code (public)
 * Checks if the code applies to the products in the cart
 */
router.post(
  '/api/discount-codes/validate',
  asyncHandler(async (req, res) => {
    const { code, cartItems } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Discount code is required'
      });
    }

    const discountCode = await discountCodeRepository.findByCode(code);

    if (!discountCode) {
      return res.json({
        success: false,
        valid: false,
        error: 'Invalid discount code'
      });
    }

    // Check if discount code applies to no products (empty array = disabled)
    if (Array.isArray(discountCode.product_ids) && discountCode.product_ids.length === 0) {
      return res.json({
        success: false,
        valid: false,
        error: 'This discount code is not available for any products'
      });
    }

    // Check if discount code applies to specific products
    if (discountCode.product_ids && Array.isArray(discountCode.product_ids) && discountCode.product_ids.length > 0) {
      // Code applies to specific products only
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.json({
          success: false,
          valid: false,
          error: 'This discount code requires specific products in your cart'
        });
      }

      // Check if any cart item matches the product_ids
      const cartProductIds = cartItems.map(item => item.id).filter(id => id != null);
      const hasMatchingProduct = cartProductIds.some(cartProductId => 
        discountCode.product_ids.includes(cartProductId)
      );

      if (!hasMatchingProduct) {
        return res.json({
          success: false,
          valid: false,
          error: 'This discount code does not apply to the products in your cart'
        });
      }
    }
    // If product_ids is null, code applies to all products (no check needed)

    res.json({
      success: true,
      valid: true,
      discountCode: {
        id: discountCode.id,
        code: discountCode.code,
        discount_percentage: discountCode.discount_percentage
      }
    });
  })
);

module.exports = router;

