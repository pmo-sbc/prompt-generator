/**
 * Test the order processing endpoint
 */

const Database = require('better-sqlite3');
const db = new Database('prompts.db');

// Get diego user
const diego = db.prepare('SELECT id FROM users WHERE username = ?').get('diego');

if (!diego) {
  console.error('User diego not found');
  db.close();
  process.exit(1);
}

console.log('Testing order data structure...\n');

// Simulate the data structure that would come from checkout
const testOrderData = {
  customer: {
    firstName: 'Diego',
    lastName: 'Rivera',
    email: 'diego.rivera@sbc-servicesinc.com',
    phone: '1234567890',
    address: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zipCode: '12345',
    country: 'US',
    notes: ''
  },
  order: {
    items: [
      { name: 'Product 1', price: 1000, quantity: 1 }
    ],
    subtotal: 1000,
    discount: 0,
    total: 1000
  },
  payment: {
    method: 'card'
  }
};

// Test the orderRepository.create function
const orderRepository = require('./src/db/orderRepository');

try {
  console.log('Attempting to create order with orderRepository...\n');
  const result = orderRepository.create(diego.id, testOrderData);
  console.log('✓ Order created successfully!');
  console.log('  Order ID:', result.id);
  console.log('  Order Number:', result.orderNumber);
  console.log('  User ID:', result.userId);
  
  // Verify it was saved
  const saved = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.id);
  console.log('\n✓ Verified in database:');
  console.log('  Order Number:', saved.order_number);
  console.log('  Total:', saved.total);
  console.log('  Status:', saved.status);
  
} catch (error) {
  console.error('✗ Error creating order:');
  console.error('  Message:', error.message);
  console.error('  Stack:', error.stack);
}

db.close();

