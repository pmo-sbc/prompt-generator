/**
 * Product Management Routes (Admin Only)
 * Handles CRUD operations for products
 */

const express = require('express');
const productRepository = require('../db/productRepository');
const orderRepository = require('../db/orderRepository');
const userRepository = require('../db/userRepository');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { configureCsrf } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /api/admin/products
 * Get all products (admin only)
 */
router.get(
  '/api/admin/products',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const products = await productRepository.findAll(includeInactive);
    
    // Get purchase counts for each product
    const productsWithStats = await Promise.all(products.map(async product => ({
      ...product,
      purchase_count: await productRepository.getPurchaseCount(product.id)
    })));

    res.json({
      success: true,
      products: productsWithStats
    });
  })
);

/**
 * GET /api/admin/products/:id
 * Get a single product (admin only)
 */
router.get(
  '/api/admin/products/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = await productRepository.findById(parseInt(req.params.id));
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const purchaseCount = productRepository.getPurchaseCount(product.id);

    res.json({
      success: true,
      product: {
        ...product,
        purchase_count: purchaseCount
      }
    });
  })
);

/**
 * POST /api/admin/products
 * Create a new product (admin only)
 */
router.post(
  '/api/admin/products',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const { name, price, description, is_active, provides_tokens, token_quantity, is_course, course_date, course_zoom_link } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a positive number'
      });
    }

    if (provides_tokens && (!token_quantity || token_quantity <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Token quantity must be greater than 0 when provides_tokens is enabled'
      });
    }

    if (is_course && (!course_date || !course_zoom_link)) {
      return res.status(400).json({
        success: false,
        error: 'Course date and Zoom link are required when is_course is enabled'
      });
    }

    const product = await productRepository.create(
      name, 
      price, 
      description || null, 
      is_active !== undefined ? is_active : true,
      provides_tokens || false,
      token_quantity || 0,
      is_course || false,
      course_date || null,
      course_zoom_link || null
    );

    logger.info('Product created', {
      userId: req.session.userId,
      productId: product.id,
      productName: product.name,
      provides_tokens: product.provides_tokens,
      token_quantity: product.token_quantity
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  })
);

/**
 * PUT /api/admin/products/:id
 * Update a product (admin only)
 */
router.put(
  '/api/admin/products/:id',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id);
    const { name, price, description, is_active, provides_tokens, token_quantity, is_course, course_date, course_zoom_link } = req.body;

    const existingProduct = await productRepository.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a positive number'
      });
    }

    if (provides_tokens && (!token_quantity || token_quantity <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Token quantity must be greater than 0 when provides_tokens is enabled'
      });
    }

    if (is_course && (!course_date || !course_zoom_link)) {
      return res.status(400).json({
        success: false,
        error: 'Course date and Zoom link are required when is_course is enabled'
      });
    }

    const updated = await productRepository.update(productId, {
      name: name || existingProduct.name,
      price: price !== undefined ? price : existingProduct.price,
      description: description !== undefined ? description : existingProduct.description,
      is_active: is_active !== undefined ? is_active : existingProduct.is_active,
      provides_tokens: provides_tokens !== undefined ? provides_tokens : existingProduct.provides_tokens,
      token_quantity: token_quantity !== undefined ? token_quantity : existingProduct.token_quantity,
      is_course: is_course !== undefined ? is_course : existingProduct.is_course,
      course_date: course_date !== undefined ? course_date : existingProduct.course_date,
      course_zoom_link: course_zoom_link !== undefined ? course_zoom_link : existingProduct.course_zoom_link
    });

    if (!updated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update product'
      });
    }

    logger.info('Product updated', {
      userId: req.session.userId,
      productId,
      changes: req.body
    });

    const updatedProduct = await productRepository.findById(productId);
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  })
);

/**
 * DELETE /api/admin/products/:id
 * Delete a product (admin only)
 */
router.delete(
  '/api/admin/products/:id',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id);

    const product = productRepository.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const deleted = await productRepository.delete(productId);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete product'
      });
    }

    logger.info('Product deleted', {
      userId: req.session.userId,
      productId,
      productName: product.name
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  })
);

/**
 * GET /api/admin/users/purchases
 * Get all users with their purchased products (admin only)
 */
router.get(
  '/api/admin/users/purchases',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const usersWithPurchases = await orderRepository.getAllUsersWithPurchases();
    
    res.json({
      success: true,
      users: usersWithPurchases
    });
  })
);

/**
 * DELETE /api/admin/orders/:id
 * Delete an order (remove a purchase) (admin only)
 */
router.delete(
  '/api/admin/orders/:id',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.id);
    
    const order = await orderRepository.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    const deleted = await orderRepository.delete(orderId);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete order'
      });
    }
    
    logger.info('Order deleted by admin', {
      adminUserId: req.session.userId,
      orderId,
      orderNumber: order.order_number,
      userId: order.user_id
    });
    
    res.json({
      success: true,
      message: 'Purchase removed successfully'
    });
  })
);

/**
 * POST /api/admin/users/:userId/purchases
 * Manually add a product purchase to a user (admin only)
 */
router.post(
  '/api/admin/users/:userId/purchases',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { productId, quantity = 1 } = req.body;
    
    // Validate user exists
    const user = userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Validate product exists
    const product = productRepository.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Validate quantity
    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer'
      });
    }
    
    // Get customer info from user
    const customerInfo = userRepository.getCustomerInfo(userId);
    
    // Create order data
    const orderData = {
      customer: {
        firstName: customerInfo?.first_name || user.username,
        lastName: customerInfo?.last_name || '',
        email: user.email,
        phone: customerInfo?.phone || null,
        address: customerInfo?.address || null,
        city: customerInfo?.city || null,
        state: customerInfo?.state || null,
        zipCode: customerInfo?.zip_code || null,
        country: customerInfo?.country || null
      },
      order: {
        items: [{
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity
        }],
        subtotal: product.price * quantity,
        discount: 0,
        total: product.price * quantity
      },
      payment: {
        method: 'manual_admin'
      }
    };
    
    // Create the order
    const order = await orderRepository.create(userId, orderData);
    
    // If product provides tokens, add them to user account
    if (product.provides_tokens && product.token_quantity > 0) {
      const tokensToAdd = product.token_quantity * quantity;
      userRepository.addTokens(userId, tokensToAdd);
      logger.info('Tokens added via manual purchase', {
        userId,
        productId,
        quantity,
        tokensAdded: tokensToAdd
      });
    }
    
    logger.info('Manual purchase added by admin', {
      adminUserId: req.session.userId,
      userId,
      productId,
      productName: product.name,
      quantity,
      orderId: order.id,
      orderNumber: order.orderNumber
    });
    
    res.status(201).json({
      success: true,
      message: 'Purchase added successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber
      }
    });
  })
);

module.exports = router;

