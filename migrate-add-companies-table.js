/**
 * Migration: Add companies table
 * Creates the companies table for storing user company profiles
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');

console.log(`Migrating database: ${DB_PATH}\n`);

const db = new Database(DB_PATH);

console.log('Starting migration: Add companies table...\n');

try {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Check if table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='companies'
  `).get();

  if (tableExists) {
    console.log('✓ Companies table already exists, skipping creation');
  } else {
    // Create companies table
    db.exec(`
      CREATE TABLE companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
    `);

    console.log('✓ Created companies table');
    console.log('✓ Created index on user_id');
  }

  console.log('\nMigration completed successfully!');
  
  // Show table structure
  console.log('\nCompanies table structure:');
  const tableInfo = db.prepare("PRAGMA table_info(companies)").all();
  if (tableInfo.length > 0) {
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
  } else {
    console.log('  Table does not exist');
  }

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

