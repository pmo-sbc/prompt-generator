/**
 * Middleware to require course purchase for access
 * Checks if user has purchased any product with is_course = true
 */

const logger = require('../utils/logger');
const orderRepository = require('../db/orderRepository');
const productRepository = require('../db/productRepository');

/**
 * Middleware to check if user has purchased a course
 * Redirects to product page if not purchased
 */
function requireCourseAccess(req, res, next) {
  // Check if user is authenticated
  if (!req.session || !req.session.userId) {
    logger.warn('Unauthorized access attempt to course-protected resource', {
      url: req.originalUrl,
      ip: req.ip
    });
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }

  const userId = req.session.userId;

  // Allow admins to bypass course check (for testing/debugging)
  // TODO: Remove this in production or make it configurable
  try {
    const { getDatabase } = require('../db');
    const db = getDatabase();
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId);
    if (user && user.is_admin === 1) {
      logger.debug('Admin bypass for course access', { userId, url: req.originalUrl });
      return next();
    }
  } catch (error) {
    logger.error('Error checking admin status for course bypass', error);
    // Continue with normal check if admin check fails
  }

  try {
    // Get all orders for the user
    const orders = orderRepository.findByUserId(userId, 1000, 0);
    
    logger.info('Checking course access for user', {
      userId,
      orderCount: orders.length,
      url: req.originalUrl
    });
    
    // Extract all product IDs from orders
    const productIds = new Set();
    orders.forEach(order => {
      if (order.items) {
        // Items might already be parsed (from repository) or still be a string
        let items = order.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch (error) {
            logger.warn('Failed to parse order items', { orderId: order.id, error: error.message });
            return;
          }
        }
        
        if (Array.isArray(items)) {
          items.forEach(item => {
            // Handle both item.id and item.productId (in case of different structures)
            const productId = item.id || item.productId;
            if (productId) {
              productIds.add(productId);
              logger.debug('Found product in order', {
                orderId: order.id,
                orderNumber: order.order_number,
                productId,
                productName: item.name
              });
            } else {
              logger.warn('Order item missing product ID', {
                orderId: order.id,
                item: item
              });
            }
          });
        } else {
          logger.warn('Order items is not an array', {
            orderId: order.id,
            itemsType: typeof items,
            items: items
          });
        }
      } else {
        logger.warn('Order has no items', { orderId: order.id });
      }
    });

    // Check if any purchased product is a course
    let hasCourse = false;
    
    // If no products purchased, deny access
    if (productIds.size === 0) {
      logger.warn('Course access denied - no products purchased', {
        userId,
        url: req.originalUrl
      });
      return res.redirect('/product?message=course_required');
    }
    
    logger.debug('Checking course access', {
      userId,
      productIds: Array.from(productIds),
      productCount: productIds.size
    });
    
    for (const productId of productIds) {
      const product = productRepository.findById(productId);
      if (product) {
        // SQLite stores booleans as integers (0 or 1), handle all cases
        // Convert to number first to handle string "1" or "0"
        const isCourseValue = Number(product.is_course);
        const isCourse = isCourseValue === 1 || product.is_course === true;
        
        logger.debug('Checking product', {
          productId,
          productName: product.name,
          is_course: product.is_course,
          isCourseValue,
          isCourse,
          type: typeof product.is_course
        });
        
        if (isCourse) {
          hasCourse = true;
          logger.info('Course access granted - found course product', {
            userId,
            productId,
            productName: product.name,
            is_course: product.is_course
          });
          break;
        }
      } else {
        logger.warn('Product not found when checking course access', { 
          productId, 
          userId,
          allProductIds: Array.from(productIds)
        });
      }
    }

    if (hasCourse) {
      // User has purchased a course - allow access
      logger.info('Course access granted', { 
        userId, 
        url: req.originalUrl,
        productIds: Array.from(productIds)
      });
      // Store course access in session for client-side use
      req.session.hasCourseAccess = true;
      return next();
    } else {
      // User hasn't purchased a course - redirect to product page
      logger.warn('Course access denied - no course purchase', {
        userId,
        url: req.originalUrl,
        productIds: Array.from(productIds),
        checkedProducts: productIds.size,
        ordersChecked: orders.length
      });
      return res.redirect('/product?message=course_required');
    }
  } catch (error) {
    logger.error('Error checking course access', {
      error: error.message,
      userId,
      url: req.originalUrl
    });
    // On error, deny access to be safe
    return res.redirect('/product?message=course_required');
  }
}

module.exports = requireCourseAccess;

