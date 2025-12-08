/**
 * Update Script: Set 100 tokens for all existing users
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const db = new Database(dbPath);

console.log('Starting token update for all users...');

try {
  // Update all users to have 100 tokens (only if they don't already have tokens set)
  const result = db.prepare('UPDATE users SET tokens = 100 WHERE tokens IS NULL OR tokens = 0').run();

  console.log(`✓ Updated ${result.changes} user(s) with 100 tokens`);

  // Show current token status for all users
  const users = db.prepare('SELECT id, username, email, tokens FROM users').all();

  console.log('\nCurrent user token status:');
  console.log('═══════════════════════════════════════════════════════');
  users.forEach(user => {
    console.log(`User ID: ${user.id} | Username: ${user.username} | Email: ${user.email} | Tokens: ${user.tokens || 0}`);
  });
  console.log('═══════════════════════════════════════════════════════');

  console.log('\nToken update completed successfully!');
} catch (error) {
  console.error('Error updating user tokens:', error);
  process.exit(1);
} finally {
  db.close();
}
