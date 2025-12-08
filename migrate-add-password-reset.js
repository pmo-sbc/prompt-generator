/**
 * Database Migration: Add password reset columns
 * Run this script on your production server to add the missing columns
 */

const Database = require('better-sqlite3');
const path = require('path');

// Update this path to match your production database location
const DB_PATH = process.env.DB_PATH || 'prompts.db';

console.log(`Migrating database: ${DB_PATH}`);

try {
  const db = new Database(DB_PATH);

  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = tableInfo.map(col => col.name);

  const needsPasswordResetToken = !columnNames.includes('password_reset_token');
  const needsPasswordResetExpires = !columnNames.includes('password_reset_token_expires');
  const needsIsAdmin = !columnNames.includes('is_admin');

  if (!needsPasswordResetToken && !needsPasswordResetExpires && !needsIsAdmin) {
    console.log('✓ Database already has all required columns. No migration needed.');
    db.close();
    process.exit(0);
  }

  console.log('Starting migration...\n');

  // Add missing columns
  if (needsPasswordResetToken) {
    console.log('Adding password_reset_token column...');
    db.prepare('ALTER TABLE users ADD COLUMN password_reset_token TEXT').run();
    console.log('✓ Added password_reset_token column');
  }

  if (needsPasswordResetExpires) {
    console.log('Adding password_reset_token_expires column...');
    db.prepare('ALTER TABLE users ADD COLUMN password_reset_token_expires DATETIME').run();
    console.log('✓ Added password_reset_token_expires column');
  }

  if (needsIsAdmin) {
    console.log('Adding is_admin column...');
    db.prepare('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0').run();
    console.log('✓ Added is_admin column');

    // Set the first user as admin if no admin exists
    const firstUser = db.prepare('SELECT id, username FROM users ORDER BY id ASC LIMIT 1').get();
    if (firstUser) {
      db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(firstUser.id);
      console.log(`✓ Set user "${firstUser.username}" (ID: ${firstUser.id}) as admin`);
    }
  }

  // Verify the columns were added
  const updatedTableInfo = db.prepare("PRAGMA table_info(users)").all();
  const updatedColumnNames = updatedTableInfo.map(col => col.name);

  const hasPasswordReset = updatedColumnNames.includes('password_reset_token') &&
                           updatedColumnNames.includes('password_reset_token_expires');
  const hasIsAdmin = updatedColumnNames.includes('is_admin');

  if (hasPasswordReset && hasIsAdmin) {
    console.log('\n✓ Migration completed successfully!');
    console.log('Your database now supports:');
    console.log('  - Password reset functionality');
    console.log('  - Admin user management');
  } else {
    console.error('\n✗ Migration verification failed!');
    process.exit(1);
  }

  db.close();
} catch (error) {
  console.error('\n✗ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
}
