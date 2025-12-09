/**
 * Database Connection and Initialization (PostgreSQL)
 */

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

let pool;

/**
 * Initialize database connection pool and create tables
 */
async function initializeDatabase() {
  try {
    // Create connection pool
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: config.database.max,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
    });

    // Test connection
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database connection established');
    } finally {
      client.release();
    }

    // Enable foreign keys (PostgreSQL has them enabled by default, but we'll ensure it)
    await pool.query('SET session_replication_role = DEFAULT');

    // Create tables
    await createTables();

    logger.info(`Database initialized successfully: ${config.database.database}@${config.database.host}:${config.database.port}`);

    return pool;
  } catch (error) {
    logger.error('Failed to initialize database', error);
    throw error;
  }
}

/**
 * Create database tables if they don't exist
 */
async function createTables() {
  const schema = `
    -- Enable UUID extension if needed (for future use)
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT,
      verification_token_expires TIMESTAMP,
      password_reset_token TEXT,
      password_reset_token_expires TIMESTAMP,
      is_admin BOOLEAN DEFAULT FALSE,
      is_manager BOOLEAN DEFAULT FALSE,
      tokens INTEGER DEFAULT 100,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      zip_code VARCHAR(20),
      country VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Add is_manager column if it doesn't exist (for existing databases)
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_manager'
      ) THEN
        ALTER TABLE users ADD COLUMN is_manager BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#3498db',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_prompts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      template_name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      prompt_text TEXT NOT NULL,
      inputs JSONB,
      project_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS usage_stats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      template_name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      subcategory VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      inputs JSONB NOT NULL,
      is_premium BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_saved_templates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES templates (id) ON DELETE CASCADE,
      UNIQUE(user_id, template_id)
    );

    CREATE TABLE IF NOT EXISTS shared_prompts (
      id SERIAL PRIMARY KEY,
      share_token VARCHAR(255) UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      template_name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      prompt_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      views INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action VARCHAR(255) NOT NULL,
      resource_type VARCHAR(255),
      resource_id INTEGER,
      details JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      provides_tokens BOOLEAN DEFAULT FALSE,
      token_quantity INTEGER DEFAULT 0,
      is_course BOOLEAN DEFAULT FALSE,
      course_date TIMESTAMP,
      course_zoom_link TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS discount_codes (
      id SERIAL PRIMARY KEY,
      code VARCHAR(255) UNIQUE NOT NULL,
      discount_percentage DECIMAL(5, 2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      usage_count INTEGER DEFAULT 0,
      product_ids TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      order_number VARCHAR(255) UNIQUE NOT NULL,
      customer_first_name VARCHAR(255),
      customer_last_name VARCHAR(255),
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50),
      customer_address TEXT,
      customer_city VARCHAR(100),
      customer_state VARCHAR(100),
      customer_zip_code VARCHAR(20),
      customer_country VARCHAR(100),
      items JSONB NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL,
      discount DECIMAL(10, 2) DEFAULT 0,
      total DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50),
      discount_code_id INTEGER,
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (discount_code_id) REFERENCES discount_codes (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      legal_name VARCHAR(255),
      marketing_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS communities (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      ilec BOOLEAN DEFAULT FALSE,
      clec BOOLEAN DEFAULT FALSE,
      serving_company_name VARCHAR(255),
      technologies JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_packages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      technology_type VARCHAR(255),
      license_type VARCHAR(255),
      download_speed VARCHAR(50),
      upload_speed VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'pending',
      reviewed_at TIMESTAMP,
      reviewed_by INTEGER,
      review_notes TEXT,
      FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(255) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
    );

    -- Insert default settings if not exists
    INSERT INTO settings (key, value, description) 
    VALUES ('user_approval_enabled', 'false', 'Enable/disable user approval mode for new signups')
    ON CONFLICT (key) DO NOTHING;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_saved_prompts_user_id ON saved_prompts(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_prompts_project_id ON saved_prompts(project_id);
    CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_stats_category ON usage_stats(category);
    CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
    CREATE INDEX IF NOT EXISTS idx_templates_subcategory ON templates(subcategory);
    CREATE INDEX IF NOT EXISTS idx_user_saved_templates_user_id ON user_saved_templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_shared_prompts_token ON shared_prompts(share_token);
    CREATE INDEX IF NOT EXISTS idx_shared_prompts_user_id ON shared_prompts(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_discount_code_id ON orders(discount_code_id);
    CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
    CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON discount_codes(is_active);
    CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
    CREATE INDEX IF NOT EXISTS idx_communities_company_id ON communities(company_id);
    CREATE INDEX IF NOT EXISTS idx_service_packages_user_id ON service_packages(user_id);
    CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);
    CREATE INDEX IF NOT EXISTS idx_pending_users_created_at ON pending_users(created_at);
    CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
  `;

  try {
    await pool.query(schema);
    logger.debug('Database tables created/verified');
  } catch (error) {
    logger.error('Error creating tables', error);
    throw error;
  }
}

/**
 * Get database pool instance
 */
function getDatabase() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Database query helper - provides similar interface to better-sqlite3
 * This wrapper makes it easier to migrate from SQLite syntax
 */
class DatabaseWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Prepare a query (returns a PreparedStatement-like object)
   */
  prepare(query) {
    return new PreparedStatement(this.pool, query);
  }

  /**
   * Execute a raw query (for migrations, etc.)
   */
  async query(text, params) {
    return await this.pool.query(text, params);
  }
}

/**
 * PreparedStatement-like wrapper for PostgreSQL
 */
class PreparedStatement {
  constructor(pool, query) {
    this.pool = pool;
    this.query = query;
  }

  /**
   * Execute query and return first row (like .get() in better-sqlite3)
   */
  async get(...params) {
    try {
      const result = await this.pool.query(this.query, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Database query error (get)', { query: this.query, error });
      throw error;
    }
  }

  /**
   * Execute query and return all rows (like .all() in better-sqlite3)
   */
  async all(...params) {
    try {
      const result = await this.pool.query(this.query, params);
      // Ensure we always return an array
      if (!result || !result.rows) {
        logger.warn('Database query result missing rows property', {
          query: this.query,
          result: result
        });
        return [];
      }
      // PostgreSQL result.rows should always be an array, but be defensive
      return Array.isArray(result.rows) ? result.rows : [];
    } catch (error) {
      logger.error('Database query error (all)', { query: this.query, error });
      throw error;
    }
  }

  /**
   * Execute query and return result info (like .run() in better-sqlite3)
   */
  async run(...params) {
    try {
      const result = await this.pool.query(this.query, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0]?.id || null
      };
    } catch (error) {
      logger.error('Database query error (run)', { query: this.query, error });
      throw error;
    }
  }
}

/**
 * Get database wrapper instance (for repositories)
 */
function getDatabaseWrapper() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return new DatabaseWrapper(pool);
}

/**
 * Close database connection pool
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('Database connection pool closed');
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  getDatabaseWrapper,
  closeDatabase
};
