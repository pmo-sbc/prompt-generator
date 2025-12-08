/**
 * Migration Script: Add tokens column to users table
 */

const Database = require('better-sqlite3');

const db = new Database('prompts.db');

console.log('Starting migration: Adding tokens column...');

try {
  // Check if tokens column already exists
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasTokens = tableInfo.some(col => col.name === 'tokens');

  if (hasTokens) {
    console.log('✓ Tokens column already exists');
  } else {
    // Add tokens column with default value of 100
    db.prepare('ALTER TABLE users ADD COLUMN tokens INTEGER DEFAULT 100').run();
    console.log('✓ Added tokens column');

    // Update existing users to have 100 tokens
    const result = db.prepare('UPDATE users SET tokens = 100 WHERE tokens IS NULL').run();
    console.log(`✓ Updated ${result.changes} existing users with 100 tokens`);
  }

  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
