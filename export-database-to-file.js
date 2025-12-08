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
    
    // Define table order based on foreign key dependencies
    const TABLE_ORDER = [
      'users',
      'products',
      'discount_codes',
      'companies',
      'templates',
      'projects',
      'communities',
      'service_packages',
      'saved_prompts',
      'user_saved_templates',
      'usage_stats',
      'shared_prompts',
      'activity_logs',
      'orders',
      'user_sessions'
    ];
    
    let tables = tablesResult.rows.map(row => row.table_name);
    // Sort tables according to dependency order
    tables.sort((a, b) => {
      const indexA = TABLE_ORDER.indexOf(a);
      const indexB = TABLE_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    console.log(`✓ Found ${tables.length} table(s): ${tables.join(', ')}\n`);
    
    // Start building SQL export
    let sqlExport = `-- Database Export\n`;
    sqlExport += `-- Generated: ${new Date().toISOString()}\n`;
    sqlExport += `-- Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}\n`;
    sqlExport += `-- User: ${dbConfig.user}\n\n`;
    sqlExport += `-- Enable UUID extension\n`;
    sqlExport += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n`;
    
    // First, export table schemas
    console.log('\nExporting table schemas...');
    for (const table of tables) {
      console.log(`  Schema for: ${table}`);
      const schemaResult = await pool.query(`
        SELECT 
          'CREATE TABLE IF NOT EXISTS "' || table_name || '" (' || string_agg(
            '"' || column_name || '" ' || 
            CASE 
              WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
              WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
              WHEN data_type = 'numeric' THEN 'DECIMAL(' || numeric_precision || ',' || numeric_scale || ')'
              WHEN data_type = 'integer' AND column_default LIKE 'nextval%' THEN 'SERIAL'
              WHEN data_type = 'integer' THEN 'INTEGER'
              WHEN data_type = 'bigint' AND column_default LIKE 'nextval%' THEN 'BIGSERIAL'
              WHEN data_type = 'bigint' THEN 'BIGINT'
              WHEN data_type = 'boolean' THEN 'BOOLEAN'
              WHEN data_type = 'text' THEN 'TEXT'
              WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
              WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
              WHEN data_type = 'date' THEN 'DATE'
              WHEN data_type = 'jsonb' THEN 'JSONB'
              WHEN data_type = 'json' THEN 'JSON'
              ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL AND column_default NOT LIKE 'nextval%' 
                 THEN ' DEFAULT ' || column_default ELSE '' END,
            ', '
            ORDER BY ordinal_position
          ) || ');' as create_statement
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        GROUP BY table_name
      `, [table]);
      
      if (schemaResult.rows.length > 0) {
        sqlExport += `-- Table: ${table}\n`;
        sqlExport += schemaResult.rows[0].create_statement + '\n\n';
      }
      
      // Get foreign keys
      const fkResult = await pool.query(`
        SELECT
          'ALTER TABLE "' || tc.table_name || '" ADD CONSTRAINT "' || tc.constraint_name || 
          '" FOREIGN KEY ("' || kcu.column_name || '") REFERENCES "' || 
          ccu.table_name || '" ("' || ccu.column_name || '")' ||
          CASE WHEN rc.delete_rule != 'NO ACTION' THEN ' ON DELETE ' || rc.delete_rule ELSE '' END || ';' as fk_statement
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = $1
      `, [table]);
      
      // Don't add foreign keys here - they're already in CREATE TABLE
      // Foreign keys will be created automatically when tables are created
    }
    
    sqlExport += `-- Insert Data\n`;
    sqlExport += `-- ============\n\n`;
    
    // Export each table data
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
      
      const columns = columnsResult.rows.map(row => ({
        name: row.column_name,
        type: row.data_type
      }));
      const columnList = columns.map(col => `"${col.name}"`).join(', ');
      
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
          const values = columns.map((col, idx) => {
            const value = row[col.name];
            const colType = col.type;
            
            if (value === null || value === undefined) {
              return 'NULL';
            } else if (colType === 'timestamp without time zone' || colType === 'timestamp with time zone' || colType === 'date') {
              // Handle timestamp/date columns
              if (value instanceof Date) {
                return `'${value.toISOString()}'::timestamp`;
              } else if (typeof value === 'string') {
                return `'${value}'::timestamp`;
              } else {
                return `'${String(value)}'::timestamp`;
              }
            } else if (colType === 'jsonb' || colType === 'json') {
              // JSONB/JSON data
              if (typeof value === 'object') {
                const jsonStr = JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "''");
                return `'${jsonStr}'::jsonb`;
              } else {
                const escaped = String(value).replace(/\\/g, '\\\\').replace(/'/g, "''");
                return `'${escaped}'::jsonb`;
              }
            } else if (typeof value === 'boolean') {
              return value ? 'TRUE' : 'FALSE';
            } else if (typeof value === 'number') {
              return String(value);
            } else if (typeof value === 'string') {
              // Escape single quotes and backslashes
              const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "''");
              return `'${escaped}'`;
            } else if (value instanceof Date) {
              return `'${value.toISOString()}'::timestamp`;
            } else {
              return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
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

