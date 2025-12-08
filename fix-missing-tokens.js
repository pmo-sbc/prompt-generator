/**
 * Fix missing tokens for recent orders
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const userRepository = require('./src/db/userRepository');
const { initializeDatabase } = require('./src/db/index');

// Initialize database
initializeDatabase();

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

console.log('Checking for orders with Tokens product that may not have received tokens...\n');

try {
  // Get tokens product ID
  const tokensProduct = db.prepare('SELECT id FROM products WHERE name = ?').get('Tokens');
  if (!tokensProduct) {
    console.log('Tokens product not found in database.');
    process.exit(1);
  }
  const tokensProductId = tokensProduct.id;
  console.log(`Tokens product ID: ${tokensProductId}\n`);

  // Get all orders with tokens product
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  
  let fixedCount = 0;
  
  for (const order of orders) {
    try {
      const items = JSON.parse(order.items);
      const hasTokens = items.some(item => 
        item.id === tokensProductId || 
        item.name === 'Tokens' || 
        item.name.toLowerCase() === 'tokens'
      );
      
      if (hasTokens) {
        // Calculate tokens that should have been added
        let tokensToAdd = 0;
        items.forEach(item => {
          if (item.id === tokensProductId || item.name === 'Tokens' || item.name.toLowerCase() === 'tokens') {
            tokensToAdd += 100 * (item.quantity || 1);
          }
        });
        
        if (tokensToAdd > 0) {
          // Get current user tokens
          const currentTokens = userRepository.getTokens(order.user_id);
          
          // Add tokens
          const added = userRepository.addTokens(order.user_id, tokensToAdd);
          
          if (added) {
            const newTokens = userRepository.getTokens(order.user_id);
            console.log(`✓ Order #${order.order_number} (User ID: ${order.user_id})`);
            console.log(`  Tokens added: ${tokensToAdd}`);
            console.log(`  Previous balance: ${currentTokens}`);
            console.log(`  New balance: ${newTokens}`);
            console.log('');
            fixedCount++;
          } else {
            console.log(`✗ Failed to add tokens for order #${order.order_number}`);
          }
        }
      }
    } catch (e) {
      console.log(`Error processing order #${order.order_number}:`, e.message);
    }
  }
  
  console.log(`\nFixed ${fixedCount} order(s).`);
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}

