# Production Server Setup Guide

Complete guide for setting up secure environment variables on your production server.

## Quick Start

### 1. Generate Session Secret

Run the generator script on your production server:

```bash
cd /var/www/website-with-auth-secured
node generate-session-secret.js
```

This will generate multiple secure random secrets. Copy the **RECOMMENDED** one (128 characters).

### 2. Set Up Environment Variables

Create or edit the `.env` file on your production server:

```bash
nano /var/www/website-with-auth-secured/.env
```

Add the following (replace with your actual values):

```env
# Environment
NODE_ENV=production

# Session Secret (REQUIRED - Use output from generate-session-secret.js)
SESSION_SECRET=your-generated-secret-here

# Database
DATABASE_PATH=./prompts.db

# Server
PORT=3000
BASE_URL=https://yourdomain.com

# Email Configuration
SMTP_HOST=smtp.sbc-servicesinc.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=pmo@sbc-servicesinc.com
SMTP_PASSWORD=your-email-password
EMAIL_FROM=SBC Services <pmo@sbc-servicesinc.com>

# Email TLS Settings (if needed)
SMTP_TLS_REJECT_UNAUTHORIZED=false

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Secure the .env File

**CRITICAL SECURITY STEP:**

```bash
# Set restrictive permissions (owner read/write only)
chmod 600 /var/www/website-with-auth-secured/.env

# Set correct ownership
sudo chown www-data:www-data /var/www/website-with-auth-secured/.env
# or if using your user:
sudo chown $USER:$USER /var/www/website-with-auth-secured/.env
```

### 4. Verify Environment Variables Load

Test that environment variables are loading correctly:

```bash
cd /var/www/website-with-auth-secured
node -e "require('dotenv').config(); console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ SET' : '❌ NOT SET')"
```

### 5. Restart Application

```bash
# If using PM2:
pm2 restart all

# If using systemd:
sudo systemctl restart your-app-name

# If running directly:
# Stop the current process (Ctrl+C) and restart
npm start
```

## Method 1: Using .env File (Recommended)

This is the easiest and most common method.

### Step-by-Step:

1. **Upload files to production:**
   ```bash
   # From your local machine
   scp generate-session-secret.js user@your-server:/var/www/website-with-auth-secured/
   ```

2. **SSH into production server:**
   ```bash
   ssh user@your-server
   cd /var/www/website-with-auth-secured
   ```

3. **Generate secret:**
   ```bash
   node generate-session-secret.js
   ```

4. **Create .env file:**
   ```bash
   nano .env
   ```

5. **Add environment variables** (copy from generate-session-secret.js output)

6. **Secure the file:**
   ```bash
   chmod 600 .env
   ```

7. **Verify:**
   ```bash
   cat .env  # Should see your variables
   ls -la .env  # Should show: -rw------- (600 permissions)
   ```

8. **Restart app:**
   ```bash
   pm2 restart all
   ```

## Method 2: One-Liner Commands

For quick setup directly on the server:

### Generate and Add Session Secret in One Command:

```bash
cd /var/www/website-with-auth-secured

# Generate and append to .env
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env

# Secure the file
chmod 600 .env

# Restart application
pm2 restart all
```

### Complete .env Setup One-Liner:

```bash
cat > /var/www/website-with-auth-secured/.env << 'EOF'
NODE_ENV=production
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
DATABASE_PATH=./prompts.db
PORT=3000
BASE_URL=https://yourdomain.com
SMTP_HOST=smtp.sbc-servicesinc.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=pmo@sbc-servicesinc.com
SMTP_PASSWORD=your-password-here
EMAIL_FROM=SBC Services <pmo@sbc-servicesinc.com>
SMTP_TLS_REJECT_UNAUTHORIZED=false
BCRYPT_ROUNDS=12
EOF

# Secure it
chmod 600 .env
```

## Method 3: PM2 Ecosystem File

If using PM2, you can set environment variables in an ecosystem file.

### Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ai-prompt-templates',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      SESSION_SECRET: 'your-generated-secret-here',
      PORT: 3000,
      BASE_URL: 'https://yourdomain.com',
      SMTP_HOST: 'smtp.sbc-servicesinc.com',
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      SMTP_USER: 'pmo@sbc-servicesinc.com',
      SMTP_PASSWORD: 'your-password-here',
      EMAIL_FROM: 'SBC Services <pmo@sbc-servicesinc.com>',
      SMTP_TLS_REJECT_UNAUTHORIZED: false
    }
  }]
};
```

### Start with PM2:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

## Method 4: System Environment Variables

For systemd services or shell-level configuration.

