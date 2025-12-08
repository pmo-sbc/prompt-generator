# Database Migration Instructions

## Problem
Your production database is missing the following columns:
- `password_reset_token`
- `password_reset_token_expires`
- `is_admin` (possibly)

This causes the "no such column: password_reset_token" error when trying to send password reset emails.

## Solution

Run the migration script to add the missing columns to your production database.

### Steps:

1. **Stop your production server** (important to prevent database locks)

2. **Backup your database** (safety first!)
   ```bash
   # On your production server
   cp prompts.db prompts.db.backup
   ```

3. **Run the migration script**
   ```bash
   node migrate-add-password-reset.js
   ```

   If your database is in a different location, specify it:
   ```bash
   DB_PATH=/path/to/your/database.sqlite node migrate-add-password-reset.js
   ```

4. **Verify the migration**
   You should see output like:
   ```
   Migrating database: /path/to/database.sqlite
   Starting migration...

   Adding password_reset_token column...
   ✓ Added password_reset_token column
   Adding password_reset_token_expires column...
   ✓ Added password_reset_token_expires column
   Adding is_admin column...
   ✓ Added is_admin column
   ✓ Set user "yourname" (ID: 1) as admin

   ✓ Migration completed successfully!
   Your database now supports:
     - Password reset functionality
     - Admin user management
   ```

5. **Restart your production server**
   ```bash
   npm start
   # or
   pm2 restart your-app-name
   ```

6. **Test the features**
   - Go to `/admin-users.html`
   - Try sending a password reset email
   - Test the other admin features

## What the migration does:

1. Checks if the columns already exist (safe to run multiple times)
2. Adds `password_reset_token` column (TEXT)
3. Adds `password_reset_token_expires` column (DATETIME)
4. Adds `is_admin` column (BOOLEAN, defaults to 0)
5. Automatically makes your first user an admin if no admin exists
6. Verifies all columns were added successfully

## Rollback (if needed):

If something goes wrong, restore from backup:
```bash
cp prompts.db.backup prompts.db
```

## Notes:

- The migration is **idempotent** - safe to run multiple times
- It will skip columns that already exist
- Your data is preserved - only new columns are added
- The first user will be made an admin automatically
