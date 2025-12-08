/**
 * Migration: Add license_type to service_packages table
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'prompts.db');

console.log('Starting migration: Add license_type to service_packages...');

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
    console.log('service_packages table does not exist. Skipping migration.');
    db.close();
    process.exit(0);
  }
  
  // Check if license_type column already exists
  const columnCheck = db.prepare(`
    PRAGMA table_info(service_packages)
  `).all();
  
  const hasLicenseType = columnCheck.some(col => col.name === 'license_type');
  
  if (hasLicenseType) {
    console.log('✅ Migration already applied: license_type column already exists');
    db.close();
    process.exit(0);
  }
  
  // Add license_type column
  console.log('Adding license_type column...');
  db.exec(`
    ALTER TABLE service_packages ADD COLUMN license_type TEXT;
  `);
  
  console.log('✅ Migration complete: Added license_type column to service_packages');
  
  db.close();
  process.exit(0);
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

