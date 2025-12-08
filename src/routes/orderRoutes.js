/**
 * Order Routes
 * Handles order processing and confirmation
 */

const express = require('express');
const emailService = require('../services/emailService');
const paymentService = require('../services/paymentService');
const orderRepository = require('../db/orderRepository');
const discountCodeRepository = require('../db/discountCodeRepository');
const userRepository = require('../db/userRepository');
const productRepository = require('../db/productRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/orders/process
 * Process an order and send confirmation email
 */
router.post(
  '/orders/process',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { customer, order, payment } = req.body;

    // Validate required fields
    if (!customer || !order || !customer.email) {
      return res.status(400).json({
        error: 'Missing required order information'
      });
    }

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        error: 'Order must contain at least one item'
      });
    }

    // Process payment if total is greater than 0
    let paymentResult = { success: true };
    if (order.total > 0 && payment) {
      try {
        if (payment.method === 'paypal') {
          paymentResult = await paymentService.processPayPalPayment(payment, order.total);
        } else {
          // Default to card payment
          paymentResult = await paymentService.processPayment(payment, order.total);
        }

        if (!paymentResult.success) {
          return res.status(400).json({
            success: false,
            error: paymentResult.error || 'Payment processing failed',
            paymentError: paymentResult.stripeError
          });
        }

        logger.info('Payment processed successfully', {
          userId,
          paymentIntentId: paymentResult.paymentIntentId || paymentResult.orderId,
          amount: order.total,
          method: payment.method
        });
      } catch (paymentError) {
        logger.error('Payment processing error', {
          error: paymentError.message,
          userId,
          amount: order.total
        });
        return res.status(400).json({
          success: false,
          error: 'Payment processing failed. Please try again.',
          paymentError: paymentError.message
        });
      }
    }

    try {
      // Check if discount code was used and get its ID
      let discountCodeId = null;
      const discountCode = req.body.discountCode;
      if (discountCode) {
        const discountCodeData = await discountCodeRepository.findByCode(discountCode);
        if (discountCodeData) {
          // Check if discount code applies to no products (empty array = disabled)
          if (Array.isArray(discountCodeData.product_ids) && discountCodeData.product_ids.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'This discount code is not available for any products'
            });
          }

          // Validate that discount code applies to products in the order
          if (discountCodeData.product_ids && Array.isArray(discountCodeData.product_ids) && discountCodeData.product_ids.length > 0) {
            // Code applies to specific products only
            const orderProductIds = order.items.map(item => item.id).filter(id => id != null);
            const hasMatchingProduct = orderProductIds.some(orderProductId => 
              discountCodeData.product_ids.includes(orderProductId)
            );

            if (!hasMatchingProduct) {
              return res.status(400).json({
                success: false,
                error: 'This discount code does not apply to the products in your order'
              });
            }
          }
          // If product_ids is null, code applies to all products (no validation needed)
          
          discountCodeId = discountCodeData.id;
          // Increment usage count
          await discountCodeRepository.incrementUsage(discountCodeId);
        }
      }

      // Save order to database FIRST (before email)
      const orderData = {
        customer,
        order,
        payment: payment ? {
          method: payment.method,
          paymentIntentId: paymentResult.paymentIntentId || paymentResult.orderId || null,
          status: paymentResult.status || 'completed'
        } : null,
        discountCodeId: discountCodeId
      };
      
      logger.info('Attempting to save order', {
        userId,
        email: customer.email,
        itemCount: order.items.length,
        total: order.total,
        discountCodeId
      });

      let savedOrder;
      try {
        savedOrder = await orderRepository.create(userId, orderData);
        logger.info('Order saved successfully', {
          userId,
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber
        });
      } catch (saveError) {
        logger.error('Failed to save order to database', {
          error: saveError.message,
          stack: saveError.stack,
          userId,
          email: customer.email
        });
        throw new Error(`Failed to save order: ${saveError.message}`);
      }

      // Process token purchases if any
      try {
        let totalTokensToAdd = 0;

        // Get all products to check which ones provide tokens
        const productRepository = require('../db/productRepository');
        const allProducts = await productRepository.findAll(true); // Include inactive for lookup
        const productsMap = new Map(allProducts.map(p => [p.id, p]));

        logger.info('Processing token purchases', {
          userId,
          orderItems: order.items,
          itemCount: order.items.length,
          productsInDb: allProducts.length
        });

        // Check each item in the order to see if it provides tokens
        order.items.forEach(item => {
          const productId = item.id;
          const product = productsMap.get(productId);
          
          // Check if this product provides tokens
          if (product && product.provides_tokens && product.token_quantity > 0) {
            const quantity = item.quantity || 1;
            const tokensForThisItem = product.token_quantity * quantity;
            totalTokensToAdd += tokensForThisItem;
            logger.info('Found product that provides tokens', {
              userId,
              productId: product.id,
              productName: product.name,
              tokenQuantityPerUnit: product.token_quantity,
              quantity,
              tokensToAdd: tokensForThisItem
            });
          }
        });

        // Add tokens to user account if tokens were purchased
        if (totalTokensToAdd > 0) {
          // Get current token balance before adding
          const currentTokens = await userRepository.getTokens(userId);
          logger.info('Adding tokens to user account', {
            userId,
            currentTokens,
            tokensToAdd: totalTokensToAdd,
            expectedNewBalance: currentTokens + totalTokensToAdd
          });

          const tokensAdded = await userRepository.addTokens(userId, totalTokensToAdd);
          
          if (tokensAdded) {
            // Verify tokens were added
            const newTokens = await userRepository.getTokens(userId);
            logger.info('Tokens added to user account successfully', {
              userId,
              tokensAdded: totalTokensToAdd,
              previousBalance: currentTokens,
              newBalance: newTokens,
              orderNumber: savedOrder.orderNumber
            });
          } else {
            logger.warn('Failed to add tokens to user account - addTokens returned false', {
              userId,
              tokensToAdd: totalTokensToAdd,
              currentTokens
            });
          }
        } else {
          logger.info('No tokens product found in order', {
            userId,
            orderItems: order.items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity }))
          });
        }
      } catch (tokenError) {
        // Log error but don't fail the order - tokens can be added manually if needed
        logger.error('Error processing token purchase', {
          error: tokenError.message,
          stack: tokenError.stack,
          userId,
          orderNumber: savedOrder.orderNumber
        });
      }

      // Send order confirmation email (non-blocking)
      let emailResult = { success: false };
      try {
        const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Valued Customer';
        emailResult = await emailService.sendOrderConfirmationEmail(
          customer.email,
          customerName,
          order
        );

        if (!emailResult.success) {
          logger.warn('Failed to send order confirmation email', {
            email: customer.email,
            error: emailResult.error,
            orderNumber: savedOrder.orderNumber
          });
          // Continue anyway - order is already saved
        }
      } catch (emailError) {
        logger.warn('Error sending order confirmation email', {
          error: emailError.message,
          orderNumber: savedOrder.orderNumber
        });
        // Continue anyway - order is already saved
      }

      // Calculate tokens added for response (use same logic as above)
      let totalTokensAdded = 0;
      const productRepository = require('../db/productRepository');
      const allProducts = await productRepository.findAll(true);
      const productsMap = new Map(allProducts.map(p => [p.id, p]));
      
      order.items.forEach(item => {
        const productId = item.id;
        const product = productsMap.get(productId);
        if (product && product.provides_tokens && product.token_quantity > 0) {
          const quantity = item.quantity || 1;
          totalTokensAdded += product.token_quantity * quantity;
        }
      });

      logger.info('Order processed successfully', {
        userId,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        email: customer.email,
        orderTotal: order.total,
        itemCount: order.items.length,
        tokensAdded: totalTokensAdded,
        emailSent: emailResult.success
      });

      // Send admin notification for purchase (non-blocking)
      try {
        const user = await userRepository.findById(userId);
        if (user) {
          await emailService.sendPurchaseNotification(
            {
              orderNumber: savedOrder.orderNumber,
              items: order.items,
              subtotal: order.subtotal,
              discount: order.discount || 0,
              total: order.total
            },
            {
              id: user.id,
              username: user.username,
              email: user.email
            }
          );
          logger.info('Admin notification sent for purchase', {
            userId,
            orderNumber: savedOrder.orderNumber
          });
        }
      } catch (notificationError) {
        logger.warn('Failed to send admin notification for purchase', {
          error: notificationError.message,
          userId,
          orderNumber: savedOrder.orderNumber
        });
        // Continue anyway - order is successful
      }

      res.json({
        success: true,
        message: 'Order processed successfully',
        order: {
          id: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          discount: order.discount || 0,
          total: order.total,
          createdAt: new Date().toISOString()
        },
        tokensAdded: totalTokensAdded > 0 ? totalTokensAdded : undefined,
        emailSent: emailResult.success
      });
    } catch (error) {
      logger.error('Error processing order', {
        error: error.message,
        stack: error.stack,
        userId,
        email: customer.email
      });
      throw error;
    }
  })
);

