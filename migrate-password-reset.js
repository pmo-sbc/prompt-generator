/**
 * Migration Script: Add Password Reset Fields to Users Table
 * Run this once to add password_reset_token and password_reset_token_expires to existing databases
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const db = new Database(dbPath);

console.log('🔄 Starting migration: Add password reset fields...\n');

try {
  // Check if columns already exist
  const columns = db.prepare('PRAGMA table_info(users)').all();
  const hasResetToken = columns.some(col => col.name === 'password_reset_token');
  const hasResetExpires = columns.some(col => col.name === 'password_reset_token_expires');

  if (hasResetToken && hasResetExpires) {
    console.log('✅ Password reset fields already exist. No migration needed.');
    db.close();
    process.exit(0);
  }

  // Add password_reset_token column if it doesn't exist
  if (!hasResetToken) {
    console.log('📝 Adding password_reset_token column...');
    db.prepare('ALTER TABLE users ADD COLUMN password_reset_token TEXT').run();
    console.log('   ✅ password_reset_token added');
  }

  // Add password_reset_token_expires column if it doesn't exist
  if (!hasResetExpires) {
    console.log('📝 Adding password_reset_token_expires column...');
    db.prepare('ALTER TABLE users ADD COLUMN password_reset_token_expires DATETIME').run();
    console.log('   ✅ password_reset_token_expires added');
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('\n📋 Updated Users Table Schema:');

  const updatedColumns = db.prepare('PRAGMA table_info(users)').all();
  updatedColumns.forEach(col => {
    console.log(`   - ${col.name} | ${col.type}`);
  });

  db.close();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  db.close();
  process.exit(1);
}
