/**
 * Migration: Add orders table
 * Creates a table to store order/transaction information
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
  console.error('Error: Database file not found. Please ensure the server has been started at least once to initialize the database.');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('Starting migration: Add orders table...\n');

try {
  // Check if table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='orders'
  `).get();

  if (tableExists) {
    console.log('✓ Orders table already exists, skipping creation');
  } else {
    // Create orders table
    db.exec(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        customer_first_name TEXT,
        customer_last_name TEXT,
        customer_email TEXT NOT NULL,
        customer_phone TEXT,
        customer_address TEXT,
        customer_city TEXT,
        customer_state TEXT,
        customer_zip_code TEXT,
        customer_country TEXT,
        items JSON NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `);

    console.log('✓ Created orders table');
    console.log('✓ Created indexes');
  }

  console.log('\nMigration completed successfully!');
  
  // Show table structure
  console.log('\nOrders table structure:');
  const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

