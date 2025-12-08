/**
 * Migration: Add new fields to communities table
 * Adds ilec, clec, serving_company_name, and technologies fields
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

console.log('Starting migration: Add new fields to communities table...\n');

try {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(communities)").all();
  const existingColumns = tableInfo.map(col => col.name);

  let addedCount = 0;

  // Add ilec column if it doesn't exist
  if (!existingColumns.includes('ilec')) {
    db.prepare('ALTER TABLE communities ADD COLUMN ilec BOOLEAN DEFAULT 0').run();
    console.log('✓ Added ilec column');
    addedCount++;
  } else {
    console.log('- ilec column already exists');
  }

  // Add clec column if it doesn't exist
  if (!existingColumns.includes('clec')) {
    db.prepare('ALTER TABLE communities ADD COLUMN clec BOOLEAN DEFAULT 0').run();
    console.log('✓ Added clec column');
    addedCount++;
  } else {
    console.log('- clec column already exists');
  }

  // Add serving_company_name column if it doesn't exist
  if (!existingColumns.includes('serving_company_name')) {
    db.prepare('ALTER TABLE communities ADD COLUMN serving_company_name TEXT').run();
    console.log('✓ Added serving_company_name column');
    addedCount++;
  } else {
    console.log('- serving_company_name column already exists');
  }

  // Add technologies column if it doesn't exist
  if (!existingColumns.includes('technologies')) {
    db.prepare('ALTER TABLE communities ADD COLUMN technologies JSON').run();
    console.log('✓ Added technologies column');
    addedCount++;
  } else {
    console.log('- technologies column already exists');
  }

  if (addedCount === 0) {
    console.log('\n✓ All columns already exist. No migration needed.');
  } else {
    console.log(`\n✓ Migration completed! Added ${addedCount} new column(s).`);
  }

  // Show updated table structure
  console.log('\nUpdated communities table structure:');
  const updatedTableInfo = db.prepare("PRAGMA table_info(communities)").all();
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

