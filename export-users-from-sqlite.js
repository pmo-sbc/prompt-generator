/**
 * Export users from SQLite database (with recovery attempts)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'users-export.json');

console.log('Exporting users from SQLite database...\n');

// Try multiple database files
const dbFiles = [
  'prompts.db',
  'prompts_backup_1760715082307.db',
  'database.db',
  'database.sqlite'
];

let db = null;
let usedFile = null;

for (const dbFile of dbFiles) {
  const dbPath = path.join(__dirname, dbFile);
  if (!fs.existsSync(dbPath)) {
    continue;
  }
  
  console.log(`Trying: ${dbFile}...`);
  
  try {
    db = new Database(dbPath, { readonly: true });
    
    // Test if we can query
    const test = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").get();
    usedFile = dbFile;
    console.log(`✓ Successfully opened: ${dbFile}\n`);
    break;
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    if (db) {
      try { db.close(); } catch (e) {}
      db = null;
    }
    continue;
  }
}

if (!db) {
  console.error('❌ Could not open any database file');
  console.error('\nTried files:');
  dbFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.error(`  ${exists ? '✓' : '✗'} ${file} ${exists ? '(exists)' : '(not found)'}`);
  });
  process.exit(1);
}

try {
  // Check if users table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  
  if (!tables) {
    console.error('❌ Users table not found in database');
    const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\nAvailable tables:', allTables.map(t => t.name).join(', '));
    db.close();
    process.exit(1);
  }
  
  // Get users
  console.log(`Reading users from ${usedFile}...\n`);
  const users = db.prepare('SELECT * FROM users').all();
  
  console.log(`✓ Found ${users.length} user(s)\n`);
  
  // Remove password field for security (keep only hash)
  const safeUsers = users.map(user => {
    const safeUser = { ...user };
    if (safeUser.password) {
      safeUser.password = '[HASHED - ' + safeUser.password.substring(0, 20) + '...]';
    }
    return safeUser;
  });
  
  // Export to JSON
  const exportData = {
    exported_at: new Date().toISOString(),
    source_file: usedFile,
    total_users: users.length,
    users: safeUsers
  };
  
  // Also create CSV export
  const csvFile = path.join(__dirname, 'users-export.csv');
  let csv = 'id,username,email,is_admin,tokens,created_at,email_verified\n';
  
  users.forEach(user => {
    csv += `${user.id || ''},${user.username || ''},${user.email || ''},${user.is_admin ? '1' : '0'},${user.tokens || ''},${user.created_at || ''},${user.email_verified ? '1' : '0'}\n`;
  });
  
  fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf8');
  fs.writeFileSync(csvFile, csv, 'utf8');
  
  console.log('========================================');
  console.log('Export Complete!');
  console.log('========================================\n');
  console.log(`✓ Exported ${users.length} user(s) from ${usedFile}`);
  console.log(`✓ JSON output: ${path.resolve(outputFile)}`);
  console.log(`✓ CSV output: ${path.resolve(csvFile)}\n`);
  
  // Display user summary
  console.log('Users Summary:');
  console.log('─'.repeat(60));
  users.forEach((user, index) => {
    console.log(`\n${index + 1}. ${user.username || user.email || 'Unknown'}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Admin: ${user.is_admin ? 'Yes' : 'No'}`);
    console.log(`   Tokens: ${user.tokens !== undefined ? user.tokens : 'N/A'}`);
    console.log(`   Email Verified: ${user.email_verified ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.created_at || 'N/A'}`);
  });
  
  db.close();
  
} catch (error) {
  console.error('❌ Error reading users:', error.message);
  console.error(error);
  
  if (db) {
    try {
      // Try to get table info
      const columns = db.prepare("PRAGMA table_info(users)").all();
      console.log('\nUsers table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    } catch (e) {
      console.error('Could not inspect table structure');
    }
    db.close();
  }
  
  process.exit(1);
}
