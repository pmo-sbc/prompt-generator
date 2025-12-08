# Database Backup & Restore Guide

This guide explains how to backup and restore your SQLite database.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Manual Backup](#manual-backup)
- [Automated Backups](#automated-backups)
- [Restoring from Backup](#restoring-from-backup)
- [Backup Storage](#backup-storage)
- [Troubleshooting](#troubleshooting)

---

## Overview

The application includes two scripts for database management:

- **`backup-database.js`** - Creates timestamped backups with automatic rotation
- **`restore-database.js`** - Restores database from any backup file

### Features:

✅ Timestamped backup files
✅ Automatic rotation (keeps last 7 days by default)
✅ Disk space management
✅ Interactive restore with backup selection
✅ Safety backup before restore
✅ Verification of backup integrity

---

## Manual Backup

### Create a Backup

Run the backup script manually:

```bash
node backup-database.js
```

**Output:**
```
=== SQLite Database Backup ===
Retention policy: 7 days

Starting database backup...
Source: E:\Documents\GitHub\website-with-auth-secured\database.sqlite (2.45 MB)
Destination: E:\Documents\GitHub\website-with-auth-secured\backups\database-backup-2025-10-20T14-30-00.sqlite
✓ Backup created successfully: database-backup-2025-10-20T14-30-00.sqlite
  Size: 2.45 MB

Found 5 backup file(s)
✓ No old backups to delete

Current backups (5):
  - database-backup-2025-10-20T14-30-00.sqlite (2.45 MB, created 10/20/2025, 2:30:00 PM)
  - database-backup-2025-10-19T14-30-00.sqlite (2.40 MB, created 10/19/2025, 2:30:00 PM)
  ...

=== Backup Complete ===
```

### What Happens:

1. Creates timestamped backup: `database-backup-YYYY-MM-DDTHH-MM-SS.sqlite`
2. Stores in `backups/` directory
3. Deletes backups older than 7 days
4. Shows list of current backups

---

## Automated Backups

### Windows (Task Scheduler)

#### 1. Open Task Scheduler
- Press `Win + R`, type `taskschd.msc`, press Enter

#### 2. Create Basic Task
- Click "Create Basic Task" in the right panel
- Name: `Database Backup - AI Prompt Templates`
- Description: `Daily backup of SQLite database`
- Click "Next"

#### 3. Set Trigger
- Select "Daily"
- Set start time (e.g., 2:00 AM)
- Recur every: 1 day
- Click "Next"

#### 4. Set Action
- Select "Start a program"
- Program/script: `node.exe` (or full path: `C:\Program Files\nodejs\node.exe`)
- Add arguments: `backup-database.js`
- Start in: `E:\Documents\GitHub\website-with-auth-secured`
- Click "Next" then "Finish"

#### 5. Configure Additional Settings
- Right-click the task → Properties
- Check "Run whether user is logged on or not"
- Check "Run with highest privileges"
- Click OK

### Linux/macOS (Cron Job)

#### 1. Edit Crontab

```bash
crontab -e
```

#### 2. Add Backup Job

**Daily at 2:00 AM:**
```bash
0 2 * * * cd /path/to/your/app && /usr/bin/node backup-database.js >> logs/backup.log 2>&1
```

**Every 6 hours:**
```bash
0 */6 * * * cd /path/to/your/app && /usr/bin/node backup-database.js >> logs/backup.log 2>&1
```

**Every Sunday at 3:00 AM:**
```bash
0 3 * * 0 cd /path/to/your/app && /usr/bin/node backup-database.js >> logs/backup.log 2>&1
```

#### 3. Verify Cron Job

```bash
crontab -l
```

### Docker (Add to docker-compose.yml)

```yaml
version: '3.8'

services:
  app:
    # ... your app config

  backup:
    image: node:18
    volumes:
      - ./:/app
    working_dir: /app
    command: sh -c "while true; do node backup-database.js && sleep 86400; done"
    restart: unless-stopped
```

---

## Restoring from Backup

### Interactive Restore

Run the restore script:

```bash
node restore-database.js
```

**You'll see:**
```
=== SQLite Database Restore ===

Available backups:

  1. database-backup-2025-10-20T14-30-00.sqlite
     Size: 2.45 MB | Created: 10/20/2025, 2:30:00 PM

  2. database-backup-2025-10-19T14-30-00.sqlite
     Size: 2.40 MB | Created: 10/19/2025, 2:30:00 PM

  3. database-backup-2025-10-18T14-30-00.sqlite
     Size: 2.38 MB | Created: 10/18/2025, 2:30:00 PM

Enter the number of the backup to restore (or "q" to quit):
```

**Select a backup:**
1. Enter the number (e.g., `1`)
2. Confirm with `yes`
3. Script will:
   - Create safety backup of current database
   - Restore selected backup
   - Verify restoration

### Direct Restore

Restore a specific backup file:

```bash
node restore-database.js backups/database-backup-2025-10-20T14-30-00.sqlite
```

### After Restore

⚠️ **Important:** Restart your application after restoring:

```bash
# Stop the app
Ctrl + C

# Start it again
npm start
```

---

## Backup Storage

### Local Storage

**Default location:** `./backups/`

**Retention policy:** 7 days (configurable in `backup-database.js`)

**Backup filename format:**
```
database-backup-2025-10-20T14-30-00.sqlite
                ^^^^-^^-^^T^^-^^-^^
                Year-Mo-DayTHr-Mn-Sc
```

### Change Retention Period

Edit `backup-database.js`:

```javascript
const RETENTION_DAYS = 14; // Keep backups for 14 days
```

### Off-site Backups (Recommended for Production)

#### Option 1: Cloud Storage Sync

**Windows (OneDrive/Google Drive/Dropbox):**
- Install cloud storage client
- Move `backups/` folder to synced location
- Update `BACKUP_DIR` in `backup-database.js`

**Linux (rclone):**
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure cloud storage
rclone config

# Add to crontab (after backup job)
0 3 * * * rclone sync /path/to/backups remote:backups
```

#### Option 2: AWS S3

Install AWS CLI and add to backup script:

```bash
# After creating backup
aws s3 sync ./backups/ s3://your-bucket/database-backups/
```

#### Option 3: SCP to Remote Server

```bash
# Add to crontab (after backup job)
0 3 * * * scp /path/to/backups/database-backup-*.sqlite user@remote-server:/backups/
```

---

## Troubleshooting

### Backup Script Won't Run

**Error:** `Error: Database file not found`

**Solution:**
- Verify `database.sqlite` exists in project root
- Check path in `backup-database.js` (line 13)

---

### Permission Denied

**Windows:**
- Run Task Scheduler as Administrator
- Set task to "Run with highest privileges"

**Linux:**
```bash
chmod +x backup-database.js
chmod 755 backups/
```

---

### Backups Taking Too Much Space

**Solution 1:** Reduce retention period

Edit `backup-database.js`:
```javascript
const RETENTION_DAYS = 3; // Keep only 3 days
```

**Solution 2:** Compress backups

```bash
# Linux/macOS
cd backups
gzip *.sqlite

# Windows (7-Zip)
7z a backups.7z backups/*.sqlite
```

---

### Restore Fails with "Invalid or corrupt database"

**Possible causes:**
- Backup was created while database was in use
- File corruption during copy

**Solution:**
1. Try an earlier backup
2. Check backup file size (should match original)
3. Verify backup wasn't created during a transaction

**Prevention:**
- Stop application before manual backups
- Use automated backups during low-traffic hours

---

### Cron Job Not Running

**Check cron service:**
```bash
sudo systemctl status cron
```

**Check cron logs:**
```bash
grep CRON /var/log/syslog
```

**Test cron command manually:**
```bash
cd /path/to/app && /usr/bin/node backup-database.js
```

**Common issues:**
- Wrong path to node (use `which node` to find it)
- Missing working directory (`cd` before command)
- No execute permissions

---

## Best Practices

### Production Recommendations

1. **Backup Frequency:**
   - High traffic: Every 6 hours
   - Medium traffic: Daily
   - Low traffic: Weekly

2. **Off-site Backups:**
   - Always keep backups in multiple locations
   - Use cloud storage for disaster recovery
   - Test restore process monthly

3. **Monitoring:**
   - Log backup results
   - Set up alerts for failed backups
   - Monitor backup storage space

4. **Testing:**
   - Test restore process regularly
   - Verify backup integrity
   - Document restore procedures

5. **Before Major Updates:**
   - Always create manual backup
   - Test on backup copy first
   - Keep backup until update is verified

---

## Manual Backup (Alternative)

If scripts aren't available, manually copy the database:

```bash
# Linux/macOS
cp database.sqlite backups/database-$(date +%Y-%m-%d).sqlite

# Windows (PowerShell)
Copy-Item database.sqlite "backups/database-$(Get-Date -Format 'yyyy-MM-dd').sqlite"
```

---

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review server console output
- See main project documentation

---

**Last Updated:** 2025-10-20
**Version:** 1.0.0