### Add to system environment:

```bash
# Edit profile (affects all users)
sudo nano /etc/environment

# Add:
SESSION_SECRET="your-generated-secret-here"

# Reload
source /etc/environment
```

### For systemd service:

```bash
# Edit service file
sudo nano /etc/systemd/system/your-app.service

# Add under [Service]:
Environment="SESSION_SECRET=your-generated-secret-here"
Environment="NODE_ENV=production"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart your-app
```

## Security Best Practices

### ✅ DO:

1. **Use strong secrets (128 characters recommended)**
   ```bash
   node generate-session-secret.js
   ```

2. **Set restrictive permissions on .env**
   ```bash
   chmod 600 .env
   ```

3. **Use different secrets for dev and production**
   - Development: Simple secret is OK
   - Production: Use 128-character secret

4. **Add .env to .gitignore**
   ```bash
   echo ".env" >> .gitignore
   ```

5. **Backup your .env file securely**
   ```bash
   # Encrypted backup
   gpg --encrypt .env
   # Store .env.gpg in secure location
   ```

6. **Rotate secrets periodically**
   - Generate new secret every 6-12 months
   - Or immediately if compromised

### ❌ DON'T:

1. **Never commit .env to git**
2. **Never use weak/predictable secrets like:**
   - "secret"
   - "mysecretkey"
   - "12345"
   - Your app name or domain

3. **Never share secrets via:**
   - Email
   - Slack/Chat (use secret managers instead)
   - Public documentation

4. **Never reuse secrets across environments**
5. **Never log secrets to console/files**

## Verification Checklist

After setup, verify everything works:

```bash
# 1. Check .env exists and has correct permissions
ls -la .env
# Should show: -rw------- 1 user user ... .env

# 2. Verify environment loads
node -e "require('dotenv').config(); console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET ✅' : 'NOT SET ❌')"

# 3. Check application logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# 4. Test the application
curl http://localhost:3000/health

# 5. Test session functionality
# - Try logging in
# - Check if session persists
# - Test logout
```

## Troubleshooting

### Issue: "SESSION_SECRET not found"

**Solution:**
```bash
# Verify .env exists
cat .env | grep SESSION_SECRET

# If missing, generate and add:
node generate-session-secret.js
# Copy output to .env

# Restart app
pm2 restart all
```

### Issue: "Permission denied reading .env"

**Solution:**
```bash
# Check permissions
ls -la .env

# Fix ownership
sudo chown $USER:$USER .env

# Fix permissions
chmod 600 .env
```

### Issue: Changes to .env not taking effect

**Solution:**
```bash
# PM2 users - restart with environment update
pm2 restart all --update-env

# Or reload PM2
pm2 reload all

# Verify environment loaded
pm2 env 0  # Shows environment for app 0
```

### Issue: Application won't start after adding SESSION_SECRET

**Solution:**
```bash
# Check for syntax errors in .env
cat .env

# Common mistakes:
# ❌ SESSION_SECRET = "abc"  (spaces around =)
# ❌ SESSION_SECRET="abc"    (quotes usually not needed)
# ✅ SESSION_SECRET=abc123   (correct)

# Check logs
tail -f logs/error-$(date +%Y-%m-%d).log
```

## Using Secrets Management Services

For enterprise/team environments, consider using:

### AWS Secrets Manager

```javascript
// Install SDK
npm install @aws-sdk/client-secrets-manager

// In config file:
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

async function getSecret() {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: "prod/app/session-secret" })
  );
  return JSON.parse(response.SecretString);
}
```

### HashiCorp Vault

```bash
# Install Vault CLI
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install vault

# Store secret
vault kv put secret/prod/app session_secret="your-secret"

# Retrieve in app
vault kv get -field=session_secret secret/prod/app
```

### Docker Secrets (Docker Swarm)

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: your-app
    secrets:
      - session_secret
    environment:
      SESSION_SECRET_FILE: /run/secrets/session_secret

secrets:
  session_secret:
    file: ./session_secret.txt
```

## Quick Reference

### Generate New Secret:
```bash
node generate-session-secret.js
```

### Add to .env:
```bash
echo "SESSION_SECRET=$(node -pe "require('crypto').randomBytes(64).toString('hex')")" >> .env
```

### Secure .env:
```bash
chmod 600 .env
```

### Restart App:
```bash
pm2 restart all
```

### Verify:
```bash
pm2 logs
```

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review application logs: `tail -f logs/error-$(date +%Y-%m-%d).log`
3. Verify .env file exists and has correct permissions
4. Ensure application has been restarted after changes
