/**
 * Database Import Script for Production
 * Imports the database from the SQL export file
 *
 * Usage: node import-database.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const importPath = path.join(__dirname, 'database-export.sql');

console.log('Database Import Script');
console.log('=====================\n');

// Check if import file exists
if (!fs.existsSync(importPath)) {
  console.error(`❌ Error: Import file not found: ${importPath}`);
  console.log('\nPlease ensure database-export.sql is in the same directory as this script.');
  process.exit(1);
}

// Check if database already exists
if (fs.existsSync(dbPath)) {
  console.log('⚠️  Warning: Database file already exists!');
  console.log(`   Location: ${dbPath}`);

  // Create backup
  const backupPath = path.join(__dirname, `prompts_backup_${Date.now()}.db`);
  console.log(`\n📦 Creating backup: ${backupPath}`);
  fs.copyFileSync(dbPath, backupPath);
  console.log('✓ Backup created successfully\n');

  // Delete old database
  fs.unlinkSync(dbPath);
  console.log('✓ Old database removed\n');
}

try {
  console.log('Starting database import...\n');

  // Read SQL file
  const sql = fs.readFileSync(importPath, 'utf8');

  // Create new database
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Execute the SQL
  db.exec(sql);

  // Verify import
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`✓ Database imported successfully`);
  console.log(`\nImported tables:`);
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  - ${table.name}: ${count.count} row(s)`);
  });

  // Check for users with tokens
  const usersWithTokens = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE tokens IS NOT NULL
  `).get();

  console.log(`\n✓ Users with tokens: ${usersWithTokens.count}`);

  db.close();

  console.log(`\n✓ Import completed successfully!`);
  console.log(`\nDatabase location: ${dbPath}`);

} catch (error) {
  console.error('\n❌ Error importing database:', error.message);
  console.error('\nStack trace:', error.stack);

  // Clean up the failed database file
  if (fs.existsSync(dbPath)) {
    console.log('\n🧹 Cleaning up failed import...');
    fs.unlinkSync(dbPath);
    console.log('✓ Removed incomplete database file');
  }

  process.exit(1);
}
