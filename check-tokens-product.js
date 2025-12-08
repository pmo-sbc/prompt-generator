/**
 * Check tokens product in database
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

console.log('Checking tokens product in database...\n');

try {
  const products = db.prepare('SELECT * FROM products WHERE name LIKE ? OR name LIKE ?').all('%token%', '%Token%');
  
  console.log(`Found ${products.length} product(s) with "token" in name:\n`);
  products.forEach(product => {
    console.log(`ID: ${product.id}`);
    console.log(`Name: "${product.name}"`);
    console.log(`Price: $${product.price}`);
    console.log(`Description: ${product.description}`);
    console.log(`Active: ${product.is_active ? 'Yes' : 'No'}`);
    console.log('---\n');
  });

  // Also check recent orders to see item structure
  console.log('Recent orders with items:\n');
  const recentOrders = db.prepare(`
    SELECT id, order_number, items, created_at 
    FROM orders 
    ORDER BY created_at DESC 
    LIMIT 3
  `).all();

  recentOrders.forEach(order => {
    console.log(`Order #${order.order_number} (ID: ${order.id})`);
    try {
      const items = JSON.parse(order.items);
      console.log('Items:', JSON.stringify(items, null, 2));
    } catch (e) {
      console.log('Items (raw):', order.items);
    }
    console.log('---\n');
  });

} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}

