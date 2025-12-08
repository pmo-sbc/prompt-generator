/**
 * Migration: Add token fields to products table
 * Adds provides_tokens and token_quantity columns to support products that grant tokens
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

console.log(`Using database: ${dbPath}\n`);
const db = new Database(dbPath);

console.log('Starting migration: Add token fields to products table...\n');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  const hasProvidesTokens = tableInfo.some(col => col.name === 'provides_tokens');
  const hasTokenQuantity = tableInfo.some(col => col.name === 'token_quantity');

  if (hasProvidesTokens && hasTokenQuantity) {
    console.log('✓ Token fields already exist in products table');
  } else {
    // Add provides_tokens column if it doesn't exist
    if (!hasProvidesTokens) {
      db.exec(`
        ALTER TABLE products 
        ADD COLUMN provides_tokens BOOLEAN DEFAULT 0
      `);
      console.log('✓ Added provides_tokens column');
    }

    // Add token_quantity column if it doesn't exist
    if (!hasTokenQuantity) {
      db.exec(`
        ALTER TABLE products 
        ADD COLUMN token_quantity INTEGER DEFAULT 0
      `);
      console.log('✓ Added token_quantity column');
    }

    // Update existing "Tokens" product if it exists
    const tokensProduct = db.prepare(`
      SELECT id FROM products 
      WHERE LOWER(name) = 'tokens'
    `).get();

    if (tokensProduct) {
      db.prepare(`
        UPDATE products 
        SET provides_tokens = 1, token_quantity = 100 
        WHERE id = ?
      `).run(tokensProduct.id);
      console.log('✓ Updated existing "Tokens" product to provide 100 tokens');
    }
  }

  console.log('\nMigration completed successfully!');
  
  // Show updated table structure
  console.log('\nProducts table structure:');
  const updatedTableInfo = db.prepare("PRAGMA table_info(products)").all();
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

