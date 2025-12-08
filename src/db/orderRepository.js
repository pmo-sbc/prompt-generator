/**
 * Order Repository
 * Data access layer for order/transaction operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class OrderRepository {
  /**
   * Create a new order
   */
  async create(userId, orderData) {
    const db = getDatabaseWrapper();
    
    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const query = `
      INSERT INTO orders (
        user_id, order_number, customer_first_name, customer_last_name,
        customer_email, customer_phone, customer_address, customer_city,
        customer_state, customer_zip_code, customer_country,
        items, subtotal, discount, total, payment_method, discount_code_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      RETURNING id
    `;

    try {
      logger.db('INSERT', 'orders', { userId, orderNumber });
      
      const result = await db.prepare(query).get(
        userId,
        orderNumber,
        orderData.customer.firstName || null,
        orderData.customer.lastName || null,
        orderData.customer.email,
        orderData.customer.phone || null,
        orderData.customer.address || null,
        orderData.customer.city || null,
        orderData.customer.state || null,
        orderData.customer.zipCode || null,
        orderData.customer.country || null,
        JSON.stringify(orderData.order.items),
        orderData.order.subtotal,
        orderData.order.discount || 0,
        orderData.order.total,
        orderData.payment ? orderData.payment.method || null : null,
        orderData.discountCodeId || null,
        'completed'
      );

      return {
        id: result.id,
        orderNumber,
        userId
      };
    } catch (error) {
      logger.error('Error creating order', error);
      throw error;
    }
  }

  /**
   * Get all orders for a user
   */
  async findByUserId(userId, limit = 50, offset = 0) {
    const db = getDatabaseWrapper();
    const query = `
      SELECT 
        id, order_number, customer_first_name, customer_last_name,
        customer_email, customer_phone, customer_address, customer_city,
        customer_state, customer_zip_code, customer_country,
        items, subtotal, discount, total, payment_method, status, created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      logger.db('SELECT', 'orders', { userId, limit, offset });
      const orders = await db.prepare(query).all(userId, limit, offset);
      
      // Parse JSON items for each order (PostgreSQL JSONB returns as object, but handle both)
      return orders.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      }));
    } catch (error) {
      logger.error('Error finding orders by user ID', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async findById(orderId, userId = null) {
    const db = getDatabaseWrapper();
    let query, params;
    
    if (userId) {
      query = `
        SELECT 
          id, user_id, order_number, customer_first_name, customer_last_name,
          customer_email, customer_phone, customer_address, customer_city,
          customer_state, customer_zip_code, customer_country,
          items, subtotal, discount, total, payment_method, status, created_at
        FROM orders
        WHERE id = $1 AND user_id = $2
      `;
      params = [orderId, userId];
    } else {
      query = `
        SELECT 
          id, user_id, order_number, customer_first_name, customer_last_name,
          customer_email, customer_phone, customer_address, customer_city,
          customer_state, customer_zip_code, customer_country,
          items, subtotal, discount, total, payment_method, status, created_at
        FROM orders
        WHERE id = $1
      `;
      params = [orderId];
    }

    try {
      logger.db('SELECT', 'orders', { orderId, userId });
      const order = await db.prepare(query).get(...params);
      
      if (!order) {
        return null;
      }
      
      return {
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      };
    } catch (error) {
      logger.error('Error finding order by ID', error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async findByOrderNumber(orderNumber, userId = null) {
    const db = getDatabaseWrapper();
    let query, params;
    
    if (userId) {
      query = `
        SELECT 
          id, user_id, order_number, customer_first_name, customer_last_name,
          customer_email, customer_phone, customer_address, customer_city,
          customer_state, customer_zip_code, customer_country,
          items, subtotal, discount, total, payment_method, status, created_at
        FROM orders
        WHERE order_number = $1 AND user_id = $2
      `;
      params = [orderNumber, userId];
    } else {
      query = `
        SELECT 
          id, user_id, order_number, customer_first_name, customer_last_name,
          customer_email, customer_phone, customer_address, customer_city,
          customer_state, customer_zip_code, customer_country,
          items, subtotal, discount, total, payment_method, status, created_at
        FROM orders
        WHERE order_number = $1
      `;
      params = [orderNumber];
    }

    try {
      logger.db('SELECT', 'orders', { orderNumber, userId });
      const order = await db.prepare(query).get(...params);
      
      if (!order) {
        return null;
      }
      
      return {
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      };
    } catch (error) {
      logger.error('Error finding order by order number', error);
      throw error;
    }
  }

  /**
   * Get total count of orders for a user
   */
  async countByUserId(userId) {
    const db = getDatabaseWrapper();
    const query = 'SELECT COUNT(*) as count FROM orders WHERE user_id = $1';

    try {
      logger.db('SELECT', 'orders', { userId, action: 'count' });
      const result = await db.prepare(query).get(userId);
      return parseInt(result.count, 10);
    } catch (error) {
      logger.error('Error counting orders by user ID', error);
      throw error;
    }
  }

  /**
   * Delete an order by ID
   */
  async delete(orderId) {
    const db = getDatabaseWrapper();
    const query = 'DELETE FROM orders WHERE id = $1';

    try {
      logger.db('DELETE', 'orders', { orderId });
      const result = await db.prepare(query).run(orderId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting order', error);
      throw error;
    }
  }

  /**
   * Get all users with their purchased products
   * Returns a list of users with their orders and products
   */
  async getAllUsersWithPurchases() {
    const db = getDatabaseWrapper();
    
    try {
      logger.db('SELECT', 'orders', { action: 'get_all_users_with_purchases' });
      
      // Get all orders with user information
      const query = `
        SELECT 
          o.id as order_id,
          o.order_number,
          o.created_at as order_date,
          o.items,
          u.id as user_id,
          u.username,
          u.email
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE o.status = 'completed'
        ORDER BY u.username, o.created_at DESC
      `;
      
      const orders = await db.prepare(query).all();
      
      // Group orders by user
      const usersMap = new Map();
      
      orders.forEach(order => {
        const userId = order.user_id;
        
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: userId,
            username: order.username,
            email: order.email,
            purchases: []
          });
        }
        
        const user = usersMap.get(userId);
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        
        // Ensure order_date is properly formatted
        // SQLite returns dates as strings, ensure we have a valid date
        let orderDate = order.order_date;
        if (!orderDate || orderDate === null || orderDate === undefined || orderDate === '') {
          // If date is missing, log a warning but continue
          logger.warn('Order missing created_at date', { 
            orderId: order.order_id, 
            orderNumber: order.order_number,
            orderDateValue: order.order_date,
            orderDateType: typeof order.order_date
          });
          orderDate = null;
        } else {
          // Log successful date retrieval for debugging
          logger.db('SELECT', 'orders', { 
            orderId: order.order_id, 
            orderDate: orderDate,
            orderDateType: typeof orderDate
          });
        }
        
        // Add each item as a separate purchase entry
        items.forEach(item => {
          user.purchases.push({
            orderId: order.order_id,
            orderNumber: order.order_number,
            orderDate: orderDate,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity || 1,
            price: item.price || item.finalPrice || 0
          });
        });
      });
      
      // Convert map to array and sort by username
      return Array.from(usersMap.values()).sort((a, b) => 
        a.username.localeCompare(b.username)
      );
    } catch (error) {
      logger.error('Error getting all users with purchases', error);
      throw error;
    }
  }
}

module.exports = new OrderRepository();

