# Production Deployment Guide

This guide provides step-by-step instructions for deploying the AI Prompt Templates application to a production server.

## Prerequisites

- Node.js 14+ installed on production server
- SQLite3 installed
- Access to production server via SSH
- Domain name configured (optional)
- SSL certificate (recommended for production)

## Database Migration

### Option 1: Using the SQL Export File (Recommended)

1. **Export the database from development** (Already done):
   ```bash
   node export-database.js
   ```
   This creates `database-export.sql` with your complete database schema and data.

2. **Transfer files to production**:
   ```bash
   scp database-export.sql user@production-server:/path/to/app/
   scp import-database.js user@production-server:/path/to/app/
   ```

3. **On the production server, import the database**:
   ```bash
   cd /path/to/app

   # If the app is already running, stop it first
   pm2 stop ai-prompt-templates  # or kill the process if not using PM2

   # Run the import script
   node import-database.js

   # Restart the app after import
   pm2 start ai-prompt-templates
   ```

   This script will:
   - Automatically backup any existing database
   - Import all tables and data
   - Verify the import was successful
   - Show you the imported table counts

### Option 2: Copy the Entire Database File

1. **Transfer the database file directly**:
   ```bash
   scp prompts.db user@production-server:/path/to/app/
   ```

## Application Deployment

### Step 1: Transfer Application Files

Upload all necessary files to the production server:

```bash
# Create a tarball of the application (excluding node_modules and database)
tar -czf app.tar.gz \
  --exclude='node_modules' \
  --exclude='prompts.db' \
  --exclude='.git' \
  --exclude='*.log' \
  package.json \
  package-lock.json \
  server.js \
  src/ \
  public/ \
  .env.example

# Transfer to production
scp app.tar.gz user@production-server:/path/to/app/

# On production server
cd /path/to/app
tar -xzf app.tar.gz
rm app.tar.gz
```

### Step 2: Install Dependencies

On the production server:

```bash
cd /path/to/app
npm install --production
```

### Step 3: Configure Environment Variables

Create a `.env` file on the production server:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Update the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Session Configuration
SESSION_SECRET=your-secure-random-secret-key-here

# Security
BCRYPT_ROUNDS=12

# SMTP Configuration (for email verification)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-email-password

# Application URL
APP_URL=https://yourdomain.com
```

**Important**: Generate a strong SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Database Setup

If you haven't already imported the database:

```bash
cd /path/to/app

# Option A: Use the import script (Recommended)
node import-database.js

# Option B: Let the app create it (will be empty)
# Just start the app and it will create the database automatically
```

### Step 5: Verify Database Schema

Check that the database has all required tables including the tokens column:

```bash
sqlite3 prompts.db "PRAGMA table_info(users);"
```

You should see a `tokens` column with `INTEGER` type and default value of `100`.

### Step 6: Start the Application

#### Option A: Using PM2 (Recommended)

PM2 is a production process manager for Node.js applications:

```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the application
pm2 start server.js --name "ai-prompt-templates"

# Save PM2 process list and configure to restart on boot
pm2 save
pm2 startup

# View logs
pm2 logs ai-prompt-templates

# Monitor the application
pm2 monit

# Restart the application
pm2 restart ai-prompt-templates

# Stop the application
pm2 stop ai-prompt-templates
```

#### Option B: Using systemd

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/ai-prompt-templates.service
```

Add the following content:

```ini
[Unit]
Description=AI Prompt Templates
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable ai-prompt-templates
sudo systemctl start ai-prompt-templates
sudo systemctl status ai-prompt-templates

# View logs
sudo journalctl -u ai-prompt-templates -f
```

#### Option C: Using nohup (Simple but not recommended for production)

```bash
nohup node server.js > app.log 2>&1 &
```

## Nginx Reverse Proxy (Recommended)

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Configure Nginx

Create a new Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/ai-prompt-templates
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL is configured)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ai-prompt-templates /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate Setup (HTTPS)

Using Let's Encrypt (free SSL):

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certificate auto-renewal is configured automatically
# Test auto-renewal:
sudo certbot renew --dry-run
```

## Firewall Configuration

```bash
# Allow SSH (if not already allowed)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Post-Deployment Tasks

