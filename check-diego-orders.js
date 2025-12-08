/**
 * Check orders for user diego
 */

const Database = require('better-sqlite3');
const db = new Database('prompts.db');

console.log('Checking database for user "diego"...\n');

// Find diego user
const diego = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email LIKE ?').get('diego', '%diego%');

if (!diego) {
  console.log('❌ User "diego" not found in database');
  db.close();
  process.exit(1);
}

console.log('✓ Found user:');
console.log(`  ID: ${diego.id}`);
console.log(`  Username: ${diego.username}`);
console.log(`  Email: ${diego.email}\n`);

// Get all orders for diego
const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(diego.id);

console.log(`Total orders found: ${orders.length}\n`);

if (orders.length === 0) {
  console.log('❌ No orders found for user diego');
} else {
  console.log('Orders:');
  orders.forEach((order, index) => {
    console.log(`\n--- Order ${index + 1} ---`);
    console.log(`  ID: ${order.id}`);
    console.log(`  Order Number: ${order.order_number}`);
    console.log(`  Customer Email: ${order.customer_email}`);
    console.log(`  Subtotal: $${order.subtotal}`);
    console.log(`  Discount: $${order.discount || 0}`);
    console.log(`  Total: $${order.total}`);
    console.log(`  Payment Method: ${order.payment_method || 'N/A'}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Created: ${order.created_at}`);
    console.log(`  Items (JSON): ${order.items}`);
    
    // Try to parse items
    try {
      const items = JSON.parse(order.items);
      console.log(`  Items (parsed):`, JSON.stringify(items, null, 2));
    } catch (e) {
      console.log(`  Items (parse error): ${e.message}`);
    }
  });
}

// Also check all orders in database
console.log('\n\n--- All Orders in Database ---');
const allOrders = db.prepare('SELECT id, user_id, order_number, total, created_at FROM orders ORDER BY created_at DESC').all();
console.log(`Total orders in database: ${allOrders.length}`);
allOrders.forEach(order => {
  console.log(`  Order #${order.order_number} - User ID: ${order.user_id}, Total: $${order.total}, Date: ${order.created_at}`);
});

db.close();

