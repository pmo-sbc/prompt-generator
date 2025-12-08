/**
 * Import Users from Pipe-Delimited Export
 * 
 * This script imports users from a pipe-delimited text format into the database.
 * 
 * Usage:
 *   node import-users-from-export.js
 * 
 * Or provide the data as a file:
 *   node import-users-from-export.js users.txt
 * 
 * Data format (pipe-delimited):
 * id|username|email|password|email_verified|verification_token|verification_token_expires|is_admin|tokens|created_at|password_reset_token|password_reset_token_expires|first_name|last_name|phone|address|city|state|zip_|country
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./src/config');

// User data in pipe-delimited format
const userData = `1|diego|diego.rivera@sbc-servicesinc.com|$2b$10$w21kw1AnQK2SxZXYedavHeqYiDh25uN6NoJah7EeUKBdmygVxx84.|1|||1|231|2025-10-17 16:02:33|||Diego|Rivera|5126961551|301 Main Plaza|New Braunfels|Texas|78130|US
9|ecompean|ely@elycompean.com|$2b$10$uVpeiyWFm52j.AayTaZFd.g78ObFHX.m1BQrx7tHOSoQKJolwJYBS|1|||1|93|2025-10-22 17:44:21||||||||||
10|pmo|pmo@sbc-servicesinc.com|$2b$10$eT4pl6uxD3gC6IAXwYmWve9ACPdMuy/F6KMz2Lk7tjLkWlvHIKon2|1|||0|100|2025-10-22 17:46:24||||||||||
11|Jcompean|johnnycompean@gmail.com|$2b$10$SS/bx.WUb9wuwgCkFm8F5uPfG8tydFn0OYABUlot4zVeIRvDFR3KK|1|||0|97|2025-10-29 15:26:17||||||||||
12|Cpurchis|courtney@uniquelyplannedinc.com|$2b$10$QPgji8TzzJDEElBA.C0.yOlPZrwN0D6IBMj74vOz8mrJ/8axnpDTC|1|||0|90|2025-10-29 17:31:46||||||||||
13|diego2|rivmontdiego@gmail.com|$2b$10$WB2D0CYNrgLE8k30yqwN7eLbTlfUeDQdi4HVXWebgAGJZMSB2iEz6|1|||0|100|2025-11-03 19:29:23||||||||||
14|diego3|diegoriveramontano@gmail.com|$2b$10$4kUk6D8jm0c6bJQRlO4lJ.MqTnxJ69da8TJ3AhPehMMXBlN6wkcam|0|a87cafebe23916b00a9c6df5ee5865fd8dd16870301be024ebc513c451bc0aff|2025-11-04T22:22:38.460Z|0|100|2025-11-03 22:20:05||||||||||
15|testuser|ely@elycompean.net|$2b$10$GPTZw8oDI1nLPb.Etm4Mse2CGB/1p0IoLmDleH.9D80eh/xBPZZpu|1|||0|100|2025-12-08 16:07:23||||||||||`;

// Get database path from command line or use config
const dbPath = process.argv[2] || config.database.filename;

console.log('='.repeat(60));
console.log('Import Users Script');
console.log('='.repeat(60));
console.log(`Database: ${dbPath}`);
console.log('='.repeat(60));
console.log('');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Error: Database file not found: ${dbPath}`);
  console.error('Please ensure the database is initialized first.');
  process.exit(1);
}

let db;

try {
  // Connect to database
  console.log('Connecting to database...');
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  console.log('✓ Connected to database');
  console.log('');

  // Check if users table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='users'
  `).get();

  if (!tableExists) {
    console.error('Error: "users" table not found in database.');
    console.error('Please run the application first to create the database structure.');
    process.exit(1);
  }

  // Get column information
  const columns = db.prepare('PRAGMA table_info(users)').all();
  const columnNames = columns.map(col => col.name);
  console.log(`✓ Found users table with columns: ${columnNames.join(', ')}`);
  console.log('');

  // Parse user data
  console.log('Parsing user data...');
  const lines = userData.trim().split('\n').filter(line => line.trim());
  console.log(`✓ Found ${lines.length} user record(s) to import`);
  console.log('');

  // Column mapping from pipe-delimited format
  // id|username|email|password|email_verified|verification_token|verification_token_expires|is_admin|tokens|created_at|password_reset_token|password_reset_token_expires|first_name|last_name|phone|address|city|state|zip_|country
  // Note: zip_ in export maps to zip_code in database
  const fieldMapping = [
    'id', 'username', 'email', 'password', 'email_verified',
    'verification_token', 'verification_token_expires', 'is_admin',
    'tokens', 'created_at', 'password_reset_token', 'password_reset_token_expires',
    'first_name', 'last_name', 'phone', 'address', 'city', 'state', 'zip_', 'country'
  ];
  
  // Map export field names to database column names
  const fieldToColumnMap = {
    'zip_': 'zip_code'  // Export uses zip_, database uses zip_code
  };

  console.log('Importing users...');
  console.log('-'.repeat(60));

  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each user
  for (const line of lines) {
    const fields = line.split('|');
    
    if (fields.length < fieldMapping.length) {
      console.error(`✗ Error: Invalid data format (expected ${fieldMapping.length} fields, got ${fields.length})`);
      console.error(`  Line: ${line.substring(0, 50)}...`);
      errorCount++;
      continue;
    }

    // Parse fields
    const userData = {};
    fieldMapping.forEach((fieldName, index) => {
      const value = fields[index] || '';
      // Map field name to database column name
      const columnName = fieldToColumnMap[fieldName] || fieldName;
      userData[columnName] = value === '' ? null : value;
    });

    const username = userData.username;
    const email = userData.email;

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      console.log(`⊘ Skipped: ${username} (${email}) - already exists (ID: ${existing.id})`);
      skippedCount++;
      continue;
    }

    // Prepare insert statement
    // Get columns that exist in the database (excluding id if auto-increment)
    const insertableColumns = columnNames.filter(col => col !== 'id');
    const values = [];
    const placeholders = [];
    const insertCols = [];

    for (const col of insertableColumns) {
      insertCols.push(col);
      placeholders.push('?');
      
      // Map the field if it exists in userData, otherwise use null/default
      if (userData.hasOwnProperty(col)) {
        let value = userData[col];
        
        // Handle boolean fields
        if (col === 'email_verified' || col === 'is_admin') {
          value = value === '1' || value === 1 || value === true ? 1 : 0;
        }
        
        // Handle integer fields
        if (col === 'tokens') {
          value = value ? parseInt(value) || 100 : 100;
        }
        
        // Handle datetime fields - normalize format
        if (col.includes('_expires') || col === 'created_at') {
          if (value && value !== 'null' && value !== '') {
            // Try to parse and normalize the date
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                value = date.toISOString().replace('T', ' ').substring(0, 19);
              } else {
                value = null;
              }
            } catch (e) {
              value = null;
            }
          } else {
            value = null;
          }
        }
        
        // Convert empty strings to null
        if (value === '' || value === 'null') {
          value = null;
        }
        
        values.push(value);
      } else {
        // Column doesn't exist in import data, use default
        if (col === 'email_verified') values.push(0);
        else if (col === 'is_admin') values.push(0);
        else if (col === 'tokens') values.push(100);
        else if (col === 'created_at') values.push(new Date().toISOString().replace('T', ' ').substring(0, 19));
        else values.push(null);
      }
    }

    try {
      // Insert user
      const insertQuery = `
        INSERT INTO users (${insertCols.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;
      
      const stmt = db.prepare(insertQuery);
      const result = stmt.run(...values);
      
      console.log(`✓ Imported: ${username} (${email}) -> ID: ${result.lastInsertRowid}`);
      importedCount++;
    } catch (error) {
      // Check if error is due to duplicate (unique constraint violation)
      if (error.message.includes('UNIQUE constraint') || 
          error.message.includes('unique constraint') ||
          error.message.includes('already exists')) {
        console.log(`⊘ Skipped: ${username} (${email}) - already exists (unique constraint)`);
        skippedCount++;
      } else {
        console.error(`✗ Error importing ${username} (${email}):`, error.message);
        errorCount++;
      }
    }
  }

  console.log('-'.repeat(60));
  console.log('');
  console.log('Import Summary:');
  console.log(`  ✓ Imported: ${importedCount} user(s)`);
  console.log(`  ⊘ Skipped:  ${skippedCount} user(s) (already exist)`);
  console.log(`  ✗ Errors:   ${errorCount} user(s)`);
  console.log('');
  console.log('='.repeat(60));
  console.log('Import completed!');
  console.log('='.repeat(60));

} catch (error) {
  console.error('\nFatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  if (db) {
    db.close();
    console.log('\n✓ Database connection closed');
  }
}

