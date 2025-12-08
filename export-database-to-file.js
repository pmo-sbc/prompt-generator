/**
 * Database Export Script
 * Exports the current database to a SQL file
 * 
 * Usage:
 *   node export-database-to-file.js
 *   node export-database-to-file.js --output backup.sql
 */

// Try to load dotenv
try {
  require('dotenv').config();
} catch (error) {
  console.warn('Warning: dotenv module not found. Using environment variables directly.');
}

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let outputFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' || args[i] === '-o') {
    outputFile = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Database Export Script
======================

Usage:
  node export-database-to-file.js [OPTIONS]

Options:
  --output, -o <file>    Output file path (default: database-export-YYYY-MM-DD.sql)
  --help, -h             Show this help message

Example:
  node export-database-to-file.js
  node export-database-to-file.js --output my-backup.sql
    `);
    process.exit(0);
  }
}

// Get database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Set default output file if not specified
if (!outputFile) {
  const timestamp = new Date().toISOString().split('T')[0];
  outputFile = `database-export-${timestamp}.sql`;
}

async function exportDatabase() {
  console.log('\n========================================');
  console.log('Database Export Script');
  console.log('========================================\n');
  
  console.log(`Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
  console.log(`Output file: ${outputFile}\n`);
  
  const pool = new Pool(dbConfig);
  
  try {
    // Test connection
    console.log('Connecting to database...');
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW(), current_database(), current_user');
      console.log(`✓ Connected to: ${result.rows[0].current_database}@${result.rows[0].current_user}\n`);
    } finally {
      client.release();
    }
    
    // Get all tables
    console.log('Discovering tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`✓ Found ${tables.length} table(s): ${tables.join(', ')}\n`);
    
    // Start building SQL export
    let sqlExport = `-- Database Export\n`;
    sqlExport += `-- Generated: ${new Date().toISOString()}\n`;
    sqlExport += `-- Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}\n`;
    sqlExport += `-- User: ${dbConfig.user}\n\n`;
    
    // Export each table
    let totalRows = 0;
    
    for (const table of tables) {
      console.log(`Exporting table: ${table}...`);
      
      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      const rowCount = parseInt(countResult.rows[0].count, 10);
      
      console.log(`  Rows: ${rowCount}`);
      totalRows += rowCount;
      
      if (rowCount === 0) {
        sqlExport += `\n-- Table: ${table} (empty)\n`;
        continue;
      }
      
      // Get column names and types
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      const columns = columnsResult.rows.map(row => row.column_name);
      const columnList = columns.map(col => `"${col}"`).join(', ');
      
      // Get all data
      const dataResult = await pool.query(`SELECT * FROM "${table}"`);
      const rows = dataResult.rows;
      
      sqlExport += `\n-- Table: ${table} (${rowCount} rows)\n`;
      sqlExport += `TRUNCATE TABLE "${table}" CASCADE;\n\n`;
      
      // Generate INSERT statements
      // Process in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        batch.forEach(row => {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) {
              return 'NULL';
            } else if (typeof value === 'string') {
              // Escape single quotes and backslashes
              const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "''");
              return `'${escaped}'`;
            } else if (typeof value === 'boolean') {
              return value ? 'TRUE' : 'FALSE';
            } else if (typeof value === 'object') {
              // JSONB/JSON data
              return `'${JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'::jsonb`;
            } else if (value instanceof Date) {
              return `'${value.toISOString()}'::timestamp`;
            } else {
              return String(value);
            }
          });
          
          sqlExport += `INSERT INTO "${table}" (${columnList}) VALUES (${values.join(', ')});\n`;
        });
      }
      
      sqlExport += '\n';
    }
    
    // Get sequences and reset them
    sqlExport += `\n-- Reset Sequences\n`;
    for (const table of tables) {
      const sequencesResult = await pool.query(`
        SELECT column_name, pg_get_serial_sequence($1, column_name) as sequence_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
          AND column_default LIKE 'nextval%'
      `, [table]);
      
      for (const seq of sequencesResult.rows) {
        if (seq.sequence_name) {
          const maxResult = await pool.query(`SELECT COALESCE(MAX("${seq.column_name}"), 1) as max_val FROM "${table}"`);
          const maxVal = maxResult.rows[0].max_val;
          sqlExport += `SELECT setval('${seq.sequence_name}', ${maxVal}, true);\n`;
        }
      }
    }
    
    // Write to file
    fs.writeFileSync(outputFile, sqlExport, 'utf8');
    
    const fileSize = fs.statSync(outputFile).size;
    const fileSizeKB = (fileSize / 1024).toFixed(2);
    
    console.log('\n========================================');
    console.log('Export Complete!');
    console.log('========================================\n');
    console.log(`✓ Exported ${tables.length} table(s)`);
    console.log(`✓ Total rows: ${totalRows}`);
    console.log(`✓ Output file: ${path.resolve(outputFile)}`);
    console.log(`✓ File size: ${fileSizeKB} KB`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the export
exportDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

