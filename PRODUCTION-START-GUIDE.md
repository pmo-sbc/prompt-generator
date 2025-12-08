# Production Startup Guide

Quick guide to start your application in production with HTTPS.

## Step 1: Start the Application with PM2

On your production server, run:

```bash
cd /var/www/prompt-generator

# Install PM2 if needed
sudo npm install -g pm2

# Start the application
pm2 start server.js --name "prompt-generator"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (follow the instructions it prints)
pm2 startup
```

**Or use the automated script:**

```bash
cd /var/www/prompt-generator
chmod +x start-production.sh
bash start-production.sh
```

**Verify it's running:**

```bash
pm2 status
pm2 logs prompt-generator
```

You should see your app running on port 3000.

---

## Step 2: Setup HTTPS with Let's Encrypt

### Prerequisites:
- Your domain name must point to your server's IP address (DNS A record)
- Port 80 and 443 must be accessible from the internet

### Quick Setup (Automated):

```bash
cd /var/www/prompt-generator
chmod +x setup-https.sh
sudo bash setup-https.sh
```

The script will:
1. Install Nginx (if not installed)
2. Configure Nginx as reverse proxy
3. Install Certbot
4. Get SSL certificate from Let's Encrypt
5. Configure HTTPS automatically

### Manual Setup:

#### 1. Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

#### 2. Configure Nginx

Create configuration file:

```bash
sudo nano /etc/nginx/sites-available/prompt-generator
```

Add this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
sudo ln -s /etc/nginx/sites-available/prompt-generator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

#### 3. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 4. Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will:
- Obtain SSL certificate from Let's Encrypt
- Automatically configure Nginx for HTTPS
- Set up automatic renewal

#### 5. Configure Firewall (if using UFW)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Step 3: Verify Everything Works

### Check Application:

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs prompt-generator

# Test locally
curl http://localhost:3000
```

### Check HTTPS:

```bash
# Test HTTPS from server
curl https://yourdomain.com

# Or visit in browser
https://yourdomain.com
```

---

## Useful Commands

### PM2 Management:

```bash
pm2 status                      # Check status
pm2 logs prompt-generator       # View logs
pm2 logs prompt-generator --lines 50  # Last 50 lines
pm2 restart prompt-generator    # Restart app
pm2 stop prompt-generator       # Stop app
pm2 delete prompt-generator     # Remove from PM2
pm2 monit                       # Monitor resources
```

### Nginx Management:

```bash
sudo nginx -t                   # Test configuration
sudo systemctl restart nginx    # Restart Nginx
sudo systemctl status nginx     # Check status
sudo tail -f /var/log/nginx/error.log  # View error log
```

### SSL Certificate:

```bash
sudo certbot certificates              # List certificates
sudo certbot renew --dry-run          # Test renewal
sudo certbot renew                    # Manual renewal
```

---

## Troubleshooting

### Application won't start:

```bash
# Check logs
pm2 logs prompt-generator --err

# Check if port 3000 is in use
sudo lsof -i :3000

# Verify .env file exists and has correct values
cat /var/www/prompt-generator/.env
```

### Nginx 502 Bad Gateway:

```bash
# Check if app is running
pm2 status

# Restart app
pm2 restart prompt-generator

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues:

```bash
# Make sure DNS is pointing to server
dig yourdomain.com

# Make sure ports 80 and 443 are open
sudo ufw status

# Check certificate status
sudo certbot certificates
```

---

## Auto-renewal

Certbot sets up automatic renewal automatically. To verify:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run
```

Certificates auto-renew 30 days before expiration. Check the cron job:

```bash
sudo systemctl status certbot.timer
```

---

## Security Checklist

- [x] Application running with PM2
- [x] HTTPS enabled with Let's Encrypt
- [x] Firewall configured (UFW)
- [x] `.env` file has secure SESSION_SECRET
- [x] `.env` file permissions set to 600
- [x] Database has strong passwords
- [x] PM2 configured to start on boot
- [x] SSL certificate auto-renewal enabled

---

## Next Steps

1. **Monitor your application:**
   ```bash
   pm2 monit
   ```

2. **Set up log rotation** (PM2 does this automatically)

3. **Configure backups** for your database

4. **Set up monitoring** (optional - PM2 Plus, New Relic, etc.)

5. **Review security settings** in your application

