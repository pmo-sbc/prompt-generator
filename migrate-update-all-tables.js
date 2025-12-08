/**
 * Comprehensive Migration: Update all tables with missing columns
 * 
 * This script checks and adds missing columns for:
 * - Products table: provides_tokens, token_quantity, is_course, course_date, course_zoom_link
 * - Users table: first_name, last_name, phone, address, city, state, zip_code, country
 * 
 * Run this script on the production server to update the database structure.
 * Usage: node migrate-update-all-tables.js
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

console.log('Starting comprehensive migration: Update all tables with missing columns...\n');

try {
  // ===== UPDATE PRODUCTS TABLE =====
  console.log('=== Updating Products Table ===');
  const productsTableInfo = db.prepare("PRAGMA table_info(products)").all();
  const productsColumns = new Set(productsTableInfo.map(col => col.name));
  
  const productsColumnsToAdd = [
    { name: 'provides_tokens', type: 'BOOLEAN', defaultValue: 'DEFAULT 0', description: 'Indicates if product provides tokens' },
    { name: 'token_quantity', type: 'INTEGER', defaultValue: 'DEFAULT 0', description: 'Number of tokens provided per purchase' },
    { name: 'is_course', type: 'BOOLEAN', defaultValue: 'DEFAULT 0', description: 'Indicates if product is a course' },
    { name: 'course_date', type: 'DATETIME', defaultValue: '', description: 'Course date and time' },
    { name: 'course_zoom_link', type: 'TEXT', defaultValue: '', description: 'Zoom meeting link for course' }
  ];

  let productsAdded = 0;
  for (const column of productsColumnsToAdd) {
    if (!productsColumns.has(column.name)) {
      const defaultValue = column.defaultValue ? ` ${column.defaultValue}` : '';
      const sql = `ALTER TABLE products ADD COLUMN ${column.name} ${column.type}${defaultValue}`;
      console.log(`  Adding column: ${column.name}...`);
      db.exec(sql);
      console.log(`  ✓ Added ${column.name}`);
      productsAdded++;
    } else {
      console.log(`  ✓ Column ${column.name} already exists`);
    }
  }

  if (productsAdded > 0) {
    console.log(`  ✓ Successfully added ${productsAdded} column(s) to products table\n`);
  } else {
    console.log(`  ✓ All product columns already exist\n`);
  }

  // Update existing "Tokens" product if it exists
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
    console.log('  ✓ Updated existing "Tokens" product to provide 100 tokens\n');
  }

  // ===== UPDATE USERS TABLE =====
  console.log('=== Updating Users Table ===');
  const usersTableInfo = db.prepare("PRAGMA table_info(users)").all();
  const usersColumns = new Set(usersTableInfo.map(col => col.name));
  
  const usersColumnsToAdd = [
    { name: 'first_name', type: 'TEXT', description: 'Customer first name' },
    { name: 'last_name', type: 'TEXT', description: 'Customer last name' },
    { name: 'phone', type: 'TEXT', description: 'Customer phone number' },
    { name: 'address', type: 'TEXT', description: 'Customer street address' },
    { name: 'city', type: 'TEXT', description: 'Customer city' },
    { name: 'state', type: 'TEXT', description: 'Customer state/province' },
    { name: 'zip_code', type: 'TEXT', description: 'Customer zip/postal code' },
    { name: 'country', type: 'TEXT', description: 'Customer country' }
  ];

  let usersAdded = 0;
  for (const column of usersColumnsToAdd) {
    if (!usersColumns.has(column.name)) {
      const sql = `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`;
      console.log(`  Adding column: ${column.name}...`);
      db.exec(sql);
      console.log(`  ✓ Added ${column.name}`);
      usersAdded++;
    } else {
      console.log(`  ✓ Column ${column.name} already exists`);
    }
  }

  if (usersAdded > 0) {
    console.log(`  ✓ Successfully added ${usersAdded} column(s) to users table\n`);
  } else {
    console.log(`  ✓ All user columns already exist\n`);
  }

  // ===== SUMMARY =====
  console.log('=== Migration Summary ===');
  console.log(`Products table: ${productsAdded} column(s) added`);
  console.log(`Users table: ${usersAdded} column(s) added`);
  console.log(`Total: ${productsAdded + usersAdded} column(s) added\n`);

  if (productsAdded === 0 && usersAdded === 0) {
    console.log('✓ All columns already exist. Database is up to date!');
  } else {
    console.log('✓ Migration completed successfully!');
  }
  
  // Show final table structures
  console.log('\n=== Final Products Table Structure ===');
  const finalProductsInfo = db.prepare("PRAGMA table_info(products)").all();
  finalProductsInfo.forEach(col => {
    const defaultValue = col.dflt_value ? ` (default: ${col.dflt_value})` : '';
    console.log(`  - ${col.name} (${col.type})${defaultValue}`);
  });

  console.log('\n=== Final Users Table Structure ===');
  const finalUsersInfo = db.prepare("PRAGMA table_info(users)").all();
  finalUsersInfo.forEach(col => {
    const defaultValue = col.dflt_value ? ` (default: ${col.dflt_value})` : '';
    console.log(`  - ${col.name} (${col.type})${defaultValue}`);
  });

  console.log('\n✓ Database is ready for all features!');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}

