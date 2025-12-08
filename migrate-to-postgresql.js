/**
 * Migration Script: SQLite to PostgreSQL
 * 
 * This script migrates data from SQLite to PostgreSQL
 * 
 * Usage: node migrate-to-postgresql.js
 * 
 * Prerequisites:
 * - SQLite database file exists
 * - PostgreSQL database is created and accessible
 * - Environment variables are set in .env file
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const SQLITE_DB_PATH = process.env.DB_PATH || 'prompts.db';
const PG_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

/**
 * Connect to SQLite database
 */
function connectSQLite() {
  try {
    if (!fs.existsSync(SQLITE_DB_PATH)) {
      throw new Error(`SQLite database not found at: ${SQLITE_DB_PATH}`);
    }
    logInfo(`Connecting to SQLite database: ${SQLITE_DB_PATH}`);
    const db = new Database(SQLITE_DB_PATH, { readonly: true });
    logSuccess('Connected to SQLite database');
    return db;
  } catch (error) {
    logError(`Failed to connect to SQLite: ${error.message}`);
    throw error;
  }
}

/**
 * Connect to PostgreSQL database
 */
async function connectPostgreSQL() {
  try {
    logInfo('Connecting to PostgreSQL database...');
    const pool = new Pool(PG_CONFIG);
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logSuccess('Connected to PostgreSQL database');
    return pool;
  } catch (error) {
    logError(`Failed to connect to PostgreSQL: ${error.message}`);
    throw error;
  }
}

/**
 * Get all data from a SQLite table
 */
function getTableData(sqliteDb, tableName) {
  try {
    const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
    logInfo(`  Retrieved ${rows.length} rows from ${tableName}`);
    return rows;
  } catch (error) {
    logError(`Failed to read ${tableName}: ${error.message}`);
    return [];
  }
}

/**
 * Insert data into PostgreSQL table
 */
async function insertTableData(pgPool, tableName, rows, columnMapping = null) {
  if (rows.length === 0) {
    logInfo(`  Skipping ${tableName} (no data)`);
    return;
  }

  try {
    // Get column names from first row
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');
    
    // For JSONB columns, we need to cast them properly
    const jsonbColumns = ['inputs', 'items', 'details', 'technologies'];
    const castedColumns = columns.map(col => 
      jsonbColumns.includes(col) ? `${col}::jsonb` : col
    ).join(', ');
    
    const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    
    let inserted = 0;
    for (const row of rows) {
      const values = columns.map(col => {
        let value = row[col];
        
        // Handle null values first
        if (value === null || value === undefined) {
          return null;
        }
        
        // Handle JSON/JSONB fields - PostgreSQL JSONB needs JavaScript objects/arrays
        if (col === 'inputs' || col === 'items' || col === 'details' || col === 'technologies') {
          // If it's already an object/array, use it directly
          if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            return value;
          }
          // If it's an array, use it directly
          if (Array.isArray(value)) {
            return value;
          }
          // If it's a string, parse it to get the object/array
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              // Ensure we return the parsed value (object or array)
              return parsed;
            } catch (e) {
              // If parsing fails, log and use empty array/object
              logError(`  Could not parse JSON for ${tableName}.${col}: ${e.message}`);
              // Return empty array for arrays, empty object for objects
              return col === 'technologies' || col === 'items' ? [] : {};
            }
          }
        }
        
        // Handle boolean values (SQLite uses 0/1, PostgreSQL uses true/false)
        if (typeof value === 'number' && (col.includes('is_') || col.includes('_verified') || col === 'ilec' || col === 'clec')) {
          value = value === 1;
        }
        
        return value;
      });
      
      try {
        // For JSONB fields, convert to JSON string if needed
        const finalValues = values.map((val, idx) => {
          const colName = columns[idx];
          if ((colName === 'inputs' || colName === 'items' || colName === 'details' || colName === 'technologies') && val !== null) {
            // If it's already a string that looks like JSON, use it directly
            if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
              return val;
            }
            // Otherwise stringify the object/array
            return JSON.stringify(val);
          }
          return val;
        });
        
        await pgPool.query(query, finalValues);
        inserted++;
      } catch (error) {
        if (error.code !== '23505') { // Ignore unique constraint violations
          logError(`  Error inserting row into ${tableName}: ${error.message}`);
          // Log first error details for debugging
          if (inserted === 0 && error.detail) {
            logError(`  Detail: ${error.detail}`);
          }
        }
      }
    }
    
    logSuccess(`  Inserted ${inserted} rows into ${tableName}`);
  } catch (error) {
    logError(`Failed to insert data into ${tableName}: ${error.message}`);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  log('\n=== SQLite to PostgreSQL Migration ===\n', 'blue');
  
  let sqliteDb;
  let pgPool;
  
  try {
    // Connect to databases
    sqliteDb = connectSQLite();
    pgPool = await connectPostgreSQL();
    
    // Tables to migrate (in order to respect foreign keys)
    // Skip SQLite-specific tables: sessions, sqlite_sequence
    const tables = [
      'users',
      'products',
      'discount_codes',
      'templates',
      'projects',
      'saved_prompts',
      'usage_stats',
      'user_saved_templates',
      'shared_prompts',
      'activity_logs',
      'companies',
      'communities',
      'service_packages',
      'orders'
    ];
    
    log('\nStarting data migration...\n', 'yellow');
    
    // Migrate each table
    for (const tableName of tables) {
      log(`Migrating ${tableName}...`, 'blue');
      
      try {
        // Check if table exists in SQLite
        const tableInfo = sqliteDb.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);
        
        if (!tableInfo) {
          logInfo(`  Table ${tableName} does not exist in SQLite, skipping`);
          continue;
        }
        
        // Get data from SQLite
        const rows = getTableData(sqliteDb, tableName);
        
        // Insert into PostgreSQL
        await insertTableData(pgPool, tableName, rows);
        
      } catch (error) {
        logError(`Failed to migrate ${tableName}: ${error.message}`);
        // Continue with other tables
      }
    }
    
    log('\n=== Migration Complete ===\n', 'green');
    
    // Verify migration
    log('\nVerifying migration...\n', 'yellow');
    for (const tableName of tables) {
      try {
        const result = await pgPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(result.rows[0].count, 10);
        logSuccess(`${tableName}: ${count} rows`);
      } catch (error) {
        logError(`Could not verify ${tableName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    logError(`Migration failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Cleanup
    if (sqliteDb) {
      sqliteDb.close();
      logInfo('SQLite connection closed');
    }
    if (pgPool) {
      await pgPool.end();
      logInfo('PostgreSQL connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  migrate().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { migrate };

