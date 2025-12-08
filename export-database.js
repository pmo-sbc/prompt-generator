/**
 * Database Export Script for Production Deployment
 * Exports the database schema and creates SQL dump for production
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const exportPath = path.join(__dirname, 'database-export.sql');

console.log('Starting database export...\n');

try {
  const db = new Database(dbPath, { readonly: true });

  let sqlDump = `-- AI Prompt Templates Database Export
-- Generated: ${new Date().toISOString()}
-- This SQL file can be used to recreate the database on production

-- Enable foreign keys
PRAGMA foreign_keys = ON;

`;

  // Get all table schemas
  const allTables = db.prepare(`
    SELECT name, sql FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();

  console.log(`Found ${allTables.length} tables to export`);

  // Sort tables to handle foreign key dependencies
  // Put 'users' first since other tables reference it
  const tables = [];
  const usersTable = allTables.find(t => t.name === 'users');
  if (usersTable) {
    tables.push(usersTable);
  }

  // Add remaining tables
  allTables.forEach(t => {
    if (t.name !== 'users') {
      tables.push(t);
    }
  });

  // Export each table
  tables.forEach(table => {
    console.log(`\nExporting table: ${table.name}`);

    // Add CREATE TABLE statement
    sqlDump += `\n-- Table: ${table.name}\n`;

    // Fix malformed users table schema
    let tableSql = table.sql;
    if (table.name === 'users' && tableSql.includes(', tokens INTEGER DEFAULT 100)')) {
      // The users table has malformed schema from ALTER TABLE commands
      tableSql = `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verification_token TEXT,
    verification_token_expires DATETIME,
    is_admin BOOLEAN DEFAULT 0,
    email_verified BOOLEAN DEFAULT 0,
    tokens INTEGER DEFAULT 100
  )`;
    }

    sqlDump += `${tableSql};\n\n`;

    // Get all data from the table
    const rows = db.prepare(`SELECT * FROM ${table.name}`).all();

    if (rows.length > 0) {
      console.log(`  - Found ${rows.length} row(s)`);

      // Get column names
      const columns = Object.keys(rows[0]);

      rows.forEach(row => {
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'number') return value;
          if (typeof value === 'boolean') return value ? 1 : 0;
          // Escape single quotes in strings
          return `'${String(value).replace(/'/g, "''")}'`;
        });

        sqlDump += `INSERT INTO ${table.name} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      });

      sqlDump += '\n';
    } else {
      console.log(`  - No data`);
    }
  });

  // Get all indexes
  const indexes = db.prepare(`
    SELECT name, sql FROM sqlite_master
    WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  if (indexes.length > 0) {
    sqlDump += `\n-- Indexes\n`;
    indexes.forEach(index => {
      sqlDump += `${index.sql};\n`;
    });
  }

  // Write to file
  fs.writeFileSync(exportPath, sqlDump, 'utf8');

  console.log(`\n✓ Database exported successfully to: ${exportPath}`);
  console.log(`\nFile size: ${(fs.statSync(exportPath).size / 1024).toFixed(2)} KB`);

  db.close();
} catch (error) {
  console.error('Error exporting database:', error);
  process.exit(1);
}
