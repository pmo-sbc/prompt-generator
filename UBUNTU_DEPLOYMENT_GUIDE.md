# Ubuntu 22.04 Server Deployment Guide

Complete step-by-step guide for deploying the AI Prompt Templates application to a brand new Ubuntu 22.04 VM.

## Table of Contents
1. [Initial Server Setup](#initial-server-setup)
2. [Install Node.js](#install-nodejs)
3. [Install PostgreSQL](#install-postgresql)
4. [Setup Database](#setup-database)
5. [Deploy Application](#deploy-application)
6. [Configure Environment Variables](#configure-environment-variables)
7. [Initialize Database Schema](#initialize-database-schema)
8. [Setup Process Manager (PM2)](#setup-process-manager-pm2)
9. [Setup Nginx Reverse Proxy (Optional)](#setup-nginx-reverse-proxy-optional)
10. [Configure Firewall](#configure-firewall)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Initial Server Setup

### 1. Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Essential Tools

```bash
sudo apt install -y curl wget git build-essential
```

### 3. Create Application User (Optional)

**Option A: Create user with password (Recommended for easier access)**

```bash
# Create a dedicated user for the application
sudo adduser appuser

# Follow the prompts to set a password and user information
# You can press Enter to skip optional fields

# Add user to sudo group (if needed for admin tasks)
sudo usermod -aG sudo appuser

# Switch to the new user (will prompt for password)
su - appuser
```

**Option B: Create user without password (Use sudo instead)**

```bash
# Create a dedicated user for the application
sudo adduser --disabled-password --gecos "" appuser

# Add user to sudo group (if needed for admin tasks)
sudo usermod -aG sudo appuser

# Switch to the new user using sudo (no password needed)
sudo su - appuser
```

**Option C: Skip creating separate user (Use your current user)**

If you prefer to use your current user account, you can skip this step and continue with your existing user. Just make sure your user has sudo privileges.

---

## Install Node.js

### Option 1: Using NodeSource (Recommended - Latest LTS)

```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Option 2: Using Node Version Manager (nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js LTS
nvm install --lts
nvm use --lts

# Verify installation
node --version
npm --version
```

---

## Install PostgreSQL

### 1. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

### 2. Start and Enable PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Verify PostgreSQL is Running

```bash
sudo systemctl status postgresql
```

---

## Setup Database

### 1. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql
```

In the PostgreSQL prompt, run:

```sql
-- Create database
CREATE DATABASE prompt_generator;

-- Create user (replace 'your_secure_password' with a strong password)
CREATE USER prompt_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE prompt_generator TO prompt_user;

-- Make prompt_user the owner
ALTER DATABASE prompt_generator OWNER TO prompt_user;

-- Exit PostgreSQL
\q
```

### 2. Configure PostgreSQL Authentication (if needed)

If you need to allow local connections with password authentication:

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Find the line:
```
local   all             all                                     peer
```

Change it to:
```
local   all             all                                     md5
```

Then restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

**Note:** The version number (14) may differ. Check with: `ls /etc/postgresql/`

---

## Deploy Application

### 1. Create Application Directory

```bash
# Create directory for the application
sudo mkdir -p /var/www/prompt-generator
sudo chown $USER:$USER /var/www/prompt-generator
cd /var/www/prompt-generator
```

### 2. Transfer Application Files

**Option A: Using Git (Recommended)**

GitHub no longer supports password authentication. You need to use either a Personal Access Token (PAT) or SSH keys.

**Method 1: Using Personal Access Token (HTTPS)**

1. **Create a Personal Access Token on GitHub:**
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name (e.g., "Ubuntu Server Deployment")
   - Select scopes: `repo` (for private repos) or `public_repo` (for public repos)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Clone using the token:**
   ```bash
   # Replace YOUR_USERNAME, YOUR_REPO_NAME, and YOUR_TOKEN
   git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .
   
   # Example:
   # git clone https://ghp_xxxxxxxxxxxx@github.com/pmo-sbc/prompt-generator.git .
   ```

**Method 2: Using SSH Keys (More Secure)**

1. **Generate SSH key on the server:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Press Enter to accept default location
   # Optionally set a passphrase (recommended)
   ```

2. **Copy the public key:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the entire output
   ```

3. **Add SSH key to GitHub:**
   - Go to GitHub.com → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste your public key
   - Click "Add SSH key"

4. **Clone using SSH:**
   ```bash
   # Replace YOUR_USERNAME and YOUR_REPO_NAME
   git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git .
   
   # Example:
   # git clone git@github.com:pmo-sbc/prompt-generator.git .
   ```

**Note:** Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

**Option B: Using SCP (from your local machine)**

```bash
# From your local machine, compress the application
tar -czf prompt-generator.tar.gz --exclude='node_modules' --exclude='.git' --exclude='prompts.db' .

# Transfer to server
scp prompt-generator.tar.gz user@your-server-ip:/var/www/prompt-generator/

# On the server, extract
cd /var/www/prompt-generator
tar -xzf prompt-generator.tar.gz
rm prompt-generator.tar.gz
```

**Option C: Using rsync (from your local machine)**

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'prompts.db' \
  ./ user@your-server-ip:/var/www/prompt-generator/
```

### 3. Install Dependencies

```bash
cd /var/www/prompt-generator
npm install --production
```

**Note:** If you get errors about `better-sqlite3` in devDependencies, that's fine - it's not needed in production.

---

## Configure Environment Variables

### 1. Create .env File

```bash
cd /var/www/prompt-generator
nano .env
```

### 2. Add Environment Variables

Copy and paste the following, then update with your actual values:

```env
# Environment
NODE_ENV=production
PORT=3000

# Session Secret (REQUIRED - Generate a strong secret)
SESSION_SECRET=your-generated-secret-here

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prompt_generator
DB_USER=prompt_user
DB_PASSWORD=your_secure_password_here
DB_SSL=false

# Base URL (Your domain or IP)
BASE_URL=http://your-server-ip:3000
# Or if using domain with HTTPS:
# BASE_URL=https://yourdomain.com

# Email Configuration (Zapier Webhook)
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/your-webhook-id
ZAPIER_SECRET=your-zapier-secret-optional
EMAIL_FROM=AI Prompt Templates <noreply@yourdomain.com>

# Optional: Stripe Configuration (if using payments)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: PayPal Configuration (if using payments)
# PAYPAL_CLIENT_ID=...
# PAYPAL_CLIENT_SECRET=...
# PAYPAL_SANDBOX_MODE=false

# Optional: reCAPTCHA Configuration (if using)
# RECAPTCHA_SITE_KEY=...
# RECAPTCHA_SECRET_KEY=...
# RECAPTCHA_ENABLED=true
```

### 3. Generate Session Secret

```bash
# Generate a secure random session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as the value for `SESSION_SECRET` in your `.env` file.

### 4. Secure the .env File

```bash
# Set restrictive permissions (owner read/write only)
chmod 600 .env

# Verify permissions
ls -la .env  # Should show: -rw------- (600 permissions)
```

---

## Initialize Database Schema

The application will automatically create the database schema when it starts. However, if you want to verify or manually initialize:

```bash
cd /var/www/prompt-generator

# Test database connection
node -e "
const { initializeDatabase } = require('./src/db');
initializeDatabase()
  .then(() => {
    console.log('✅ Database initialized successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });
"
```

---

## Setup Process Manager (PM2)

PM2 keeps your application running and automatically restarts it if it crashes.

### 1. Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 2. Start Application with PM2

```bash
cd /var/www/prompt-generator
pm2 start server.js --name "prompt-generator"
```

### 3. Configure PM2 to Start on Boot

```bash
# Generate startup script
pm2 startup

# Follow the instructions it prints (usually involves running a sudo command)

# Save current PM2 process list
pm2 save
```

### 4. Useful PM2 Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs prompt-generator

# View logs in real-time
pm2 logs prompt-generator --lines 50

# Restart application
pm2 restart prompt-generator

# Stop application
pm2 stop prompt-generator

# Monitor resources
pm2 monit

# View detailed information
pm2 show prompt-generator
```

---

## Setup Nginx Reverse Proxy (Optional)

Nginx can act as a reverse proxy, handle SSL/TLS, and serve static files efficiently.

### 1. Install Nginx

```bash
sudo apt install -y nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/prompt-generator
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # Or use your server IP if no domain:
    # server_name your-server-ip;

    # Logging
    access_log /var/log/nginx/prompt-generator-access.log;
    error_log /var/log/nginx/prompt-generator-error.log;

    # Proxy to Node.js application
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

    # Increase timeouts for long-running requests
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

### 3. Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/prompt-generator /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Update BASE_URL in .env

If using Nginx, update your `.env` file:

```env
BASE_URL=http://your-domain.com
# Or if you set up SSL:
# BASE_URL=https://your-domain.com
```

Then restart the application:

```bash
pm2 restart prompt-generator
```

### 5. Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx and renew certificates
```

After SSL setup, update `.env`:

```env
BASE_URL=https://your-domain.com
```

---

## Configure Firewall

### 1. Check Firewall Status

```bash
sudo ufw status
```

### 2. Configure UFW (Uncomplicated Firewall)

```bash
# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow OpenSSH

# Allow HTTP (if using Nginx)
sudo ufw allow 'Nginx Full'
# Or if not using Nginx, allow direct access to port 3000:
# sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

**Important:** Make sure SSH is allowed before enabling the firewall, or you may lock yourself out!

---

## Testing

### 1. Test Database Connection

```bash
cd /var/www/prompt-generator
node -e "
const { initializeDatabase, getDatabaseWrapper } = require('./src/db');
initializeDatabase()
  .then(async () => {
    const db = getDatabaseWrapper();
    const result = await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"
```

### 2. Test Application Startup

```bash
cd /var/www/prompt-generator
node server.js
```

Press `Ctrl+C` to stop. If it starts without errors, proceed to use PM2.

### 3. Test via Browser

- **Without Nginx:** `http://your-server-ip:3000`
- **With Nginx:** `http://your-domain.com` or `http://your-server-ip`

### 4. Check Application Logs

```bash
# PM2 logs
pm2 logs prompt-generator

# Application logs (if configured)
tail -f /var/www/prompt-generator/logs/*.log
```

---

## Troubleshooting

### Application Won't Start

1. **Check PM2 logs:**
   ```bash
   pm2 logs prompt-generator --lines 100
   ```

2. **Check environment variables:**
   ```bash
   cd /var/www/prompt-generator
   node -e "require('dotenv').config(); console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');"
   ```

3. **Check database connection:**
   ```bash
   sudo -u postgres psql -d prompt_generator -c "SELECT 1;"
   ```

### Database Connection Errors

1. **Verify PostgreSQL is running:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Test connection manually:**
   ```bash
   psql -h localhost -U prompt_user -d prompt_generator
   ```

3. **Check .env file:**
   ```bash
   cat .env | grep DB_
   ```

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process if needed
sudo kill -9 <PID>
```

### Permission Errors

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/prompt-generator

# Fix permissions
chmod 600 .env
chmod 755 /var/www/prompt-generator
```

### Nginx 502 Bad Gateway

1. **Check if application is running:**
   ```bash
   pm2 status
   ```

2. **Check Nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/prompt-generator-error.log
   ```

3. **Verify proxy_pass URL matches your application port**

---

## Quick Reference Commands

```bash
# Application Management
pm2 start prompt-generator
pm2 stop prompt-generator
pm2 restart prompt-generator
pm2 logs prompt-generator
pm2 status

# Database Management
sudo -u postgres psql
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Nginx Management
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/prompt-generator-error.log

# Firewall Management
sudo ufw status
sudo ufw allow 3000/tcp
sudo ufw reload

# View Application Directory
cd /var/www/prompt-generator
ls -la
```

---

## Security Checklist

- [ ] `.env` file has `600` permissions
- [ ] Strong `SESSION_SECRET` is set
- [ ] Database password is strong and unique
- [ ] Firewall is configured and enabled
- [ ] SSH access is secured (consider disabling password auth, using keys)
- [ ] Application runs as non-root user
- [ ] SSL/TLS is configured (if using domain)
- [ ] Regular backups are configured for database
- [ ] PM2 is configured to restart on system reboot

---

## Next Steps

1. **Setup Database Backups:**
   ```bash
   # Create backup script
   sudo nano /usr/local/bin/backup-prompt-db.sh
   ```

2. **Setup Log Rotation:**
   - PM2 handles log rotation automatically
   - Application logs can be configured in `src/utils/logger.js`

3. **Monitor Application:**
   - Setup monitoring (e.g., PM2 Plus, New Relic, or custom monitoring)
   - Configure alerts for application downtime

4. **Regular Maintenance:**
   - Keep system packages updated: `sudo apt update && sudo apt upgrade`
   - Keep Node.js updated
   - Keep PostgreSQL updated
   - Review application logs regularly

---

## Support

If you encounter issues:

1. Check application logs: `pm2 logs prompt-generator`
2. Check system logs: `journalctl -u postgresql` or `journalctl -u nginx`
3. Verify all environment variables are set correctly
4. Test database connection independently
5. Check firewall rules

---

**Congratulations!** Your application should now be running on Ubuntu 22.04! 🎉

