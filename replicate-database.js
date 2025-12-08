/**
 * Database Replication Script
 * Replicates local database to production server
 * 
 * Usage:
 *   node replicate-database.js
 *   node replicate-database.js --production-env .env.production
 *   node replicate-database.js --production-host example.com --production-db mydb --production-user user --production-password pass
 * 
 * Environment Variables:
 *   Local DB: Uses .env file (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL)
 *   Production DB: Uses --production-env file or command-line arguments
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  productionEnvFile: null,
  productionHost: null,
  productionPort: null,
  productionDatabase: null,
  productionUser: null,
  productionPassword: null,
  productionSsl: null,
  skipBackup: false,
  dryRun: false,
  tables: null // If specified, only replicate these tables
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--production-env':
      config.productionEnvFile = args[++i];
      break;
    case '--production-host':
      config.productionHost = args[++i];
      break;
    case '--production-port':
      config.productionPort = parseInt(args[++i], 10);
      break;
    case '--production-db':
    case '--production-database':
      config.productionDatabase = args[++i];
      break;
    case '--production-user':
      config.productionUser = args[++i];
      break;
    case '--production-password':
      config.productionPassword = args[++i];
      break;
    case '--production-ssl':
      config.productionSsl = args[++i] === 'true';
      break;
    case '--skip-backup':
      config.skipBackup = true;
      break;
    case '--dry-run':
      config.dryRun = true;
      break;
    case '--tables':
      config.tables = args[++i].split(',').map(t => t.trim());
      break;
    case '--help':
    case '-h':
      console.log(`
Database Replication Script
===========================

Usage:
  node replicate-database.js [OPTIONS]

Options:
  --production-env <file>      Path to production .env file (default: .env.production)
  --production-host <host>     Production database host
  --production-port <port>     Production database port (default: 5432)
  --production-db <name>       Production database name
  --production-user <user>     Production database user
  --production-password <pass> Production database password
  --production-ssl <true|false> Use SSL for production connection (default: true)
  --skip-backup                Skip creating backup of production database
  --dry-run                    Show what would be done without actually doing it
  --tables <list>              Comma-separated list of tables to replicate (default: all)
  --help, -h                   Show this help message

Examples:
  # Use .env.production file
  node replicate-database.js

  # Use command-line arguments
  node replicate-database.js \\
    --production-host production.example.com \\
    --production-db my_database \\
    --production-user my_user \\
    --production-password my_password \\
    --production-ssl true

  # Dry run to see what would happen
  node replicate-database.js --dry-run

  # Only replicate specific tables
  node replicate-database.js --tables "users,products,orders"
      `);
      process.exit(0);
  }
}

// Load production environment variables if file specified
let productionEnv = {};
if (config.productionEnvFile) {
  if (!fs.existsSync(config.productionEnvFile)) {
    console.error(`❌ Error: Production env file not found: ${config.productionEnvFile}`);
    process.exit(1);
  }
  // Load production env vars
  const envContent = fs.readFileSync(config.productionEnvFile, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        productionEnv[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

// Get database configurations
function getLocalConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'prompt_generator',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
}

function getProductionConfig() {
  return {
    host: config.productionHost || productionEnv.DB_HOST || process.env.PROD_DB_HOST || 'localhost',
    port: config.productionPort || parseInt(productionEnv.DB_PORT || process.env.PROD_DB_PORT || '5432', 10),
    database: config.productionDatabase || productionEnv.DB_NAME || process.env.PROD_DB_NAME || 'prompt_generator',
    user: config.productionUser || productionEnv.DB_USER || process.env.PROD_DB_USER || 'postgres',
    password: config.productionPassword || productionEnv.DB_PASSWORD || process.env.PROD_DB_PASSWORD || '',
    ssl: config.productionSsl !== null 
      ? (config.productionSsl ? { rejectUnauthorized: false } : false)
      : (productionEnv.DB_SSL === 'true' || process.env.PROD_DB_SSL === 'true' 
        ? { rejectUnauthorized: false } 
        : false)
  };
}

// Table order for replication (respecting foreign key dependencies)
const TABLE_ORDER = [
  'users',
  'products',
  'discount_codes',
  'companies',
  'projects',
  'templates',
  'communities',
  'service_packages',
  'saved_prompts',
  'user_saved_templates',
  'usage_stats',
  'shared_prompts',
  'activity_logs',
  'orders'
];

// Utility functions
function log(message, type = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✓',
    error: '❌',
    warning: '⚠️',
    dry: '🔍 [DRY RUN]'
  }[type] || 'ℹ️';
  
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function testConnection(pool, name) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW(), current_database(), current_user');
      log(`Connected to ${name}: ${result.rows[0].current_database}@${result.rows[0].current_user}`, 'success');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    log(`Failed to connect to ${name}: ${error.message}`, 'error');
    return false;
  }
}

async function getTableList(pool, filterTables = null) {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  
  const result = await pool.query(query);
  let tables = result.rows.map(row => row.table_name);
  
  // Filter if specific tables requested
  if (filterTables) {
    tables = tables.filter(t => filterTables.includes(t));
    const missing = filterTables.filter(t => !tables.includes(t));
    if (missing.length > 0) {
      log(`Warning: Tables not found: ${missing.join(', ')}`, 'warning');
    }
  }
  
  // Sort by TABLE_ORDER
  tables.sort((a, b) => {
    const indexA = TABLE_ORDER.indexOf(a);
    const indexB = TABLE_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  return tables;
}

async function getTableRowCount(pool, tableName) {
  const escapedTableName = `"${tableName}"`;
  const result = await pool.query(`SELECT COUNT(*) as count FROM ${escapedTableName}`);
  return parseInt(result.rows[0].count, 10);
}

async function exportTableData(pool, tableName) {
  const escapedTableName = `"${tableName}"`;
  const result = await pool.query(`SELECT * FROM ${escapedTableName}`);
  return result.rows;
}

async function backupProductionDatabase(prodPool, prodConfig) {
  if (config.skipBackup || config.dryRun) {
    log('Skipping production database backup', 'warning');
    return null;
  }

  log('Creating backup of production database...', 'info');
  log('Note: For comprehensive backups, use pg_dump. This creates a metadata backup.', 'info');
  
  // Create backup directory
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(backupDir, `production-backup-${timestamp}.sql`);

  // Get all table data and schema
  const tables = await getTableList(prodPool);
  let backupSQL = `-- Production Database Backup (Metadata Only)\n`;
  backupSQL += `-- Generated: ${new Date().toISOString()}\n`;
  backupSQL += `-- Database: ${prodConfig.database}@${prodConfig.host}:${prodConfig.port}\n`;
  backupSQL += `-- Note: This is a metadata backup. For full backup, use: pg_dump -h ${prodConfig.host} -U ${prodConfig.user} -d ${prodConfig.database} > backup.sql\n\n`;

  // Get row counts for reference
  for (const table of tables) {
    const rowCount = await getTableRowCount(prodPool, table);
    log(`  Backing up metadata for table: ${table} (${rowCount} rows)`, 'info');
    backupSQL += `-- Table: ${table} (${rowCount} rows)\n`;
  }

  backupSQL += `\n-- Backup metadata complete. Actual data replication will occur next.\n`;

  fs.writeFileSync(backupFile, backupSQL, 'utf8');
  log(`Production backup metadata saved to: ${backupFile}`, 'success');
  log(`For full backup before replication, run: pg_dump -h ${prodConfig.host} -U ${prodConfig.user} -d ${prodConfig.database} -F c -f ${path.join(backupDir, `production-full-backup-${timestamp}.dump`)}`, 'info');
  
  return backupFile;
}

async function clearTable(pool, tableName) {
  // Disable foreign key checks temporarily (PostgreSQL style)
  await pool.query(`SET session_replication_role = replica`);
  // Escape table name
  const escapedTableName = `"${tableName}"`;
  await pool.query(`TRUNCATE TABLE ${escapedTableName} CASCADE`);
  await pool.query(`SET session_replication_role = DEFAULT`);
}

async function getTableSequences(pool, tableName) {
  // Get sequences for this table (for SERIAL columns)
  const query = `
    SELECT column_name, pg_get_serial_sequence($1, column_name) as sequence_name
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = $1
      AND column_default LIKE 'nextval%'
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows.map(row => ({
    column: row.column_name,
    sequence: row.sequence_name
  })).filter(seq => seq.sequence);
}

async function resetSequences(pool, tableName) {
  const sequences = await getTableSequences(pool, tableName);
  for (const seq of sequences) {
    if (seq.sequence) {
      // Reset sequence to max value in the table
      await pool.query(`
        SELECT setval($1, COALESCE((SELECT MAX($2) FROM ${tableName}), 1), true)
      `, [seq.sequence, seq.column]);
    }
  }
}

async function insertTableData(pool, tableName, data) {
  if (data.length === 0) {
    return;
  }

  // Get column names from first row
  const columns = Object.keys(data[0]);
  // Escape column names
  const columnList = columns.map(col => `"${col}"`).join(', ');
  
  // Build parameterized INSERT statements
  // For large datasets, we'll batch insert
  const batchSize = 100;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const values = [];
    const placeholders = [];
    
    batch.forEach((row, batchIndex) => {
      const rowPlaceholders = [];
      columns.forEach((col, colIndex) => {
        const paramIndex = batchIndex * columns.length + colIndex + 1;
        rowPlaceholders.push(`$${paramIndex}`);
        const value = row[col];
        // Handle null, undefined
        // Note: pg library automatically handles JavaScript objects for JSONB columns
        if (value === null || value === undefined) {
          values.push(null);
        } else {
          values.push(value);
        }
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });
    
    // Escape table name
    const escapedTableName = `"${tableName}"`;
    const query = `INSERT INTO ${escapedTableName} (${columnList}) VALUES ${placeholders.join(', ')}`;
    await pool.query(query, values);
  }
  
  // Reset sequences after inserting
  await resetSequences(pool, tableName);
}

async function replicateTable(localPool, prodPool, tableName) {
  log(`\nReplicating table: ${tableName}`, 'info');
  
  // Get local data
  const localRowCount = await getTableRowCount(localPool, tableName);
  log(`  Local rows: ${localRowCount}`, 'info');
  
  if (localRowCount === 0) {
    log(`  Skipping empty table`, 'warning');
    return { table: tableName, rows: 0 };
  }
  
  if (config.dryRun) {
    log(`  [DRY RUN] Would export ${localRowCount} rows and import to production`, 'dry');
    return { table: tableName, rows: localRowCount };
  }
  
  // Export data
  log(`  Exporting data from local database...`, 'info');
  const data = await exportTableData(localPool, tableName);
  
  // Clear production table
  log(`  Clearing production table...`, 'info');
  await clearTable(prodPool, tableName);
  
  // Insert data
  log(`  Inserting ${data.length} rows into production...`, 'info');
  await insertTableData(prodPool, tableName, data);
  
  // Verify
  const prodRowCount = await getTableRowCount(prodPool, tableName);
  if (prodRowCount === localRowCount) {
    log(`  ✓ Successfully replicated ${prodRowCount} rows`, 'success');
  } else {
    log(`  ⚠️ Row count mismatch: Local=${localRowCount}, Production=${prodRowCount}`, 'warning');
  }
  
  return { table: tableName, rows: prodRowCount };
}

async function main() {
  console.log('\n========================================');
  console.log('Database Replication Script');
  console.log('========================================\n');
  
  if (config.dryRun) {
    log('DRY RUN MODE - No changes will be made', 'dry');
  }
  
  // Get configurations
  const localConfig = getLocalConfig();
  const prodConfig = getProductionConfig();
  
  // Validate production config
  if (!config.productionEnvFile && !config.productionHost) {
    // Try to load .env.production by default
    if (fs.existsSync('.env.production')) {
      log('Found .env.production, using it for production config', 'info');
      const envContent = fs.readFileSync('.env.production', 'utf8');
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (key.trim().startsWith('DB_')) {
              productionEnv[key.trim()] = value;
            }
          }
        }
      });
      prodConfig.host = productionEnv.DB_HOST || prodConfig.host;
      prodConfig.database = productionEnv.DB_NAME || prodConfig.database;
      prodConfig.user = productionEnv.DB_USER || prodConfig.user;
      prodConfig.password = productionEnv.DB_PASSWORD || prodConfig.password;
      prodConfig.ssl = productionEnv.DB_SSL === 'true' ? { rejectUnauthorized: false } : prodConfig.ssl;
    } else {
      log('Production database configuration not provided!', 'error');
      log('Use --production-env, --production-host, or create .env.production file', 'error');
      log('Run with --help for usage information', 'info');
      process.exit(1);
    }
  }
  
  log(`Local DB: ${localConfig.database}@${localConfig.host}:${localConfig.port}`, 'info');
  log(`Production DB: ${prodConfig.database}@${prodConfig.host}:${prodConfig.port}`, 'info');
  
  // Confirm before proceeding
  if (!config.dryRun) {
    console.log('\n⚠️  WARNING: This will REPLACE all data in the production database!');
    const confirm = await askQuestion('Are you sure you want to continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      log('Replication cancelled', 'info');
      process.exit(0);
    }
  }
  
  // Create connection pools
  const localPool = new Pool(localConfig);
  const prodPool = new Pool(prodConfig);
  
  try {
    // Test connections
    log('\nTesting database connections...', 'info');
    const localConnected = await testConnection(localPool, 'Local');
    const prodConnected = await testConnection(prodPool, 'Production');
    
    if (!localConnected || !prodConnected) {
      log('Failed to establish database connections', 'error');
      process.exit(1);
    }
    
    // Backup production if not skipped
    let backupFile = null;
    if (!config.dryRun && !config.skipBackup) {
      backupFile = await backupProductionDatabase(prodPool, prodConfig);
    }
    
    // Get table list
    log('\nGetting table list...', 'info');
    const tables = await getTableList(localPool, config.tables);
    log(`Found ${tables.length} table(s) to replicate`, 'info');
    
    // Replicate each table
    log('\nStarting replication...', 'info');
    const results = [];
    
    for (const table of tables) {
      try {
        const result = await replicateTable(localPool, prodPool, table);
        results.push(result);
      } catch (error) {
        log(`Failed to replicate table ${table}: ${error.message}`, 'error');
        results.push({ table, rows: 0, error: error.message });
      }
    }
    
    // Summary
    console.log('\n========================================');
    console.log('Replication Summary');
    console.log('========================================\n');
    
    const totalRows = results.reduce((sum, r) => sum + (r.rows || 0), 0);
    const successCount = results.filter(r => !r.error).length;
    
    results.forEach(result => {
      if (result.error) {
        log(`${result.table}: FAILED - ${result.error}`, 'error');
      } else {
        log(`${result.table}: ${result.rows} rows`, 'success');
      }
    });
    
    console.log('\n========================================');
    log(`Total tables replicated: ${successCount}/${results.length}`, successCount === results.length ? 'success' : 'warning');
    log(`Total rows replicated: ${totalRows}`, 'info');
    
    if (backupFile) {
      log(`Production backup saved: ${backupFile}`, 'info');
    }
    
    if (config.dryRun) {
      log('\nThis was a DRY RUN - no changes were made', 'dry');
    } else {
      log('\nReplication completed successfully!', 'success');
    }
    
  } catch (error) {
    log(`Replication failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await localPool.end();
    await prodPool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };

