/**
 * Migration: Remove company_id from service_packages and add user_id
 * 
 * This migration:
 * 1. Creates a new service_packages table with user_id instead of company_id
 * 2. Migrates existing data by finding the user_id from the company
 * 3. Drops the old table and renames the new one
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'prompts.db');

console.log('Starting migration: Remove company_id from service_packages...');

try {
  const db = new Database(DB_PATH);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Check if service_packages table exists
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='service_packages'
  `).get();
  
  if (!tableCheck) {
    console.log('service_packages table does not exist. Creating new table...');
    
    // Create the new table structure
    db.exec(`
      CREATE TABLE service_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        download_speed TEXT,
        upload_speed TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_service_packages_user_id ON service_packages(user_id);
    `);
    
    console.log('✅ Migration complete: Created new service_packages table with user_id');
    db.close();
    process.exit(0);
  }
  
  // Check if company_id column exists (old structure)
  const columnCheck = db.prepare(`
    PRAGMA table_info(service_packages)
  `).all();
  
  const hasCompanyId = columnCheck.some(col => col.name === 'company_id');
  const hasUserId = columnCheck.some(col => col.name === 'user_id');
  
  if (hasUserId && !hasCompanyId) {
    console.log('✅ Migration already applied: service_packages table already has user_id');
    db.close();
    process.exit(0);
  }
  
  if (!hasCompanyId) {
    console.log('⚠️  Warning: service_packages table exists but has neither company_id nor user_id');
    console.log('Creating user_id column...');
    
    // Add user_id column
    db.exec(`
      ALTER TABLE service_packages ADD COLUMN user_id INTEGER;
      
      -- Update existing rows: set user_id based on a default user or first user
      -- Note: This assumes you want to assign packages to the first user
      UPDATE service_packages 
      SET user_id = (SELECT id FROM users LIMIT 1)
      WHERE user_id IS NULL;
      
      -- Make user_id NOT NULL and add foreign key constraint
      -- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    `);
    
    // Recreate table with proper constraints
    db.exec(`
      CREATE TABLE service_packages_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        download_speed TEXT,
        upload_speed TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
      
      INSERT INTO service_packages_new (id, user_id, name, download_speed, upload_speed, created_at, updated_at)
      SELECT id, 
             COALESCE(user_id, (SELECT id FROM users LIMIT 1)) as user_id,
             name, 
             download_speed, 
             upload_speed, 
             created_at, 
             updated_at
      FROM service_packages;
      
      DROP TABLE service_packages;
      ALTER TABLE service_packages_new RENAME TO service_packages;
      
      CREATE INDEX IF NOT EXISTS idx_service_packages_user_id ON service_packages(user_id);
    `);
    
    console.log('✅ Migration complete: Added user_id to service_packages');
    db.close();
    process.exit(0);
  }
  
  // Migrate data: Copy from old table to new structure
  console.log('Migrating data from company_id to user_id...');
  
  // Step 1: Create new table structure
  db.exec(`
    CREATE TABLE service_packages_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      download_speed TEXT,
      upload_speed TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);
  
  // Step 2: Migrate data (get user_id from company)
  const migrateData = db.prepare(`
    INSERT INTO service_packages_new (id, user_id, name, download_speed, upload_speed, created_at, updated_at)
    SELECT sp.id,
           c.user_id,
           sp.name,
           sp.download_speed,
           sp.upload_speed,
           sp.created_at,
           sp.updated_at
    FROM service_packages sp
    INNER JOIN companies c ON sp.company_id = c.id
  `);
  
  const result = migrateData.run();
  console.log(`Migrated ${result.changes} service packages`);
  
  // Step 3: Drop old table and rename new one
  db.exec(`
    DROP TABLE service_packages;
    ALTER TABLE service_packages_new RENAME TO service_packages;
    
    CREATE INDEX IF NOT EXISTS idx_service_packages_user_id ON service_packages(user_id);
  `);
  
  console.log('✅ Migration complete: Removed company_id and added user_id to service_packages');
  
  db.close();
  process.exit(0);
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

