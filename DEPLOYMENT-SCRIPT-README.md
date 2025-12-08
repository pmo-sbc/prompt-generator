# Production Deployment Scripts

This directory contains deployment scripts for deploying the AI Prompt Templates application to production.

## Available Scripts

### 1. `deploy-production.sh` (Linux/macOS)
Bash script for deploying on Unix-like systems (Linux, macOS, WSL).

### 2. `deploy-production.ps1` (Windows)
PowerShell script for deploying on Windows systems.

## Quick Start

### Linux/macOS/WSL:
```bash
# Make script executable (first time only)
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh

# Or with options
./deploy-production.sh --use-git --skip-backup
```

### Windows:
```powershell
# Run deployment
.\deploy-production.ps1

# Or with options
.\deploy-production.ps1 -UseGit -SkipBackup
```

## Script Options

### Common Options

| Option | Description |
|--------|-------------|
| `--skip-backup` / `-SkipBackup` | Skip database backup before deployment |
| `--skip-install` / `-SkipInstall` | Skip npm install (faster if dependencies unchanged) |
| `--skip-migrations` / `-SkipMigrations` | Skip running database migrations |
| `--use-git` / `-UseGit` | Pull latest changes from git before deploying |
| `--no-pm2` / `-NoPm2` | Don't use PM2 (use nohup/background job instead) |
| `--rollback` / `-Rollback` | Rollback to previous version |
| `--help` / `-Help` | Show help message |

### Advanced Options (Bash only)

| Option | Description |
|--------|-------------|
| `--app-dir=DIR` | Specify application directory |
| `--backup-dir=DIR` | Specify backup directory |

## Deployment Process

The scripts perform the following steps:

1. **Prerequisites Check**
   - Verifies Node.js 14+ is installed
   - Verifies npm is installed
   - Checks for PM2 (installs if missing and using PM2)
   - Verifies .env file exists
   - Checks for package.json

2. **Database Backup**
   - Creates timestamped backup of `prompts.db`
   - Compresses backup (Linux/macOS)
   - Keeps last 10 backups

3. **Stop Application**
   - Stops running PM2 process (if using PM2)
   - Or stops Node.js processes (if not using PM2)

4. **Pull Latest Changes** (if `--use-git` / `-UseGit`)
   - Pulls from git repository
   - Warns about uncommitted changes

5. **Install Dependencies**
   - Runs `npm ci --production` (or `npm install --production`)

6. **Run Migrations** (optional)
   - Lists migration files
   - Note: Migrations are not auto-run for safety

7. **Start Application**
   - Starts with PM2 (recommended)
   - Or starts in background

8. **Verify Deployment**
   - Checks if application is running
   - Tests health endpoint (if available)

9. **Show Summary**
   - Displays deployment information
   - Shows useful commands

## Usage Examples

### Standard Deployment (PM2, with backup)
```bash
./deploy-production.sh
```

### Deployment with Git Pull
```bash
./deploy-production.sh --use-git
```

### Fast Deployment (skip backup and install)
```bash
./deploy-production.sh --skip-backup --skip-install
```

### Deployment without PM2
```bash
./deploy-production.sh --no-pm2
```

### Rollback to Previous Version
```bash
./deploy-production.sh --rollback
```

## Environment Variables

You can set these environment variables (Bash only):

- `APP_DIR` - Application directory (default: current directory)
- `BACKUP_DIR` - Backup directory (default: `./backups`)
- `LOG_FILE` - Log file path (default: `./deployment.log`)

## Prerequisites

Before running the deployment script:

1. **Node.js 14+** installed
2. **npm** installed
3. **PM2** (optional, will be installed if missing)
4. **.env file** configured with production settings
5. **Database** (`prompts.db`) exists

## Post-Deployment

After deployment:

1. **Verify the application is running:**
   ```bash
   pm2 status
   pm2 logs ai-prompt-templates
   ```

2. **Test the application:**
   - Visit your production URL
   - Test key functionality
   - Check logs for errors

3. **Monitor the application:**
   ```bash
   pm2 monit
   ```

## Rollback

If something goes wrong, you can rollback:

```bash
./deploy-production.sh --rollback
```

This will:
- Stop the current application
- Restore the database from the latest backup
- Restart the application

## Troubleshooting

### Script fails with "Node.js not found"
- Install Node.js 14+ from https://nodejs.org/
- Verify installation: `node -v`

### Script fails with "PM2 not found"
- PM2 will be auto-installed, or install manually: `npm install -g pm2`

### Application won't start
- Check logs: `pm2 logs ai-prompt-templates`
- Verify .env file exists and is configured correctly
- Check if port is already in use: `lsof -i :3000` (Linux/macOS) or `netstat -ano | findstr :3000` (Windows)

### Database errors
- Verify database file exists: `ls -la prompts.db`
- Check database integrity: `sqlite3 prompts.db "PRAGMA integrity_check;"`
- Restore from backup if needed

### Permission errors
- On Linux/macOS: `chmod +x deploy-production.sh`
- Check file permissions: `ls -l deploy-production.sh`
- Run with appropriate user permissions

## Best Practices

1. **Always backup before deploying**
   - Don't use `--skip-backup` unless you're certain

2. **Test in staging first**
   - Deploy to staging environment before production

3. **Use PM2 for production**
   - PM2 provides process management and auto-restart
   - Don't use `--no-pm2` in production unless necessary

4. **Monitor after deployment**
   - Watch logs for a few minutes after deployment
   - Verify all functionality works

5. **Keep backups**
   - Backups are automatically retained (last 10)
   - Don't delete backup directory

6. **Version control**
   - Use `--use-git` to pull latest changes
   - Ensure all changes are committed before deploying

## Security Notes

- Scripts don't modify sensitive files (like .env)
- Database backups are created locally
- No remote operations (unless using git pull)
- Always review changes before deploying

## Support

For issues or questions:
1. Check the deployment log: `deployment.log`
2. Review PM2 logs: `pm2 logs ai-prompt-templates`
3. Check application logs in `logs/` directory
4. Verify .env configuration

## Related Documentation

- [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) - Detailed deployment guide
- [PRODUCTION-SETUP-GUIDE.md](./PRODUCTION-SETUP-GUIDE.md) - Initial production setup
- [BACKUP-GUIDE.md](./BACKUP-GUIDE.md) - Database backup guide

