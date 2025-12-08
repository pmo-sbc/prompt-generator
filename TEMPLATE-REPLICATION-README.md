# Template Replication Guide

This guide explains how to replicate all templates from your local database to production.

## Overview

The `replicate-templates.js` script copies all templates from your local database to the production database, updating existing templates and inserting new ones.

## Prerequisites

- Node.js installed
- `pg` package installed (`npm install pg`)
- Access to both local and production PostgreSQL databases
- Database credentials configured

## Configuration

### Option 1: Environment Variables

Set these in your `.env` file or environment:

**Local Database (uses existing config):**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

**Production Database:**
- `PROD_DB_HOST`, `PROD_DB_PORT`, `PROD_DB_NAME`, `PROD_DB_USER`, `PROD_DB_PASSWORD`

### Option 2: .env.production File

Create a `.env.production` file in the project root:

```
DB_HOST=your-production-host
DB_PORT=5432
DB_NAME=prompt_generator
DB_USER=postgres
DB_PASSWORD=your-password
```

### Option 3: Command Line Arguments

Pass production credentials via command line:

```bash
node replicate-templates.js \
  --production-host=prod-server.com \
  --production-port=5432 \
  --production-database=prompt_generator \
  --production-user=postgres \
  --production-password=your-password
```

## Usage

### Basic Usage

```bash
# Replicate all templates to production
node replicate-templates.js
```

### Dry Run (Preview Changes)

```bash
# See what would be changed without making any changes
node replicate-templates.js --dry-run
```

### Skip Backup

```bash
# Don't create a backup table (faster, but less safe)
node replicate-templates.js --skip-backup
```

### Windows PowerShell

```powershell
# Dry run
.\replicate-templates.ps1 -DryRun

# Full replication
.\replicate-templates.ps1 -ProductionHost prod-server.com
```

## What It Does

1. **Connects** to both local and production databases
2. **Fetches** all templates from local database
3. **Creates backup** of production templates (unless `--skip-backup`)
4. **Updates** existing templates in production (by ID)
5. **Inserts** new templates that don't exist in production
6. **Verifies** replication was successful

## Template Fields Replicated

The following fields are copied:
- `id` - Template ID
- `name` - Template name
- `category` - Category
- `subcategory` - Subcategory
- `description` - Description
- `prompt_template` - The actual prompt template text
- `inputs` - Input field definitions (JSONB)
- `is_premium` - Premium flag
- `is_active` - Active flag
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

## Safety Features

1. **Backup**: Automatically creates a backup table before making changes
2. **Dry Run**: Test mode to preview changes
3. **Error Handling**: Continues processing even if individual templates fail
4. **Verification**: Checks template count after replication
5. **Transaction Safe**: Each template is updated individually

## Example Output

```
=== Template Replication Script ===

Local Database:
  Host: localhost
  Database: prompt_generator
  User: postgres

Production Database:
  Host: prod-server.com
  Database: prompt_generator
  User: postgres

Testing database connections...
✓ Local database connected
✓ Production database connected

Fetching templates from local database...
✓ Found 198 templates in local database

Fetching existing templates from production database...
✓ Found 195 existing templates in production

Creating backup of production templates...
✓ Backup created

Replicating templates...

✓ Updated: YouTube Title & Descriptions (ID: 111)
✓ Updated: Facebook Group Post (ID: 77)
✓ Inserted: New Template (ID: 199)
...

=== Summary ===
Total templates processed: 198
  ✓ Updated: 195
  ✓ Inserted: 3
  ✗ Errors/Skipped: 0

Verifying replication...
✓ Production database now has 198 templates

✅ Template replication completed!
```

## Troubleshooting

### Connection Errors

**Error: "Connection refused"**
- Check database host and port
- Verify database is running
- Check firewall rules

**Error: "Authentication failed"**
- Verify username and password
- Check PostgreSQL authentication settings

### Template Errors

**Error: "duplicate key value violates unique constraint"**
- Template ID already exists with different name
- Check for ID conflicts

**Error: "invalid input syntax for type jsonb"**
- Template has invalid JSON in `inputs` field
- Script will skip and continue

### Permission Errors

**Error: "permission denied for table templates"**
- User needs UPDATE and INSERT permissions on `templates` table
- Grant permissions: `GRANT ALL ON templates TO your_user;`

## Comparison with Full Database Replication

This script is different from `replicate-database.js`:
- **This script**: Only replicates templates (faster, safer)
- **Full replication**: Replicates entire database (all tables)

Use this script when you only want to update templates without affecting other data.

## Best Practices

1. **Always do a dry run first**: `--dry-run`
2. **Backup production**: Script creates backup, but consider manual backup too
3. **Test locally**: Ensure templates work correctly before replicating
4. **Monitor output**: Check for errors in the summary
5. **Verify after**: Test a few templates in production to confirm

## Advanced Usage

### Replicate Specific Categories

Modify the script to filter by category:
```javascript
const localTemplates = await localPool.query(
  'SELECT * FROM templates WHERE category = $1 ORDER BY id',
  ['Social Media']
);
```

### Compare Before Replicating

```bash
# Export local templates
psql -h localhost -U postgres -d prompt_generator -c "SELECT id, name FROM templates ORDER BY id" > local-templates.txt

# Export production templates
psql -h prod-host -U postgres -d prompt_generator -c "SELECT id, name FROM templates ORDER BY id" > prod-templates.txt

# Compare
diff local-templates.txt prod-templates.txt
```

