/**
 * Migration: Add customer information fields to users table
 * Adds fields for checkout/purchase data: first_name, last_name, phone, address, city, state, zip_code, country
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

const db = new Database(dbPath);

console.log('Starting migration: Add customer information fields...\n');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const existingColumns = tableInfo.map(col => col.name);

  const columnsToAdd = [
    { name: 'first_name', type: 'TEXT' },
    { name: 'last_name', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'city', type: 'TEXT' },
    { name: 'state', type: 'TEXT' },
    { name: 'zip_code', type: 'TEXT' },
    { name: 'country', type: 'TEXT' }
  ];

  let addedCount = 0;

  columnsToAdd.forEach(({ name, type }) => {
    if (!existingColumns.includes(name)) {
      try {
        db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${type}`).run();
        console.log(`✓ Added column: ${name}`);
        addedCount++;
      } catch (error) {
        console.error(`✗ Failed to add column ${name}:`, error.message);
      }
    } else {
      console.log(`- Column ${name} already exists, skipping`);
    }
  });

  console.log(`\nMigration completed! Added ${addedCount} new column(s).`);
  
  // Show updated table structure
  console.log('\nUpdated users table structure:');
  const updatedTableInfo = db.prepare("PRAGMA table_info(users)").all();
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

