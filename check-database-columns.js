/**
 * Check what columns exist in the users table
 */

const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || 'prompts.db';

console.log(`Checking database: ${DB_PATH}\n`);

try {
  const db = new Database(DB_PATH);

  // Get table structure
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();

  console.log('Current columns in users table:');
  console.log('===============================');
  tableInfo.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });

  console.log('\n');

  // Check for specific columns
  const columnNames = tableInfo.map(col => col.name);

  console.log('Required columns status:');
  console.log('========================');
  console.log(`✓ password_reset_token: ${columnNames.includes('password_reset_token') ? '✓ EXISTS' : '✗ MISSING'}`);
  console.log(`✓ password_reset_token_expires: ${columnNames.includes('password_reset_token_expires') ? '✓ EXISTS' : '✗ MISSING'}`);
  console.log(`✓ is_admin: ${columnNames.includes('is_admin') ? '✓ EXISTS' : '✗ MISSING'}`);

  db.close();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
