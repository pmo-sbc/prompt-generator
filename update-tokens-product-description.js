/**
 * Update tokens product description
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

console.log('Updating tokens product description...\n');

try {
  const result = db.prepare(`
    UPDATE products 
    SET description = '100 tokens - Use tokens for premium features and AI prompts'
    WHERE name = 'Tokens'
  `).run();

  if (result.changes > 0) {
    console.log('✓ Updated tokens product description');
  } else {
    console.log('⚠ Tokens product not found');
  }

  console.log('\nUpdate completed successfully!');
  
} catch (error) {
  console.error('Update failed:', error);
  process.exit(1);
} finally {
  db.close();
}

