/**
 * Migration: Add technology_type to service_packages table
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'prompts.db');

console.log('Starting migration: Add technology_type to service_packages...');

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
  
  // Check if technology_type column already exists
  const columnCheck = db.prepare(`
    PRAGMA table_info(service_packages)
  `).all();
  
  const hasTechnologyType = columnCheck.some(col => col.name === 'technology_type');
  
  if (hasTechnologyType) {
    console.log('✅ Migration already applied: technology_type column already exists');
    db.close();
    process.exit(0);
  }
  
  // Add technology_type column
  console.log('Adding technology_type column...');
  db.exec(`
    ALTER TABLE service_packages ADD COLUMN technology_type TEXT;
  `);
  
  console.log('✅ Migration complete: Added technology_type column to service_packages');
  
  db.close();
  process.exit(0);
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

