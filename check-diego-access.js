/**
 * Script to check if user "diego" has access to prompt studio
 * Checks if they have purchased any course products
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = process.env.DB_PATH || path.join(__dirname, 'prompts.db');

console.log(`Checking access for user "diego"...\n`);
console.log(`Using database: ${dbPath}\n`);

const db = new Database(dbPath);

try {
  // Find user "diego"
  const user = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get('diego', 'diego');
  
  if (!user) {
    console.log('❌ User "diego" not found in database');
    process.exit(1);
  }
  
  console.log(`✓ Found user: ${user.username} (ID: ${user.id}, Email: ${user.email})\n`);
  
  // Get all orders for this user
  const orders = db.prepare(`
    SELECT id, order_number, items, created_at, status
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(user.id);
  
  console.log(`Found ${orders.length} order(s) for this user\n`);
  
  if (orders.length === 0) {
    console.log('❌ User has no orders - NO ACCESS to prompt studio');
    process.exit(0);
  }
  
  // Extract all product IDs from orders
  const productIds = new Set();
  const orderDetails = [];
  
  orders.forEach(order => {
    try {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.id) {
            productIds.add(item.id);
            orderDetails.push({
              orderNumber: order.order_number,
              orderDate: order.created_at,
              productId: item.id,
              productName: item.name || 'Unknown',
              quantity: item.quantity || 1
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error parsing items for order ${order.order_number}:`, error.message);
    }
  });
  
  console.log(`Products purchased: ${productIds.size} unique product(s)\n`);
  console.log('Order details:');
  orderDetails.forEach(detail => {
    console.log(`  - Order ${detail.orderNumber} (${detail.orderDate}): Product ID ${detail.productId} - ${detail.productName} (Qty: ${detail.quantity})`);
  });
  console.log('');
  
  // Check each product to see if it's a course
  let hasCourse = false;
  const courseProducts = [];
  
  for (const productId of productIds) {
    const product = db.prepare('SELECT id, name, is_course, is_active FROM products WHERE id = ?').get(productId);
    
    if (product) {
      const isCourse = Number(product.is_course) === 1 || product.is_course === true;
      console.log(`Product ID ${productId}: ${product.name}`);
      console.log(`  - is_course: ${product.is_course} (type: ${typeof product.is_course})`);
      console.log(`  - isCourse (computed): ${isCourse}`);
      console.log(`  - is_active: ${product.is_active}`);
      
      if (isCourse) {
        hasCourse = true;
        courseProducts.push({
          id: product.id,
          name: product.name,
          is_course: product.is_course
        });
        console.log(`  ✓ THIS IS A COURSE PRODUCT`);
      }
      console.log('');
    } else {
      console.log(`⚠️  Product ID ${productId} not found in products table\n`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (hasCourse) {
    console.log('✅ ACCESS GRANTED');
    console.log(`User "diego" has purchased ${courseProducts.length} course product(s):`);
    courseProducts.forEach(cp => {
      console.log(`  - ${cp.name} (ID: ${cp.id})`);
    });
  } else {
    console.log('❌ NO ACCESS');
    console.log('User "diego" has NOT purchased any course products.');
    console.log('They need to purchase a product with is_course = 1 to access prompt studio.');
  }
  console.log('='.repeat(60));
  
} catch (error) {
  console.error('Error checking access:', error);
  process.exit(1);
} finally {
  db.close();
}

