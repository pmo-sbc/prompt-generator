/**
 * Sync Users from Production Database
 * 
 * This script copies users from a production database to the local database.
 * It skips users that already exist in the local database (matched by username or email).
 * 
 * Usage:
 *   node sync-users-from-production.js /path/to/production/prompts.db
 * 
 * Or set PROD_DB_PATH environment variable:
 *   PROD_DB_PATH=/path/to/production/prompts.db node sync-users-from-production.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const config = require('./src/config');

// Get production database path from command line argument or environment variable
const prodDbPath = process.argv[2] || process.env.PROD_DB_PATH;

if (!prodDbPath) {
  console.error('Error: Production database path is required.');
  console.error('\nUsage:');
  console.error('  node sync-users-from-production.js /path/to/production/prompts.db');
  console.error('\nOr set environment variable:');
  console.error('  PROD_DB_PATH=/path/to/production/prompts.db node sync-users-from-production.js');
  process.exit(1);
}

// Local database path (current environment)
const localDbPath = config.database.filename;

console.log('='.repeat(60));
console.log('User Sync Script: Production -> Local');
console.log('='.repeat(60));
console.log(`Production DB: ${prodDbPath}`);
console.log(`Local DB:      ${localDbPath}`);
console.log('='.repeat(60));
console.log('');

// Validate that production database file exists
const fs = require('fs');
if (!fs.existsSync(prodDbPath)) {
  console.error(`Error: Production database file not found: ${prodDbPath}`);
  process.exit(1);
}

if (!fs.existsSync(localDbPath)) {
  console.error(`Error: Local database file not found: ${localDbPath}`);
  console.error('Please ensure the local database is initialized first.');
  process.exit(1);
}

let prodDb;
let localDb;

try {
  // Connect to production database (read-only mode recommended)
  console.log('Connecting to production database...');
  prodDb = new Database(prodDbPath, { readonly: true });
  console.log('✓ Connected to production database');

  // Connect to local database
  console.log('Connecting to local database...');
  try {
    localDb = new Database(localDbPath);
    // Test if database is readable by trying a simple query
    try {
      localDb.prepare('SELECT 1').get();
    } catch (testError) {
      if (testError.message.includes('malformed') || testError.message.includes('corrupt')) {
        throw testError; // Re-throw to be caught by outer catch
      }
    }
    localDb.pragma('foreign_keys = ON');
    console.log('✓ Connected to local database');
  } catch (error) {
    if (error.message.includes('malformed') || error.message.includes('corrupt')) {
      console.error('\n✗ Error: Local database is corrupted and cannot be opened.');
      console.error(`   Database file: ${localDbPath}`);
      console.error('\n   To fix this:');
      console.error('   1. Backup the corrupted database:');
      console.error(`      cp ${localDbPath} ${localDbPath}.backup`);
      console.error('   2. Delete or rename the corrupted file:');
      console.error(`      mv ${localDbPath} ${localDbPath}.corrupted`);
      console.error('   3. Run the application to create a new database');
      console.error('   4. Run this sync script again\n');
      process.exit(1);
    }
    throw error;
  }
  console.log('');

  // Check if users table exists in production database
  console.log('Checking production database structure...');
  const prodTables = prodDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='users'
  `).get();

  if (!prodTables) {
    console.error('Error: "users" table not found in production database.');
    console.error('The production database may be corrupted or missing tables.');
    process.exit(1);
  }

  // Get column information from production users table
  const prodColumns = prodDb.prepare('PRAGMA table_info(users)').all();
  const prodColumnNames = prodColumns.map(col => col.name);
  console.log(`✓ Found users table with columns: ${prodColumnNames.join(', ')}`);
  console.log('');

  // Get all users from production database
  console.log('Reading users from production database...');
  let prodUsers;
  try {
    // Try to read all columns, but handle missing columns gracefully
    const selectColumns = prodColumnNames.filter(col => 
      ['id', 'username', 'email', 'password', 'email_verified', 
       'verification_token', 'verification_token_expires',
       'password_reset_token', 'password_reset_token_expires',
       'is_admin', 'tokens', 'created_at'].includes(col)
    );
    
    if (selectColumns.length === 0) {
      throw new Error('No valid columns found in production users table');
    }

    const query = `SELECT ${selectColumns.join(', ')} FROM users`;
    prodUsers = prodDb.prepare(query).all();
    console.log(`✓ Found ${prodUsers.length} user(s) in production database`);
  } catch (error) {
    console.error('Error reading users from production database:', error.message);
    console.error('The production database may be corrupted.');
    console.error('Attempting to read with minimal columns...');
    
    // Try with just essential columns
    try {
      prodUsers = prodDb.prepare('SELECT id, username, email, password FROM users').all();
      console.log(`✓ Found ${prodUsers.length} user(s) with minimal column read`);
    } catch (minError) {
      console.error('Error: Could not read users from production database.');
      console.error('Details:', minError.message);
      process.exit(1);
    }
  }

  if (prodUsers.length === 0) {
    console.log('No users found in production database. Nothing to sync.');
    process.exit(0);
  }

  console.log('');

  // Get existing users from local database (for duplicate checking)
  console.log('Checking existing users in local database...');
  let localUsers = [];
  let localUsernames = new Set();
  let localEmails = new Set();
  
  try {
    localUsers = localDb.prepare('SELECT id, username, email FROM users').all();
    localUsernames = new Set(localUsers.map(u => u.username.toLowerCase()));
    localEmails = new Set(localUsers.map(u => u.email.toLowerCase()));
    console.log(`✓ Found ${localUsers.length} existing user(s) in local database`);
  } catch (error) {
    if (error.message.includes('malformed') || error.message.includes('corrupt')) {
      console.warn('⚠ Warning: Local database appears to be corrupted.');
      console.warn('⚠ Cannot check for existing users. Will attempt to insert all users.');
      console.warn('⚠ Duplicate users will be skipped based on unique constraint errors.');
      console.log('');
    } else {
      throw error; // Re-throw if it's a different error
    }
  }
  console.log('');

  // Prepare insert statement for local database
  // Get local database columns
  const localColumns = localDb.prepare('PRAGMA table_info(users)').all();
  const localColumnNames = localColumns.map(col => col.name);

  // Determine which columns to insert
  const insertableColumns = localColumnNames.filter(col => 
    col !== 'id' // Skip id (auto-increment)
  );

  console.log('Syncing users...');
  console.log('-'.repeat(60));

  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each production user
  for (const prodUser of prodUsers) {
    const username = prodUser.username;
    const email = prodUser.email;

    // Check if user already exists (by username or email)
    if (localUsernames.has(username.toLowerCase()) || localEmails.has(email.toLowerCase())) {
      console.log(`⊘ Skipped: ${username} (${email}) - already exists`);
      skippedCount++;
      continue;
    }

    // Prepare insert values
    const values = [];
    const placeholders = [];
    const insertColumns = [];

    for (const col of insertableColumns) {
      if (prodUser.hasOwnProperty(col)) {
        insertColumns.push(col);
        placeholders.push('?');
        values.push(prodUser[col]);
      } else {
        // Column doesn't exist in production, use default
        insertColumns.push(col);
        placeholders.push('?');
        // Set appropriate defaults
        if (col === 'email_verified') values.push(0);
        else if (col === 'is_admin') values.push(0);
        else if (col === 'tokens') values.push(100);
        else if (col === 'created_at') values.push(new Date().toISOString());
        else values.push(null);
      }
    }

    try {
      // Insert user into local database
      const insertQuery = `
        INSERT INTO users (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;
      
      const stmt = localDb.prepare(insertQuery);
      const result = stmt.run(...values);
      
      console.log(`✓ Synced: ${username} (${email}) -> ID: ${result.lastInsertRowid}`);
      syncedCount++;
      
      // Update local sets to avoid duplicate inserts in same run
      localUsernames.add(username.toLowerCase());
      localEmails.add(email.toLowerCase());
    } catch (error) {
      // Check if error is due to duplicate (unique constraint violation)
      if (error.message.includes('UNIQUE constraint') || 
          error.message.includes('unique constraint') ||
          error.message.includes('already exists')) {
        console.log(`⊘ Skipped: ${username} (${email}) - already exists (unique constraint)`);
        skippedCount++;
        
        // Update local sets to avoid duplicate inserts in same run
        localUsernames.add(username.toLowerCase());
        localEmails.add(email.toLowerCase());
      } else {
        console.error(`✗ Error syncing ${username} (${email}):`, error.message);
        errorCount++;
      }
    }
  }

  console.log('-'.repeat(60));
  console.log('');
  console.log('Sync Summary:');
  console.log(`  ✓ Synced:   ${syncedCount} user(s)`);
  console.log(`  ⊘ Skipped:  ${skippedCount} user(s) (already exist)`);
  console.log(`  ✗ Errors:   ${errorCount} user(s)`);
  console.log('');
  console.log('='.repeat(60));
  console.log('Sync completed!');
  console.log('='.repeat(60));

} catch (error) {
  console.error('\nFatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  // Close database connections
  if (prodDb) {
    prodDb.close();
    console.log('\n✓ Production database connection closed');
  }
  if (localDb) {
    localDb.close();
    console.log('✓ Local database connection closed');
  }
}