/**
 * POST /api/paypal/create-order
 * Create a PayPal order for checkout
 */
router.post(
  '/paypal/create-order',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    try {
      const result = await paymentService.createPayPalOrder(amount);

      if (result.success) {
        res.json({
          success: true,
          orderId: result.orderId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to create PayPal order'
        });
      }
    } catch (error) {
      logger.error('Error creating PayPal order', {
        error: error.message,
        userId: req.session.userId
      });
      res.status(500).json({
        success: false,
        error: 'Failed to create PayPal order. Please try again.'
      });
    }
  })
);

/**
 * GET /api/orders/purchased-products
 * Get unique products purchased by the authenticated user with full product details
 * NOTE: This route must be defined BEFORE /orders to avoid route matching conflicts
 */
router.get(
  '/orders/purchased-products',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    try {
      // Get all orders for the user
      const orders = await orderRepository.findByUserId(userId, 1000, 0); // Get a large number to ensure we get all products
      
      // Extract unique product IDs from all orders
      const productIds = new Set();
      const productPurchaseDates = new Map(); // Track when each product was first purchased
      
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (item.id) {
              productIds.add(item.id);
              // Track the earliest purchase date for each product
              if (!productPurchaseDates.has(item.id) || 
                  new Date(order.created_at) < new Date(productPurchaseDates.get(item.id))) {
                productPurchaseDates.set(item.id, order.created_at);
              }
            }
          });
        }
      });

      // Fetch full product details for all purchased products
      const purchasedProducts = [];
      for (const productId of productIds) {
        const product = await productRepository.findById(productId);
        if (product) {
          purchasedProducts.push({
            ...product,
            purchasedDate: productPurchaseDates.get(productId)
          });
        }
      }

      // Sort by purchase date (most recent first)
      purchasedProducts.sort((a, b) => {
        return new Date(b.purchasedDate) - new Date(a.purchasedDate);
      });

      res.json({
        success: true,
        products: purchasedProducts,
        count: purchasedProducts.length
      });
    } catch (error) {
      logger.error('Error fetching purchased products', {
        error: error.message,
        userId
      });
      throw error;
    }
  })
);

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
router.get(
  '/orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    try {
      const orders = await orderRepository.findByUserId(userId, limit, offset);
      const totalCount = await orderRepository.countByUserId(userId);

      res.json({
        success: true,
        orders,
        total: totalCount,
        limit,
        offset
      });
    } catch (error) {
      logger.error('Error fetching orders', {
        error: error.message,
        userId
      });
      throw error;
    }
  })
);

module.exports = router;

