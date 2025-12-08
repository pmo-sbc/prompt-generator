/**
 * Check and fix orders table
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
  dbPath = path.join(__dirname, 'database.db');
}

if (!fs.existsSync(dbPath)) {
  console.error('Error: Database file not found.');
  process.exit(1);
}

console.log(`Using database: ${dbPath}\n`);

const db = new Database(dbPath);

// Check if orders table exists
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='orders'
`).get();

if (!tableExists) {
  console.log('Orders table does not exist. Creating it...\n');
  
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
  
  console.log('✓ Orders table created successfully!\n');
} else {
  console.log('✓ Orders table already exists.\n');
}

// Check for existing orders
const orders = db.prepare(`
  SELECT id, user_id, order_number, total, created_at 
  FROM orders 
  ORDER BY created_at DESC 
  LIMIT 10
`).all();

console.log(`Found ${orders.length} order(s):\n`);
if (orders.length > 0) {
  orders.forEach(order => {
    console.log(`  - Order #${order.order_number} (User ID: ${order.user_id}, Total: $${order.total.toFixed(2)}, Date: ${order.created_at})`);
  });
} else {
  console.log('  No orders found in database.');
}

// Check user "diego"
const diegoUser = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email LIKE ?').get('diego', '%diego%');
if (diegoUser) {
  console.log(`\nUser "diego" found: ID ${diegoUser.id}, Email: ${diegoUser.email}`);
  const diegoOrders = db.prepare('SELECT * FROM orders WHERE user_id = ?').all(diegoUser.id);
  console.log(`Orders for diego: ${diegoOrders.length}`);
  if (diegoOrders.length > 0) {
    diegoOrders.forEach(order => {
      console.log(`  - Order #${order.order_number}, Total: $${order.total}, Date: ${order.created_at}`);
    });
  }
}

db.close();

