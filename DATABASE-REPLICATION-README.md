# Database Replication Script

This script allows you to replicate your local PostgreSQL database to your production server.

## Overview

The `replicate-database.js` script:
- Exports all data from your local PostgreSQL database
- Optionally backs up your production database first
- Imports the data into your production database
- Handles foreign key dependencies automatically
- Provides detailed progress and summary information

## Prerequisites

1. **Node.js** installed (version 14+)
2. **PostgreSQL client libraries** (the `pg` npm package - already included)
3. **Access to both databases**:
   - Local database connection configured in `.env`
   - Production database credentials

## Setup

### Option 1: Use .env.production file (Recommended)

Create a `.env.production` file in your project root:

```env
# Production Database Configuration
DB_HOST=your-production-server.com
DB_PORT=5432
DB_NAME=prompt_generator
DB_USER=your_production_user
DB_PASSWORD=your_production_password
DB_SSL=true
```

### Option 2: Use command-line arguments

Pass production database credentials directly via command-line arguments.

## Usage

### Basic Usage (Using .env.production)

```bash
node replicate-database.js
```

Or on Windows PowerShell:

```powershell
.\replicate-database.ps1
```

### Using Command-Line Arguments

```bash
node replicate-database.js \
  --production-host production.example.com \
  --production-db my_database \
  --production-user my_user \
  --production-password my_password \
  --production-ssl true
```

### Windows PowerShell

```powershell
.\replicate-database.ps1 `
  -ProductionHost "production.example.com" `
  -ProductionDatabase "my_database" `
  -ProductionUser "my_user" `
  -ProductionPassword "my_password" `
  -ProductionSsl
```

### Dry Run (Preview Only)

To see what would be replicated without making any changes:

```bash
node replicate-database.js --dry-run
```

### Replicate Specific Tables Only

```bash
node replicate-database.js --tables "users,products,orders"
```

### Skip Production Backup

```bash
node replicate-database.js --skip-backup
```

## Command-Line Options

### Node.js Script

```
--production-env <file>       Path to production .env file (default: .env.production)
--production-host <host>      Production database host
--production-port <port>      Production database port (default: 5432)
--production-db <name>        Production database name
--production-user <user>      Production database user
--production-password <pass>  Production database password
--production-ssl <true|false> Use SSL for production connection
--skip-backup                 Skip creating backup of production database
--dry-run                     Show what would be done without actually doing it
--tables <list>               Comma-separated list of tables to replicate
--help, -h                    Show help message
```

### PowerShell Script

```
-ProductionEnvFile <file>     Path to production .env file (default: .env.production)
-ProductionHost <host>        Production database host
-ProductionPort <port>        Production database port
-ProductionDatabase <name>    Production database name
-ProductionUser <user>        Production database user
-ProductionPassword <pass>    Production database password
-ProductionSsl                Use SSL for production connection
-SkipBackup                   Skip creating backup of production database
-DryRun                       Show what would be done without actually doing it
-Tables <list>                Comma-separated list of tables to replicate
-Help                         Show help message
```

## How It Works

1. **Connection Testing**: Tests connections to both local and production databases
2. **Production Backup**: Creates a backup of production database (unless `--skip-backup` is used)
3. **Table Discovery**: Discovers all tables in the local database
4. **Data Export**: Exports data from local database tables
5. **Data Import**: Clears and imports data into production tables
6. **Verification**: Verifies row counts match between local and production

## Table Replication Order

Tables are replicated in dependency order to respect foreign key constraints:

1. `users`
2. `products`
3. `discount_codes`
4. `companies`
5. `projects`
6. `templates`
7. `communities`
8. `service_packages`
9. `saved_prompts`
10. `user_saved_templates`
11. `usage_stats`
12. `shared_prompts`
13. `activity_logs`
14. `orders`

## Safety Features

- **Confirmation Prompt**: Requires explicit confirmation before proceeding
- **Production Backup**: Automatically backs up production database before replication
- **Dry Run Mode**: Preview changes before applying them
- **Error Handling**: Stops on errors and reports what went wrong
- **Row Count Verification**: Verifies that data was replicated correctly

## Backup Files

Production backups are saved to:
```
backups/production-backup-YYYY-MM-DDTHH-MM-SS.sql
```

The backup directory is created automatically if it doesn't exist.

## Troubleshooting

### Connection Errors

**Problem**: "Failed to connect to Production database"

**Solutions**:
- Verify production database credentials
- Check network connectivity to production server
- Ensure PostgreSQL server is running and accessible
- Verify firewall rules allow connections
- Check SSL settings (try with `DB_SSL=false` for testing)

### Permission Errors

**Problem**: "Permission denied" errors

**Solutions**:
- Ensure the production database user has:
  - `SELECT` permission on all tables (for backup)
  - `TRUNCATE` permission on all tables (to clear data)
  - `INSERT` permission on all tables (to insert data)
- Consider granting superuser privileges temporarily for replication

### Foreign Key Constraint Errors

**Problem**: Foreign key constraint violations

**Solution**: The script automatically handles table order based on dependencies. If you still see errors:
- Ensure all referenced tables are being replicated
- Check that `--tables` includes all dependent tables if using that option

### Large Database Performance

**Problem**: Replication is slow or times out

**Solutions**:
- Replicate tables individually using `--tables`
- Increase PostgreSQL connection timeout settings
- Replicate during off-peak hours
- Consider using `pg_dump` and `pg_restore` for very large databases

## Examples

### Example 1: First-Time Setup

```bash
# Create .env.production with your credentials first
node replicate-database.js
```

### Example 2: Quick Update of Specific Tables

```bash
node replicate-database.js --tables "products,discount_codes" --skip-backup
```

### Example 3: Testing Connection Only

```bash
node replicate-database.js --dry-run
```

### Example 4: Using Environment Variables

```bash
export PROD_DB_HOST=production.example.com
export PROD_DB_NAME=my_db
export PROD_DB_USER=my_user
export PROD_DB_PASSWORD=my_pass
export PROD_DB_SSL=true
node replicate-database.js
```

## Important Notes

⚠️ **WARNING**: This script **REPLACES** all data in the production database with data from your local database. Make sure:

1. You have a current backup of production
2. You've tested the replication in a staging environment first
3. You understand which tables will be affected
4. You've verified your local database has the correct data

## Alternative Methods

For very large databases or more advanced scenarios, consider using PostgreSQL's native tools:

```bash
# Export from local
pg_dump -h localhost -U local_user -d local_db -F c -f backup.dump

# Import to production
pg_restore -h production_host -U prod_user -d prod_db -c backup.dump
```

However, the Node.js script provides better integration with your application's configuration and more user-friendly output.

## Support

If you encounter issues:
1. Run with `--dry-run` first to see what would happen
2. Check the console output for specific error messages
3. Verify database credentials and network connectivity
4. Ensure both databases have compatible schemas

