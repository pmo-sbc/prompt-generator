/**
 * Migration: Add legal_name and marketing_name fields to companies table
 */

const Database = require('better-sqlite3');
const path = require('path');

// Try to find the database file
let dbPath = path.join(__dirname, 'prompts.db');
if (!require('fs').existsSync(dbPath)) {
  dbPath = path.join(__dirname, 'database.db');
}
if (!require('fs').existsSync(dbPath)) {
  dbPath = path.join(__dirname, 'database.sqlite');
}

const DB_PATH = process.env.DATABASE_PATH || dbPath;

console.log(`Migrating database: ${DB_PATH}\n`);

const db = new Database(DB_PATH);

console.log('Starting migration: Add legal_name and marketing_name to companies table...\n');

try {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(companies)").all();
  const existingColumns = tableInfo.map(col => col.name);

  let addedCount = 0;

  // Add legal_name column if it doesn't exist
  if (!existingColumns.includes('legal_name')) {
    db.prepare('ALTER TABLE companies ADD COLUMN legal_name TEXT').run();
    console.log('✓ Added legal_name column');
    addedCount++;
  } else {
    console.log('- legal_name column already exists');
  }

  // Add marketing_name column if it doesn't exist
  if (!existingColumns.includes('marketing_name')) {
    db.prepare('ALTER TABLE companies ADD COLUMN marketing_name TEXT').run();
    console.log('✓ Added marketing_name column');
    addedCount++;
  } else {
    console.log('- marketing_name column already exists');
  }

  if (addedCount === 0) {
    console.log('\n✓ All columns already exist. No migration needed.');
  } else {
    console.log(`\n✓ Migration completed! Added ${addedCount} new column(s).`);
  }

  // Show updated table structure
  console.log('\nUpdated companies table structure:');
  const updatedTableInfo = db.prepare("PRAGMA table_info(companies)").all();
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

