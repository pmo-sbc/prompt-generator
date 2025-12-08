/**
 * Rebuild Database with Production Users
 * 
 * This script:
 * 1. Creates a new database with the full schema
 * 2. Copies all data from current environment database (except users)
 * 3. Imports users from production database
 * 4. Updates all foreign key references to match new user IDs
 * 
 * Usage:
 *   node rebuild-database-with-production-users.js
 * 
 * Or specify paths:
 *   node rebuild-database-with-production-users.js [source_db] [new_db] [production_db]
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./src/config');

// Get paths from command line or use defaults
const sourceDbPath = process.argv[2] || config.database.filename; // Current environment DB
const newDbPath = process.argv[3] || 'prompts_new.db'; // New database to create
const prodDbPath = process.argv[4] || null; // Production DB (optional, can use user data directly)

console.log('='.repeat(60));
console.log('Rebuild Database with Production Users');
console.log('='.repeat(60));
console.log(`Source DB (current env): ${sourceDbPath}`);
console.log(`New DB (to create):      ${newDbPath}`);
if (prodDbPath) {
  console.log(`Production DB:            ${prodDbPath}`);
}
console.log('='.repeat(60));
console.log('');

// Production user data (pipe-delimited format)
const productionUserData = `1|diego|diego.rivera@sbc-servicesinc.com|$2b$10$w21kw1AnQK2SxZXYedavHeqYiDh25uN6NoJah7EeUKBdmygVxx84.|1|||1|231|2025-10-17 16:02:33|||Diego|Rivera|5126961551|301 Main Plaza|New Braunfels|Texas|78130|US
9|ecompean|ely@elycompean.com|$2b$10$uVpeiyWFm52j.AayTaZFd.g78ObFHX.m1BQrx7tHOSoQKJolwJYBS|1|||1|93|2025-10-22 17:44:21||||||||||
10|pmo|pmo@sbc-servicesinc.com|$2b$10$eT4pl6uxD3gC6IAXwYmWve9ACPdMuy/F6KMz2Lk7tjLkWlvHIKon2|1|||0|100|2025-10-22 17:46:24||||||||||
11|Jcompean|johnnycompean@gmail.com|$2b$10$SS/bx.WUb9wuwgCkFm8F5uPfG8tydFn0OYABUlot4zVeIRvDFR3KK|1|||0|97|2025-10-29 15:26:17||||||||||
12|Cpurchis|courtney@uniquelyplannedinc.com|$2b$10$QPgji8TzzJDEElBA.C0.yOlPZrwN0D6IBMj74vOz8mrJ/8axnpDTC|1|||0|90|2025-10-29 17:31:46||||||||||
13|diego2|rivmontdiego@gmail.com|$2b$10$WB2D0CYNrgLE8k30yqwN7eLbTlfUeDQdi4HVXWebgAGJZMSB2iEz6|1|||0|100|2025-11-03 19:29:23||||||||||
14|diego3|diegoriveramontano@gmail.com|$2b$10$4kUk6D8jm0c6bJQRlO4lJ.MqTnxJ69da8TJ3AhPehMMXBlN6wkcam|0|a87cafebe23916b00a9c6df5ee5865fd8dd16870301be024ebc513c451bc0aff|2025-11-04T22:22:38.460Z|0|100|2025-11-03 22:20:05||||||||||
15|testuser|ely@elycompean.net|$2b$10$GPTZw8oDI1nLPb.Etm4Mse2CGB/1p0IoLmDleH.9D80eh/xBPZZpu|1|||0|100|2025-12-08 16:07:23||||||||||`;

// Check if source database exists
if (!fs.existsSync(sourceDbPath)) {
  console.error(`Error: Source database not found: ${sourceDbPath}`);
  process.exit(1);
}

// Warn if new database already exists
if (fs.existsSync(newDbPath)) {
  console.warn(`Warning: New database file already exists: ${newDbPath}`);
  console.warn('It will be overwritten. Press Ctrl+C to cancel, or wait 5 seconds...');
  // Wait 5 seconds
  const start = Date.now();
  while (Date.now() - start < 5000) {
    // Busy wait
  }
  fs.unlinkSync(newDbPath);
  console.log('✓ Removed existing file');
}

let sourceDb;
let newDb;

try {
  // Connect to source database
  console.log('Connecting to source database...');
  sourceDb = new Database(sourceDbPath, { readonly: true });
  console.log('✓ Connected to source database');
  console.log('');

  // Create new database
  console.log('Creating new database...');
  newDb = new Database(newDbPath);
  newDb.pragma('foreign_keys = ON');
  newDb.pragma('journal_mode = WAL');
  console.log('✓ Created new database');
  console.log('');

  // Initialize schema in new database
  console.log('Creating database schema...');
  const { initializeDatabase } = require('./src/db');
  
  // Temporarily override config to use new database
  const originalDbPath = config.database.filename;
  config.database.filename = newDbPath;
  
  // Close the newDb connection temporarily so initializeDatabase can create it
  newDb.close();
  
  // Initialize will create all tables
  initializeDatabase();
  
  // Reconnect to new database
  newDb = new Database(newDbPath);
  newDb.pragma('foreign_keys = ON');
  newDb.pragma('journal_mode = WAL');
  
  // Add customer fields to users table if they don't exist (from migration)
  console.log('Adding customer fields to users table...');
  const existingColumns = newDb.prepare('PRAGMA table_info(users)').all().map(col => col.name);
  const customerFields = [
    { name: 'first_name', type: 'TEXT' },
    { name: 'last_name', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'city', type: 'TEXT' },
    { name: 'state', type: 'TEXT' },
    { name: 'zip_code', type: 'TEXT' },
    { name: 'country', type: 'TEXT' }
  ];
  
  let addedFields = 0;
  for (const field of customerFields) {
    if (!existingColumns.includes(field.name)) {
      try {
        newDb.prepare(`ALTER TABLE users ADD COLUMN ${field.name} ${field.type}`).run();
        addedFields++;
      } catch (error) {
        console.warn(`  ⚠ Could not add ${field.name}: ${error.message}`);
      }
    }
  }
  
  if (addedFields > 0) {
    console.log(`✓ Added ${addedFields} customer field(s) to users table`);
  } else {
    console.log('✓ Customer fields already exist');
  }
  
  // Restore original config
  config.database.filename = originalDbPath;
  
  console.log('✓ Schema created');
  console.log('');

  // Get list of all tables (except users)
  console.log('Getting list of tables to copy...');
  let tableNames = [];
  let sourceDbCorrupted = false;
  
  try {
    const allTables = sourceDb.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'users'
      ORDER BY name
    `).all();
    
    tableNames = allTables.map(t => t.name);
    console.log(`✓ Found ${tableNames.length} table(s) to copy: ${tableNames.join(', ')}`);
  } catch (error) {
    if (error.message.includes('malformed') || error.message.includes('corrupt')) {
      console.warn('⚠ Warning: Source database is corrupted and cannot be read.');
      console.warn('⚠ Will create new database with schema and production users only.');
      console.warn('⚠ Data from source database cannot be copied.');
      sourceDbCorrupted = true;
      tableNames = []; // No tables to copy
    } else {
      throw error;
    }
  }
  console.log('');

  // Get users from source database (for ID mapping)
  console.log('Reading users from source database for ID mapping...');
  let sourceUsers = [];
  let userMapping = {}; // old_id -> new_id
  
  if (!sourceDbCorrupted) {
    try {
      sourceUsers = sourceDb.prepare('SELECT id, username, email FROM users').all();
      console.log(`✓ Found ${sourceUsers.length} user(s) in source database`);
    } catch (error) {
      if (error.message.includes('malformed') || error.message.includes('corrupt')) {
        console.warn('⚠ Source database users table is corrupted, will skip user mapping');
        sourceDbCorrupted = true;
      } else {
        throw error;
      }
    }
  } else {
    console.log('⊘ Skipped (source database is corrupted)');
  }
  console.log('');

  // Import production users first
  console.log('Importing production users...');
  console.log('-'.repeat(60));
  
  const fieldMapping = [
    'id', 'username', 'email', 'password', 'email_verified',
    'verification_token', 'verification_token_expires', 'is_admin',
    'tokens', 'created_at', 'password_reset_token', 'password_reset_token_expires',
    'first_name', 'last_name', 'phone', 'address', 'city', 'state', 'zip_', 'country'
  ];
  
  const fieldToColumnMap = { 'zip_': 'zip_code' };
  
  const lines = productionUserData.trim().split('\n').filter(line => line.trim());
  const newDbColumns = newDb.prepare('PRAGMA table_info(users)').all();
  const newDbColumnNames = newDbColumns.map(col => col.name);
  const insertableColumns = newDbColumnNames.filter(col => col !== 'id');
  
  let importedUsers = 0;
  
  for (const line of lines) {
    const fields = line.split('|');
    if (fields.length < fieldMapping.length) continue;
    
    const userData = {};
    fieldMapping.forEach((fieldName, index) => {
      const value = fields[index] || '';
      const columnName = fieldToColumnMap[fieldName] || fieldName;
      userData[columnName] = value === '' ? null : value;
    });
    
    const username = userData.username;
    const email = userData.email;
    const oldId = parseInt(userData.id);
    
    // Validate required fields
    if (!username || !email || !userData.password) {
      console.error(`✗ Skipping: Missing required fields (username: ${username}, email: ${email}, password: ${!!userData.password})`);
      errorUsers++;
      continue;
    }
    
    // Check if user already exists
    const existing = newDb.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      console.log(`⊘ Skipped: ${username} (${email}) - already exists`);
      userMapping[oldId] = existing.id;
      skippedUsers++;
      continue;
    }
    
    // Prepare insert
    const values = [];
    const placeholders = [];
    const insertCols = [];
    
    for (const col of insertableColumns) {
      insertCols.push(col);
      placeholders.push('?');
      
      if (userData.hasOwnProperty(col)) {
        let value = userData[col];
        
        if (col === 'email_verified' || col === 'is_admin') {
          value = value === '1' || value === 1 || value === true ? 1 : 0;
        }
        
        if (col === 'tokens') {
          value = value ? parseInt(value) || 100 : 100;
        }
        
        if (col.includes('_expires') || col === 'created_at') {
          if (value && value !== 'null' && value !== '') {
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
        
        if (value === '' || value === 'null') {
          value = null;
        }
        
        values.push(value);
      } else {
        if (col === 'email_verified') values.push(0);
        else if (col === 'is_admin') values.push(0);
        else if (col === 'tokens') values.push(100);
        else if (col === 'created_at') values.push(new Date().toISOString().replace('T', ' ').substring(0, 19));
        else values.push(null);
      }
    }
    
    try {
      const insertQuery = `INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const stmt = newDb.prepare(insertQuery);
      const result = stmt.run(...values);
      const newId = result.lastInsertRowid;
      
      console.log(`✓ Imported: ${username} (${email}) -> Old ID: ${oldId}, New ID: ${newId}`);
      userMapping[oldId] = newId;
      importedUsers++;
    } catch (error) {
      console.error(`✗ Error importing ${username} (${email}):`, error.message);
      console.error(`  Query: INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`);
      console.error(`  Values count: ${values.length}, Columns count: ${insertCols.length}`);
      if (error.message.includes('no such column')) {
        console.error(`  Available columns: ${newDbColumnNames.join(', ')}`);
      }
      errorUsers++;
    }
  }
  
  console.log('-'.repeat(60));
  console.log(`Import Summary:`);
  console.log(`  ✓ Imported: ${importedUsers} user(s)`);
  console.log(`  ⊘ Skipped: ${skippedUsers} user(s)`);
  console.log(`  ✗ Errors:  ${errorUsers} user(s)`);
  
  if (importedUsers === 0) {
    console.error('\n⚠ WARNING: No users were imported!');
    console.error('  Please check the error messages above.');
  }
  console.log('');

  // Build user mapping from source database users (match by username/email)
  if (!sourceDbCorrupted && sourceUsers.length > 0) {
    console.log('Building user ID mapping from source database...');
    for (const sourceUser of sourceUsers) {
      const matched = newDb.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(
        sourceUser.username, 
        sourceUser.email
      );
      if (matched) {
        userMapping[sourceUser.id] = matched.id;
        console.log(`  Mapped: ${sourceUser.username} (${sourceUser.email}) -> Old ID: ${sourceUser.id}, New ID: ${matched.id}`);
      }
    }
    console.log(`✓ Created ${Object.keys(userMapping).length} user ID mapping(s)`);
  } else {
    console.log('⊘ Skipped user ID mapping (source database is corrupted or has no users)');
  }
  console.log('');

  // Copy all other tables
  if (sourceDbCorrupted || tableNames.length === 0) {
    console.log('⊘ Skipping data copy (source database is corrupted or has no tables)');
    console.log('');
  } else {
    console.log('Copying data from source database...');
    console.log('-'.repeat(60));
    
    let totalRowsCopied = 0;
    let totalRowsSkipped = 0;
    
    for (const tableName of tableNames) {
      try {
      // Get table structure
      const sourceColumns = sourceDb.prepare(`PRAGMA table_info(${tableName})`).all();
      const sourceColumnNames = sourceColumns.map(col => col.name);
      
      const newColumns = newDb.prepare(`PRAGMA table_info(${tableName})`).all();
      const newColumnNames = newColumns.map(col => col.name);
      
      // Find common columns
      const commonColumns = sourceColumnNames.filter(col => newColumnNames.includes(col));
      const hasUserId = commonColumns.includes('user_id');
      
      if (commonColumns.length === 0) {
        console.log(`⊘ Skipped: ${tableName} (no matching columns)`);
        continue;
      }
      
      // Get all rows from source
      const rows = sourceDb.prepare(`SELECT ${commonColumns.join(', ')} FROM ${tableName}`).all();
      
      if (rows.length === 0) {
        console.log(`- ${tableName}: 0 rows (empty table)`);
        continue;
      }
      
      // Prepare insert statement
      const insertCols = commonColumns.filter(col => col !== 'id'); // Skip id for auto-increment
      const placeholders = insertCols.map(() => '?').join(', ');
      const insertQuery = `INSERT INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders})`;
      const insertStmt = newDb.prepare(insertQuery);
      
      let copied = 0;
      let skipped = 0;
      
      // Insert rows
      for (const row of rows) {
        try {
          const values = insertCols.map(col => {
            let value = row[col];
            
            // Map user_id if it exists
            if (col === 'user_id' && hasUserId && value) {
              const newUserId = userMapping[value];
              if (newUserId) {
                value = newUserId;
              } else {
                // User doesn't exist in new database, skip this row
                throw new Error('User ID not found in mapping');
              }
            }
            
            return value;
          });
          
          insertStmt.run(...values);
          copied++;
        } catch (error) {
          if (error.message === 'User ID not found in mapping') {
            skipped++;
          } else if (error.message.includes('UNIQUE constraint') || error.message.includes('FOREIGN KEY')) {
            skipped++;
          } else {
            throw error;
          }
        }
      }
      
      console.log(`✓ ${tableName}: ${copied} copied, ${skipped} skipped`);
      totalRowsCopied += copied;
      totalRowsSkipped += skipped;
      
      } catch (error) {
        console.error(`✗ Error copying ${tableName}:`, error.message);
      }
    }
    
    console.log('-'.repeat(60));
    console.log(`✓ Copied ${totalRowsCopied} total row(s), skipped ${totalRowsSkipped} row(s)`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('Database rebuild completed successfully!');
  console.log('='.repeat(60));
  console.log(`New database: ${newDbPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Backup your current database');
  console.log(`  2. Replace it with the new one: mv ${newDbPath} ${sourceDbPath}`);
  console.log('  3. Restart your application');
  console.log('');

} catch (error) {
  console.error('\nFatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  if (sourceDb) {
    sourceDb.close();
  }
  if (newDb) {
    newDb.close();
  }
}

