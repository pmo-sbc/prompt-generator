/**
 * Migration: Add products and discount_codes tables
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Try to find the database file
let dbPath = path.join(__dirname, 'prompts.db');
if (!fs.existsSync(dbPath)) {
  dbPath = path.join(__dirname, 'database.sqlite');
}

if (!fs.existsSync(dbPath)) {
  console.error('Error: Database file not found.');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('Starting migration: Add products and discount_codes tables...\n');

try {
  // Create products table
  const productsTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='products'
  `).get();

  if (productsTableExists) {
    console.log('✓ Products table already exists');
  } else {
    db.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
    `);
    console.log('✓ Created products table');
    
    // Insert default product
    db.prepare(`
      INSERT INTO products (name, price, description, is_active)
      VALUES (?, ?, ?, ?)
    `).run('Product 1', 1000.00, 'Default product', 1);
    console.log('✓ Inserted default product');
  }

  // Create discount_codes table
  const discountCodesTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='discount_codes'
  `).get();

  if (discountCodesTableExists) {
    console.log('✓ Discount codes table already exists');
  } else {
    db.exec(`
      CREATE TABLE discount_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount_percentage REAL NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
      CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON discount_codes(is_active);
    `);
    console.log('✓ Created discount_codes table');
    
    // Insert default discount code
    db.prepare(`
      INSERT INTO discount_codes (code, discount_percentage, is_active)
      VALUES (?, ?, ?)
    `).run('TXRBA.2025', 100.00, 1);
    console.log('✓ Inserted default discount code');
  }

  // Add discount_code_id to orders table if it doesn't exist
  const ordersInfo = db.prepare("PRAGMA table_info(orders)").all();
  const hasDiscountCodeId = ordersInfo.some(col => col.name === 'discount_code_id');

  if (!hasDiscountCodeId) {
    db.exec(`
      ALTER TABLE orders ADD COLUMN discount_code_id INTEGER REFERENCES discount_codes(id);
      CREATE INDEX IF NOT EXISTS idx_orders_discount_code_id ON orders(discount_code_id);
    `);
    console.log('✓ Added discount_code_id column to orders table');
  } else {
    console.log('✓ discount_code_id column already exists in orders table');
  }

  console.log('\nMigration completed successfully!');
  
  // Show table structures
  console.log('\nProducts table structure:');
  const productsInfo = db.prepare("PRAGMA table_info(products)").all();
  productsInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  console.log('\nDiscount codes table structure:');
  const discountCodesInfo = db.prepare("PRAGMA table_info(discount_codes)").all();
  discountCodesInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