### 1. Create Admin Account

Log into your application and register an admin account, or update the database:

```bash
sqlite3 prompts.db

UPDATE users SET is_admin = 1 WHERE email = 'your-admin-email@domain.com';
.exit
```

### 2. Update All Users' Tokens

If you have existing users without tokens:

```bash
node update-user-tokens.js
```

### 3. Test the Application

- Visit your domain: `https://yourdomain.com`
- Test user registration and email verification
- Test login functionality
- Test prompt generation (verify tokens are deducted)
- Test admin panel at `/admin/users`
- Test token addition feature in admin panel

## Backup Strategy

### Daily Database Backup Script

Create a backup script:

```bash
nano backup-database.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="/path/to/app/prompts.db"
BACKUP_FILE="$BACKUP_DIR/prompts_$DATE.db"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Copy database
cp $DB_FILE $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "prompts_*.db.gz" -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Make it executable and schedule with cron:

```bash
chmod +x backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1
```

## Monitoring and Maintenance

### Application Health Check

```bash
# Check if app is running
pm2 status

# View recent logs
pm2 logs ai-prompt-templates --lines 100

# Monitor resource usage
pm2 monit
```

### Database Maintenance

```bash
# Optimize database (run periodically)
sqlite3 prompts.db "VACUUM;"

# Check database integrity
sqlite3 prompts.db "PRAGMA integrity_check;"

# View database size
du -h prompts.db
```

### Log Rotation

Configure log rotation to prevent logs from consuming too much disk space:

```bash
sudo nano /etc/logrotate.d/ai-prompt-templates
```

```
/path/to/app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 your-username your-username
}
```

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs ai-prompt-templates

# Common issues:
# 1. Port already in use - change PORT in .env
# 2. Missing dependencies - run npm install
# 3. Database permissions - check file ownership
# 4. Missing .env file - create from .env.example
```

### Database errors

```bash
# Check database file exists and has correct permissions
ls -la prompts.db

# Fix permissions if needed
chmod 644 prompts.db

# Verify database integrity
sqlite3 prompts.db "PRAGMA integrity_check;"
```

### Email not sending

- Verify SMTP credentials in .env
- Check SMTP_HOST and SMTP_PORT are correct
- Test SMTP connection:
  ```bash
  node -e "require('./src/services/emailService').testConnection()"
  ```

## Security Checklist

- [ ] Strong SESSION_SECRET configured in .env
- [ ] HTTPS/SSL certificate installed and working
- [ ] Firewall configured and enabled
- [ ] Default passwords changed
- [ ] Admin account created with strong password
- [ ] Email verification working
- [ ] Rate limiting configured
- [ ] Database backups scheduled
- [ ] Log rotation configured
- [ ] Server updates applied
- [ ] PM2 process monitoring active

## Quick Commands Reference

```bash
# Restart application
pm2 restart ai-prompt-templates

# View logs
pm2 logs ai-prompt-templates

# Export database
node export-database.js

# Update user tokens
node update-user-tokens.js

# Backup database manually
cp prompts.db prompts_backup_$(date +%Y%m%d).db

# Check app status
pm2 status

# Restart Nginx
sudo systemctl restart nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Support and Updates

For updates and support:
1. Pull latest changes from repository
2. Run `npm install` to update dependencies
3. Run any migration scripts if needed
4. Restart the application: `pm2 restart ai-prompt-templates`

## Migration Checklist

Use this checklist when deploying:

- [ ] Database exported from development
- [ ] Application files transferred to production
- [ ] Dependencies installed with `npm install --production`
- [ ] .env file configured with production values
- [ ] Database imported/created on production
- [ ] Application started with PM2 or systemd
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed and working
- [ ] Firewall rules configured
- [ ] Admin account created
- [ ] All users have 100 tokens
- [ ] Backup script configured and tested
- [ ] Log rotation configured
- [ ] Application tested and working
- [ ] Monitoring setup complete

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Production URL**: _____________

**Notes**: _____________
