/**
 * Migration: Add communities table
 * Creates the communities table for storing communities within companies
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');

console.log(`Migrating database: ${DB_PATH}\n`);

const db = new Database(DB_PATH);

console.log('Starting migration: Add communities table...\n');

try {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Check if table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='communities'
  `).get();

  if (tableExists) {
    console.log('✓ Communities table already exists, skipping creation');
  } else {
    // Create communities table
    db.exec(`
      CREATE TABLE communities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_communities_company_id ON communities(company_id);
    `);

    console.log('✓ Created communities table');
    console.log('✓ Created index on company_id');
  }

  console.log('\nMigration completed successfully!');
  
  // Show table structure
  console.log('\nCommunities table structure:');
  const tableInfo = db.prepare("PRAGMA table_info(communities)").all();
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

