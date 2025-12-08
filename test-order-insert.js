/**
 * Test order insertion
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const db = new Database(dbPath);

// Get diego's user ID
const diegoUser = db.prepare('SELECT id FROM users WHERE username = ? OR email LIKE ?').get('diego', '%diego%');

if (!diegoUser) {
  console.error('User "diego" not found');
  db.close();
  process.exit(1);
}

console.log(`Found user diego with ID: ${diegoUser.id}\n`);

// Try to insert a test order
try {
  const orderNumber = `ORD-${Date.now()}-TEST`;
  const testOrder = {
    customer: {
      firstName: 'Diego',
      lastName: 'Rivera',
      email: 'diego.rivera@sbc-servicesinc.com',
      phone: '1234567890',
      address: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
      country: 'US'
    },
    order: {
      items: [{ name: 'Product 1', price: 1000, quantity: 1 }],
      subtotal: 1000,
      discount: 0,
      total: 1000
    },
    payment: {
      method: 'card'
    }
  };

  const query = `
    INSERT INTO orders (
      user_id, order_number, customer_first_name, customer_last_name,
      customer_email, customer_phone, customer_address, customer_city,
      customer_state, customer_zip_code, customer_country,
      items, subtotal, discount, total, payment_method, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = db.prepare(query).run(
    diegoUser.id,
    orderNumber,
    testOrder.customer.firstName,
    testOrder.customer.lastName,
    testOrder.customer.email,
    testOrder.customer.phone,
    testOrder.customer.address,
    testOrder.customer.city,
    testOrder.customer.state,
    testOrder.customer.zipCode,
    testOrder.customer.country,
    JSON.stringify(testOrder.order.items),
    testOrder.order.subtotal,
    testOrder.order.discount,
    testOrder.order.total,
    testOrder.payment.method,
    'completed'
  );

  console.log(`✓ Test order inserted successfully!`);
  console.log(`  Order ID: ${result.lastInsertRowid}`);
  console.log(`  Order Number: ${orderNumber}\n`);

  // Verify it was saved
  const savedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  console.log('Saved order:', {
    id: savedOrder.id,
    user_id: savedOrder.user_id,
    order_number: savedOrder.order_number,
    total: savedOrder.total
  });

} catch (error) {
  console.error('Error inserting test order:', error);
  console.error('Error details:', error.message);
}

db.close();

