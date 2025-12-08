/**
 * Migration: Update products table with all new columns
 * Adds: provides_tokens, token_quantity, is_course, course_date, course_zoom_link
 * 
 * Run this script on the production server to update the database structure.
 * Usage: node migrate-update-products-table.js
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
  console.error('Looking for:', dbPath);
  process.exit(1);
}

console.log(`Using database: ${dbPath}\n`);
const db = new Database(dbPath);

console.log('Starting migration: Update products table with new columns...\n');

try {
  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  const existingColumns = new Set(tableInfo.map(col => col.name));
  
  console.log('Current columns:', Array.from(existingColumns).join(', '));
  console.log('');

  // Define all columns that need to be added
  const columnsToAdd = [
    {
      name: 'provides_tokens',
      type: 'BOOLEAN',
      defaultValue: 'DEFAULT 0',
      description: 'Indicates if product provides tokens'
    },
    {
      name: 'token_quantity',
      type: 'INTEGER',
      defaultValue: 'DEFAULT 0',
      description: 'Number of tokens provided per purchase'
    },
    {
      name: 'is_course',
      type: 'BOOLEAN',
      defaultValue: 'DEFAULT 0',
      description: 'Indicates if product is a course'
    },
    {
      name: 'course_date',
      type: 'DATETIME',
      defaultValue: '',
      description: 'Course date and time'
    },
    {
      name: 'course_zoom_link',
      type: 'TEXT',
      defaultValue: '',
      description: 'Zoom meeting link for course'
    }
  ];

  let addedCount = 0;

  // Add missing columns
  for (const column of columnsToAdd) {
    if (!existingColumns.has(column.name)) {
      const defaultValue = column.defaultValue ? ` ${column.defaultValue}` : '';
      const sql = `ALTER TABLE products ADD COLUMN ${column.name} ${column.type}${defaultValue}`;
      
      console.log(`Adding column: ${column.name}...`);
      db.exec(sql);
      console.log(`✓ Added ${column.name} (${column.type})${defaultValue ? ' ' + column.defaultValue : ''}`);
      addedCount++;
    } else {
      console.log(`✓ Column ${column.name} already exists`);
    }
  }

  if (addedCount === 0) {
    console.log('\nAll columns already exist. No changes needed.');
  } else {
    console.log(`\n✓ Successfully added ${addedCount} column(s)`);
  }

  // Update existing "Tokens" product if it exists and doesn't have token fields set
  const tokensProduct = db.prepare(`
    SELECT id, provides_tokens, token_quantity FROM products 
    WHERE LOWER(name) = 'tokens'
  `).get();

  if (tokensProduct && (!tokensProduct.provides_tokens || tokensProduct.token_quantity === 0)) {
    db.prepare(`
      UPDATE products 
      SET provides_tokens = 1, token_quantity = 100 
      WHERE id = ?
    `).run(tokensProduct.id);
    console.log('✓ Updated existing "Tokens" product to provide 100 tokens');
  }

  console.log('\nMigration completed successfully!');
  
  // Show final table structure
  console.log('\nFinal products table structure:');
  const finalTableInfo = db.prepare("PRAGMA table_info(products)").all();
  finalTableInfo.forEach(col => {
    const defaultValue = col.dflt_value ? ` (default: ${col.dflt_value})` : '';
    console.log(`  - ${col.name} (${col.type})${defaultValue}`);
  });

  console.log('\n✓ Database is ready for product management with tokens and courses!');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}

