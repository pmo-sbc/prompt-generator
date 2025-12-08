# PostgreSQL Migration Guide

This guide will help you migrate from SQLite to PostgreSQL for both Windows 10 development and Ubuntu 22 production environments.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Windows 10 Setup](#windows-10-setup)
3. [Ubuntu 22 Setup](#ubuntu-22-setup)
4. [Database Migration](#database-migration)
5. [Code Updates](#code-updates)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js installed
- Access to your SQLite database file
- Admin/root access for PostgreSQL installation

## Windows 10 Setup

### Step 1: Install PostgreSQL

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. **Important**: Remember the password you set for the `postgres` user
4. Default port is `5432` (keep this unless you have conflicts)
5. **Note**: You can skip "Stack Builder" when prompted - it's optional and not needed for this migration
6. Complete the installation

### Step 2: Verify Installation

**Option A: Use SQL Shell (psql) shortcut** (Easiest)
- Open "SQL Shell (psql)" from the Start Menu
- This will work immediately without any PATH configuration

**Option B: Add PostgreSQL to PATH** (Recommended for convenience)
If `psql --version` doesn't work in PowerShell/Command Prompt, add PostgreSQL to your PATH:

1. Find your PostgreSQL installation path (usually `C:\Program Files\PostgreSQL\18\bin`)
2. Open System Properties → Environment Variables
3. Under "System variables", find "Path" and click "Edit"
4. Click "New" and add: `C:\Program Files\PostgreSQL\18\bin` (adjust version number if different)
5. Click OK on all dialogs
6. **Restart your terminal** and test:
   ```powershell
   psql --version
   ```

**Note**: If you don't want to modify PATH, you can always use the "SQL Shell (psql)" shortcut instead.

### Step 3: Create Database

1. Open "SQL Shell (psql)" from the Start Menu
2. Press Enter to accept defaults for:
   - Server: localhost
   - Database: postgres
   - Port: 5432
   - Username: postgres
3. Enter your PostgreSQL password when prompted
4. Run the following commands:

```sql
CREATE DATABASE prompt_generator;
\q
```

### Step 4: Update Environment Variables

Create or update your `.env` file:

```env
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prompt_generator
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
DB_SSL=false

# Keep your other environment variables (SESSION_SECRET, etc.)
```

## Ubuntu 22 Setup

### Step 1: Install PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
```

### Step 2: Start PostgreSQL Service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 3: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE prompt_generator;
CREATE USER prompt_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE prompt_generator TO prompt_user;
ALTER DATABASE prompt_generator OWNER TO prompt_user;
\q
```

### Step 4: Update Environment Variables

On your production server, update your `.env` file:

```env
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prompt_generator
DB_USER=prompt_user
DB_PASSWORD=your_secure_password_here
DB_SSL=false

# Keep your other environment variables
```

## Database Migration

### Step 1: Install Dependencies

```bash
npm install
```

This will install `pg` and `connect-pg-simple` packages.

### Step 2: Run Data Migration Script

We've created a migration script to transfer your data from SQLite to PostgreSQL:

```bash
node migrate-to-postgresql.js
```

This script will:
1. Connect to your SQLite database
2. Export all data
3. Connect to PostgreSQL
4. Create tables (if they don't exist)
5. Import all data

**Important**: Make a backup of your SQLite database before running the migration!

```bash
# Backup SQLite database
cp prompts.db prompts.db.backup
```

### Step 3: Verify Migration

After migration, verify your data:

```bash
# Connect to PostgreSQL
psql -U postgres -d prompt_generator

# Check table counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'saved_prompts', COUNT(*) FROM saved_prompts
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;
```

## Code Updates

### Repository Files

All repository files in `src/db/` have been updated to:
- Use PostgreSQL syntax (`$1, $2` instead of `?`)
- Use async/await
- Use `NOW()` instead of `datetime('now')`
- Use `RETURNING id` for inserts

### Route Handlers

You need to update route handlers to use `await` when calling repository methods. For example:

**Before:**
```javascript
const user = userRepository.findByUsernameOrEmail(username, email);
```

**After:**
```javascript
const user = await userRepository.findByUsernameOrEmail(username, email);
```

### Session Store

The session store has been updated to use PostgreSQL. The `server.js` file now uses `connect-pg-simple` instead of `better-sqlite3-session-store`.

## Testing

### Step 1: Test Database Connection

```bash
node test-postgresql-connection.js
```

### Step 2: Test Application

1. Start your application:
   ```bash
   npm start
   ```

2. Test key functionality:
   - User registration
   - User login
   - Creating prompts
   - Viewing orders
   - All CRUD operations

### Step 3: Check Logs

Monitor your application logs for any database errors:

```bash
tail -f logs/app.log
```

## Troubleshooting

### Connection Refused

**Error**: `Connection refused` or `ECONNREFUSED`

**Solution**:
- Verify PostgreSQL is running: `sudo systemctl status postgresql` (Ubuntu) or check Services (Windows)
- Check firewall settings
- Verify connection details in `.env`

### Authentication Failed

**Error**: `password authentication failed`

**Solution**:
- Verify username and password in `.env`
- Check PostgreSQL user permissions
- On Ubuntu, check `/etc/postgresql/*/main/pg_hba.conf`

### Table Already Exists

**Error**: `relation "users" already exists`

**Solution**:
- Tables are created automatically on first run
- If you need to reset, drop and recreate the database:
  ```sql
  DROP DATABASE prompt_generator;
  CREATE DATABASE prompt_generator;
  ```

### JSON Parsing Errors

**Error**: Issues with JSON/JSONB fields

**Solution**:
- PostgreSQL uses JSONB which automatically parses JSON
- Some repositories may need to handle JSON differently
- Check repository files for proper JSON handling

### Performance Issues

If you experience slow queries:

1. Check indexes are created (they should be created automatically)
2. Use `EXPLAIN ANALYZE` to analyze slow queries
3. Consider connection pooling settings in `src/config/index.js`

## Rollback Plan

If you need to rollback to SQLite:

1. Restore your SQLite backup
2. Revert `package.json` to use `better-sqlite3`
3. Revert `src/db/index.js` to SQLite version
4. Revert repository files to SQLite syntax
5. Run `npm install` and restart

## Next Steps

1. ✅ Install PostgreSQL (Windows/Ubuntu)
2. ✅ Update `.env` with PostgreSQL credentials
3. ✅ Run `npm install` to get new dependencies
4. ✅ Run migration script
5. ✅ Update route handlers to use `await`
6. ✅ Test thoroughly
7. ✅ Deploy to production

## Support

If you encounter issues:
1. Check PostgreSQL logs: `/var/log/postgresql/` (Ubuntu) or Event Viewer (Windows)
2. Check application logs
3. Verify all environment variables are set correctly
4. Ensure PostgreSQL service is running

