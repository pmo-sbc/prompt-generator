/**
 * Migration: Add product_ids column to discount_codes table
 * This allows discount codes to be applied to specific products only
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
  console.error('Looking for:', dbPath);
  process.exit(1);
}

console.log(`Using database: ${dbPath}\n`);
const db = new Database(dbPath);

console.log('Starting migration: Add product_ids to discount_codes table...\n');

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(discount_codes)").all();
  const hasProductIds = tableInfo.some(col => col.name === 'product_ids');
  
  if (hasProductIds) {
    console.log('✓ Column product_ids already exists in discount_codes table');
  } else {
    // Add product_ids column (JSON array of product IDs)
    // If NULL or empty array, the code applies to all products
    db.exec(`
      ALTER TABLE discount_codes 
      ADD COLUMN product_ids TEXT DEFAULT NULL
    `);
    console.log('✓ Added product_ids column to discount_codes table');
  }

  console.log('\n=== Final Discount Codes Table Structure ===');
  const finalInfo = db.prepare("PRAGMA table_info(discount_codes)").all();
  finalInfo.forEach(col => {
    const defaultValue = col.dflt_value ? ` (default: ${col.dflt_value})` : '';
    console.log(`  - ${col.name} (${col.type})${defaultValue}`);
  });

  console.log('\n✓ Migration completed successfully!');
  console.log('\nNote: product_ids is a JSON array. If NULL or empty [], the discount code applies to all products.');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}

