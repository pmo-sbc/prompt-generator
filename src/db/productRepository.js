/**
 * Product Repository
 * Data access layer for product operations
 */

const { getDatabaseWrapper } = require('./index');
const logger = require('../utils/logger');

class ProductRepository {
  /**
   * Get all products
   */
  async findAll(includeInactive = false) {
    const db = getDatabaseWrapper();
    const query = includeInactive
      ? 'SELECT * FROM products ORDER BY created_at DESC'
      : 'SELECT * FROM products WHERE is_active = TRUE ORDER BY created_at DESC';

    try {
      logger.db('SELECT', 'products', { includeInactive });
      const products = await db.prepare(query).all();
      // Convert numeric fields from PostgreSQL strings to numbers
      return products.map(product => ({
        ...product,
        price: product.price != null ? parseFloat(product.price) : null,
        token_quantity: product.token_quantity != null ? parseInt(product.token_quantity, 10) : 0
      }));
    } catch (error) {
      logger.error('Error finding products', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async findById(id) {
    const db = getDatabaseWrapper();
    const query = 'SELECT * FROM products WHERE id = $1';

    try {
      logger.db('SELECT', 'products', { id });
      const product = await db.prepare(query).get(id);
      if (!product) return null;
      // Convert numeric fields from PostgreSQL strings to numbers
      return {
        ...product,
        price: product.price != null ? parseFloat(product.price) : null,
        token_quantity: product.token_quantity != null ? parseInt(product.token_quantity, 10) : 0
      };
    } catch (error) {
      logger.error('Error finding product by ID', error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async create(name, price, description = null, is_active = true, provides_tokens = false, token_quantity = 0, is_course = false, course_date = null, course_zoom_link = null) {
    const db = getDatabaseWrapper();
    const query = `
      INSERT INTO products (name, price, description, is_active, provides_tokens, token_quantity, is_course, course_date, course_zoom_link, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id
    `;

    try {
      logger.db('INSERT', 'products', { name, price, provides_tokens, token_quantity, is_course });
      const result = await db.prepare(query).get(
        name, 
        price, 
        description, 
        is_active, 
        provides_tokens, 
        token_quantity || 0,
        is_course,
        course_date || null,
        course_zoom_link || null
      );
      return {
        id: result.id,
        name,
        price,
        description,
        is_active,
        provides_tokens,
        token_quantity: token_quantity || 0,
        is_course,
        course_date: course_date || null,
        course_zoom_link: course_zoom_link || null
      };
    } catch (error) {
      logger.error('Error creating product', error);
      throw error;
    }
  }

  /**
   * Update a product
   */
  async update(id, { name, price, description, is_active, provides_tokens, token_quantity, is_course, course_date, course_zoom_link }) {
    const db = getDatabaseWrapper();
    const query = `
      UPDATE products
      SET name = $1, price = $2, description = $3, is_active = $4, provides_tokens = $5, token_quantity = $6, is_course = $7, course_date = $8, course_zoom_link = $9, updated_at = NOW()
      WHERE id = $10
    `;

    try {
      logger.db('UPDATE', 'products', { id, name, price, provides_tokens, token_quantity, is_course });
      const result = await db.prepare(query).run(
        name, 
        price, 
        description, 
        is_active, 
        provides_tokens, 
        token_quantity || 0,
        is_course,
        course_date || null,
        course_zoom_link || null,
        id
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating product', error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async delete(id) {
    const db = getDatabaseWrapper();
    const query = 'DELETE FROM products WHERE id = $1';

    try {
      logger.db('DELETE', 'products', { id });
      const result = await db.prepare(query).run(id);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting product', error);
      throw error;
    }
  }

  /**
   * Get purchase count for a product
   */
  async getPurchaseCount(productId) {
    const db = getDatabaseWrapper();
    
    try {
      logger.db('SELECT', 'products', { productId, action: 'purchase_count' });
      
      // Get product name for matching
      const product = await db.prepare('SELECT name FROM products WHERE id = $1').get(productId);
      if (!product) {
        return 0;
      }
      
      // Get all completed orders
      const allOrders = await db.prepare('SELECT items FROM orders WHERE status = $1').all('completed');
      let count = 0;
      
      allOrders.forEach(order => {
        try {
          // PostgreSQL JSONB returns as object, not string
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          items.forEach(item => {
            // Match by product ID or product name
            if (item.id === productId || item.name === product.name) {
              count += (item.quantity || 1);
            }
          });
        } catch (e) {
          // Skip invalid JSON
          logger.warn('Error parsing order items JSON', { error: e.message });
        }
      });
      
      return count;
    } catch (error) {
      logger.error('Error getting purchase count', error);
      return 0;
    }
  }
}

module.exports = new ProductRepository();
