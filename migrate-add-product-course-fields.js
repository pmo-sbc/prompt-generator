/**
 * Migration: Add course fields to products table
 * Adds is_course, course_date, and course_zoom_link columns
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

console.log(`Using database: ${dbPath}\n`);
const db = new Database(dbPath);

console.log('Starting migration: Add course fields to products table...\n');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  const hasIsCourse = tableInfo.some(col => col.name === 'is_course');
  const hasCourseDate = tableInfo.some(col => col.name === 'course_date');
  const hasCourseZoomLink = tableInfo.some(col => col.name === 'course_zoom_link');

  if (hasIsCourse && hasCourseDate && hasCourseZoomLink) {
    console.log('✓ Course fields already exist in products table');
  } else {
    // Add is_course column if it doesn't exist
    if (!hasIsCourse) {
      db.exec(`
        ALTER TABLE products 
        ADD COLUMN is_course BOOLEAN DEFAULT 0
      `);
      console.log('✓ Added is_course column');
    }

    // Add course_date column if it doesn't exist
    if (!hasCourseDate) {
      db.exec(`
        ALTER TABLE products 
        ADD COLUMN course_date DATETIME
      `);
      console.log('✓ Added course_date column');
    }

    // Add course_zoom_link column if it doesn't exist
    if (!hasCourseZoomLink) {
      db.exec(`
        ALTER TABLE products 
        ADD COLUMN course_zoom_link TEXT
      `);
      console.log('✓ Added course_zoom_link column');
    }
  }

  console.log('\nMigration completed successfully!');
  
  // Show updated table structure
  console.log('\nProducts table structure:');
  const updatedTableInfo = db.prepare("PRAGMA table_info(products)").all();
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

