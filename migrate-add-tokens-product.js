/**
 * Migration: Add tokens product
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

console.log('Starting migration: Add tokens product...\n');

try {
  // Check if tokens product already exists
  const existingProduct = db.prepare(`
    SELECT id FROM products WHERE name = 'Tokens'
  `).get();

  if (existingProduct) {
    console.log('✓ Tokens product already exists (ID: ' + existingProduct.id + ')');
  } else {
    // Insert tokens product
    db.prepare(`
      INSERT INTO products (name, price, description, is_active)
      VALUES (?, ?, ?, ?)
    `).run('Tokens', 80.00, 'Purchase 100 tokens to use for premium features', 1);
    console.log('✓ Created tokens product');
  }

  console.log('\nMigration completed successfully!');
  
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

