# Fix for SQLite WAL Files Blocking Git Pull

## Problem
SQLite WAL files (`prompts.db-shm`, `prompts.db-wal`) are blocking `git pull` operations.

## Solution

### Step 1: Commit the updated .gitignore
The `.gitignore` file has been updated to include:
```
*.db-shm
*.db-wal
```

**On your local machine (where you made the changes):**
```bash
git add .gitignore
git commit -m "Add SQLite WAL files to .gitignore"
git push origin main
```

### Step 2: On the server - Remove files from git tracking (if they exist)
If these files were previously tracked by git, remove them:

```bash
cd /var/www/website-with-auth-secured

# Remove from git index (keeps local files)
git rm --cached prompts.db-shm prompts.db-wal 2>/dev/null || true

# Now pull should work
git pull origin main
```

### Step 3: Configure git to handle untracked files automatically
Add this git config to automatically handle this situation:

```bash
cd /var/www/website-with-auth-secured

# Configure git to automatically remove untracked files that would be overwritten
git config merge.ours.driver true

# Or use this approach - stash untracked files during pull
git config pull.rebase false
git config merge.tool true
```

### Step 4: Alternative - Use git pull with force
If you want to keep the files but allow pull to overwrite them:

```bash
# This will overwrite local untracked files with remote versions (if they exist)
git pull origin main --allow-unrelated-histories

# Or use this to keep local files
git pull origin main -X ours
```

## Recommended Permanent Solution

**On the server, create a git alias for easier pulls:**

```bash
cd /var/www/website-with-auth-secured

# Create an alias that handles WAL files automatically
git config alias.pull-safe '!f() { \
  if [ -f prompts.db-shm ] || [ -f prompts.db-wal ]; then \
    mv prompts.db-shm prompts.db-shm.tmp 2>/dev/null; \
    mv prompts.db-wal prompts.db-wal.tmp 2>/dev/null; \
    git pull origin main; \
    mv prompts.db-shm.tmp prompts.db-shm 2>/dev/null; \
    mv prompts.db-wal.tmp prompts.db-wal 2>/dev/null; \
  else \
    git pull origin main; \
  fi \
}; f'

# Now you can use:
git pull-safe
```

## Best Practice

Since these are temporary SQLite files that are automatically recreated, the simplest solution is:

1. **Ensure `.gitignore` is committed and pushed** (already done)
2. **On server, if files block pull, temporarily move them:**
   ```bash
   # One-liner that handles everything
   (mv prompts.db-shm prompts.db-shm.tmp 2>/dev/null; mv prompts.db-wal prompts.db-wal.tmp 2>/dev/null; git pull origin main; mv prompts.db-shm.tmp prompts.db-shm 2>/dev/null; mv prompts.db-wal.tmp prompts.db-wal 2>/dev/null;)
   ```

3. **Or simply let SQLite recreate them** (they're temporary):
   ```bash
   # Stop the app, remove files, pull, restart (SQLite will recreate them)
   pm2 stop ai-prompt-templates
   rm -f prompts.db-shm prompts.db-wal
   git pull origin main
   pm2 start ai-prompt-templates
   ```

## Why This Happens

SQLite WAL files are created automatically when:
- Database is in WAL mode (which we enabled for better concurrency)
- Database is actively being used
- They're temporary and safe to remove/recreate

The files will be automatically recreated by SQLite when the database is accessed again.

