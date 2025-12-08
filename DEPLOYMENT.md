# Deployment Guide

This guide covers deploying your AI Prompt Templates application to production.

## Table of Contents
- [Environment Configuration](#environment-configuration)
- [Development vs Production](#development-vs-production)
- [Email Configuration](#email-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Deployment Checklist](#deployment-checklist)

## Environment Configuration

The application uses environment variables to configure different aspects of the system. The most important variable for production deployment is `BASE_URL`.

### BASE_URL Variable

The `BASE_URL` environment variable determines what domain is used in:
- Email verification links
- Password reset links
- Welcome emails
- Any other email notifications

**Development:**
```env
BASE_URL=http://localhost:3000
```

**Production:**
```env
BASE_URL=https://yourdomain.com
```

> **Important:** Always use `https://` in production, never `http://`

### How It Works

The email service (`src/services/emailService.js`) reads the `BASE_URL` variable and uses it to construct all email links:

```javascript
// Example: Verification email
const verificationUrl = `${this.baseUrl}/verify-email?token=${verificationToken}`;
// Development: http://localhost:3000/verify-email?token=abc123
// Production: https://yourdomain.com/verify-email?token=abc123
```

## Development vs Production

### Local Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update your `.env` file:
   ```env
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your-generated-secret
   BASE_URL=http://localhost:3000

   # Your SMTP settings
   SMTP_HOST=smtp.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=your-email@yourdomain.com
   SMTP_PASSWORD=your-password
   EMAIL_FROM=AI Prompt Templates <your-email@yourdomain.com>
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Production Setup

1. On your production server, copy `.env.production.example` to `.env`:
   ```bash
   cp .env.production.example .env
   ```

2. Update your production `.env` file:
   ```env
   PORT=3000
   NODE_ENV=production
   SESSION_SECRET=generate-new-secret-for-production
   BASE_URL=https://yourdomain.com

   # Production SMTP settings
   SMTP_HOST=smtp.yourdomain.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASSWORD=your-secure-password
   SMTP_TLS_REJECT_UNAUTHORIZED=true
   EMAIL_FROM=AI Prompt Templates <noreply@yourdomain.com>
   ```

3. Start production server:
   ```bash
   npm start
   # Or with PM2:
   pm2 start server.js --name "ai-prompts"
   ```

## Email Configuration

### SMTP Port Selection

Choose the appropriate port based on your email provider:

| Port | Secure | Method | Recommended For |
|------|--------|--------|-----------------|
| 587  | false  | STARTTLS | Most providers (HostGator, cPanel, etc.) |
| 465  | true   | SSL/TLS | Gmail, some providers |
| 25   | false  | Plain | Legacy (often blocked) |

**Recommended Configuration (Port 587):**
```env
SMTP_PORT=587
SMTP_SECURE=false
```

**Alternative Configuration (Port 465):**
```env
SMTP_PORT=465
SMTP_SECURE=true
```

### Testing Email Configuration

Before deploying, test your email configuration:

```bash
node test-email.js
```

This will:
1. Verify SMTP connection
2. Send a test email
3. Display any errors

### Common Email Issues

**Issue: Emails not sending**
- Check server logs for email errors
- Verify SMTP credentials are correct
- Ensure firewall allows outbound connections on SMTP port
- Try alternative port (587 vs 465)

**Issue: Emails going to spam**
- Ensure SPF and DKIM records are configured for your domain
- Use a proper "From" address that matches your domain
- Avoid spam trigger words in email content

**Issue: Certificate errors**
- For development/testing: Use `SMTP_TLS_REJECT_UNAUTHORIZED=false`
- For production: Use `SMTP_TLS_REJECT_UNAUTHORIZED=true` and ensure valid SSL certificates

## SSL/TLS Setup

### Understanding HTTPS in Production

Your application needs to be accessible via HTTPS in production. There are two parts to this:

1. **External HTTPS (Browser → Server):** Handled by your web server (Nginx, Apache, etc.)
2. **Internal HTTP (Web Server → Node.js):** Node.js runs on HTTP internally

### Example: Nginx as Reverse Proxy

Create `/etc/nginx/sites-available/ai-prompts`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

    # Static files (optional optimization)
    location /css/ {
        alias /path/to/app/public/css/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /path/to/app/public/js/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ai-prompts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Getting SSL Certificates (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certificate will auto-renew
```

## Deployment Checklist

### Before Deployment

- [ ] Generate new `SESSION_SECRET` for production
- [ ] Update `BASE_URL` to production FQDN with https://
- [ ] Set `NODE_ENV=production`
- [ ] Configure production SMTP credentials
- [ ] Test email sending with `node test-email.js`
- [ ] Verify SSL certificates are installed
- [ ] Update `EMAIL_FROM` to use production domain
- [ ] Review and update SMTP_TLS_REJECT_UNAUTHORIZED (should be `true` in production)

### After Deployment

- [ ] Test user registration with a real email
- [ ] Verify email links use HTTPS and correct domain
- [ ] Check email deliverability (inbox, not spam)
- [ ] Test email verification flow
- [ ] Test password reset flow
- [ ] Monitor server logs for errors
- [ ] Test on multiple email providers (Gmail, Outlook, etc.)
- [ ] Verify session management works correctly
- [ ] Check database permissions and backups

### Environment Variable Examples

**Development (.env):**
```env
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
SESSION_SECRET=dev-secret-key-here
SMTP_HOST=gator3285.hostgator.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=test@yourdomain.com
SMTP_PASSWORD=dev-password
EMAIL_FROM=AI Prompt Templates <test@yourdomain.com>
```

**Production (.env):**
```env
PORT=3000
NODE_ENV=production
BASE_URL=https://promptstudio.yourdomain.com
SESSION_SECRET=super-secure-random-production-key-here
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=true
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=strong-production-password
EMAIL_FROM=AI Prompt Templates <noreply@yourdomain.com>
```

## Troubleshooting

### Email Links Point to Localhost

**Problem:** Verification emails contain `http://localhost:3000` links in production

**Solution:**
1. Check your production `.env` file has `BASE_URL=https://yourdomain.com`
2. Restart the Node.js server after changing `.env`
3. Send a new verification email to test

### HTTPS Not Working

**Problem:** Site is not accessible via HTTPS

**Solution:**
1. Verify SSL certificates are installed: `sudo certbot certificates`
2. Check Nginx configuration: `sudo nginx -t`
3. Verify Nginx is running: `sudo systemctl status nginx`
4. Check firewall allows port 443: `sudo ufw status`

### Emails Not Sending in Production

**Problem:** Emails work locally but not in production

**Solution:**
1. Check production SMTP credentials are correct
2. Verify production server can reach SMTP host: `telnet smtp.yourdomain.com 587`
3. Check server logs: `pm2 logs ai-prompts` or `journalctl -u ai-prompts`
4. Ensure firewall allows outbound connections on SMTP port

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different secrets** for development and production
3. **Always use HTTPS** in production (enforce via `BASE_URL`)
4. **Rotate SESSION_SECRET** periodically
5. **Use strong passwords** for SMTP authentication
6. **Keep dependencies updated**: `npm audit` and `npm update`
7. **Set proper file permissions** on `.env`: `chmod 600 .env`
8. **Use a process manager** like PM2 for automatic restarts
9. **Set up monitoring** and alerts for errors
10. **Regular backups** of the SQLite database

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review the email service logs in `src/services/emailService.js`
- Test SMTP connection with `node test-email.js`
- Verify all environment variables are set correctly

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [Node.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
