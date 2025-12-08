/**
 * Migration: Add service_packages table
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

console.log('Starting migration: Add service_packages table...\n');

try {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Check if table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='service_packages'
  `).get();

  if (tableExists) {
    console.log('✓ service_packages table already exists');
  } else {
    // Create service_packages table
    db.prepare(`
      CREATE TABLE service_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        download_speed TEXT,
        upload_speed TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
      )
    `).run();

    // Create index
    db.prepare('CREATE INDEX IF NOT EXISTS idx_service_packages_company_id ON service_packages(company_id)').run();

    console.log('✓ Created service_packages table');
    console.log('✓ Created index on company_id');
  }

  // Show table structure
  console.log('\nservice_packages table structure:');
  const tableInfo = db.prepare("PRAGMA table_info(service_packages)").all();
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  console.log('\n✓ Migration completed successfully!');

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

