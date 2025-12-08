# Email Troubleshooting Guide

This guide helps diagnose and fix email issues on production servers.

## Common Symptoms

- ✅ **Local:** Emails work on your local development machine
- ❌ **Production:** Emails fail to send on the production server

## Diagnostic Steps

### Step 1: Run the Diagnostic Script

Upload `test-email-production.js` to your production server and run:

```bash
cd /var/www/website-with-auth-secured

# Self-test (sends to SMTP_USER)
node test-email-production.js

# Or test with specific email
node test-email-production.js your-email@example.com
```

This will:
- Check all environment variables
- Test SMTP connection
- Send a test email to yourself or specified address
- Provide specific error messages and solutions

**Usage:**
- `node test-email-production.js` - Sends test email to SMTP_USER (self-test)
- `node test-email-production.js user@example.com` - Sends test email to specific address

### Step 2: Check Environment Variables

Verify your `.env` file on the production server contains:

```bash
cat .env
```

Required variables:
```env
SMTP_HOST=smtp.sbc-servicesinc.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=pmo@sbc-servicesinc.com
SMTP_PASSWORD=your-password-here
EMAIL_FROM=SBC Services <pmo@sbc-servicesinc.com>
BASE_URL=https://yourdomain.com
```

**Common Issues:**
- ❌ `.env` file missing
- ❌ Wrong file permissions (must be readable by node process)
- ❌ Environment variables not loaded (missing `dotenv` package)

### Step 3: Check Application Logs

View the logs to see email errors:

```bash
# View error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# View all logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Search for email errors
grep -i "email" logs/combined-$(date +%Y-%m-%d).log
```

## Common Issues & Solutions

### Issue 1: Connection Refused (ECONNREFUSED)

**Error:** `connect ECONNREFUSED`

**Causes:**
- Firewall blocking outbound SMTP connections
- Wrong SMTP host or port
- SMTP server is down

**Solutions:**

1. **Check firewall rules:**
   ```bash
   # Test if you can reach SMTP server
   telnet smtp.sbc-servicesinc.com 465
   # or
   nc -zv smtp.sbc-servicesinc.com 465
   ```

2. **Allow outbound SMTP in firewall:**
   ```bash
   # For UFW (Ubuntu)
   sudo ufw allow out 465/tcp
   sudo ufw allow out 587/tcp

   # For firewalld (CentOS/RHEL)
   sudo firewall-cmd --permanent --add-port=465/tcp
   sudo firewall-cmd --permanent --add-port=587/tcp
   sudo firewall-cmd --reload
   ```

3. **Verify SMTP settings with hosting provider**

### Issue 2: Authentication Failed (EAUTH / 535)

**Error:** `Invalid login: 535 Authentication failed`

**Causes:**
- Wrong username or password
- Email account locked/suspended
- Need to use "App Password" instead of regular password

**Solutions:**

1. **Verify credentials:**
   - Double-check `SMTP_USER` and `SMTP_PASSWORD`
   - Ensure no extra spaces or quotes
   - Check if password needs to be URL-encoded

2. **Check email account:**
   - Log into email account via webmail
   - Check if account is active
   - Look for security notifications

3. **Try App Password (if using Gmail/Google Workspace):**
   - Generate app-specific password
   - Use that instead of regular password

### Issue 3: SSL/TLS Certificate Issues (ESOCKET)

**Error:** `unable to verify the first certificate` or `self signed certificate`

**Causes:**
- Self-signed SSL certificate on SMTP server
- Outdated certificate chain
- SSL/TLS misconfiguration

**Solutions:**

1. **Disable certificate validation (temporary):**

   Add to `.env`:
   ```env
   SMTP_TLS_REJECT_UNAUTHORIZED=false
   ```

2. **Update system certificates:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install ca-certificates
   sudo update-ca-certificates

   # CentOS/RHEL
   sudo yum install ca-certificates
   sudo update-ca-trust
   ```

3. **Contact hosting provider about certificate issues**

### Issue 4: Port/Security Settings Wrong

**Common Configurations:**

| Protocol | Port | SMTP_SECURE | Use Case |
|----------|------|-------------|----------|
| SSL/TLS | 465 | true | Most secure, recommended |
| STARTTLS | 587 | false | Common alternative |
| Unencrypted | 25 | false | NOT recommended |

**Try different configurations:**

```env
# Configuration 1: SSL/TLS (port 465)
SMTP_PORT=465
SMTP_SECURE=true

# Configuration 2: STARTTLS (port 587)
SMTP_PORT=587
SMTP_SECURE=false
```

### Issue 5: Firewall/Security Group Blocking

**For Cloud Servers (AWS, DigitalOcean, etc.):**

Many cloud providers block port 25 by default and sometimes restrict other SMTP ports.

**Solutions:**

1. **Check security groups (AWS):**
   - Go to EC2 → Security Groups
   - Ensure outbound rules allow ports 465 and 587

2. **Use cloud provider's SMTP relay:**
   - AWS SES
   - SendGrid
   - Mailgun
   - These are designed for cloud environments

### Issue 6: IP Blocked/Blacklisted

**Error:** Email sends but never arrives, or gets rejected

**Causes:**
- Server IP is on a blacklist
- No SPF/DKIM records configured
- Sending from dynamic IP address

**Solutions:**

1. **Check if IP is blacklisted:**
   - Visit https://mxtoolbox.com/blacklists.aspx
   - Enter your server's public IP
   - Follow delisting instructions if blocked

2. **Configure SPF record:**
   ```
   Add TXT record to your domain:
   v=spf1 a mx ip4:YOUR_SERVER_IP include:smtp.sbc-servicesinc.com ~all
   ```

3. **Configure DKIM:**
   - Ask hosting provider for DKIM configuration
   - Add DKIM TXT record to your domain

4. **Use authenticated SMTP relay:**
   - Use your hosting provider's SMTP server
   - Emails sent through authenticated SMTP are less likely to be blocked

### Issue 7: Environment Variables Not Loading

**Error:** Logs show "Email service not configured"

**Causes:**
- `.env` file missing or wrong location
- `dotenv` not configured correctly
- Process manager not loading environment

**Solutions:**

1. **Verify .env file exists:**
   ```bash
   ls -la /var/www/website-with-auth-secured/.env
   ```

2. **Check file permissions:**
   ```bash
   chmod 600 /var/www/website-with-auth-secured/.env
   chown www-data:www-data /var/www/website-with-auth-secured/.env
   ```

3. **If using PM2:**
   ```bash
   pm2 restart all --update-env
   ```

4. **Test environment loading:**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.SMTP_HOST)"
   ```

## Testing After Fixes

After making changes:

1. **Restart the application:**
   ```bash
   pm2 restart all
   # or
   systemctl restart your-app
   ```

2. **Run diagnostic script:**
   ```bash
   node test-email-production.js
   ```

3. **Test registration:**
   - Create a new test account
   - Check if verification email arrives
   - Check application logs for errors

4. **Check logs:**
   ```bash
   tail -f logs/combined-$(date +%Y-%m-%d).log | grep -i email
   ```

## Production Best Practices

### 1. Use a Dedicated Email Service

For production, consider using:
- **SendGrid** (free tier: 100 emails/day)
- **AWS SES** (very cheap, reliable)
- **Mailgun** (good free tier)
- **Postmark** (reliable, good for transactional emails)

**Benefits:**
- Better deliverability
- No IP reputation issues
- Detailed analytics
- Automatic retry logic
- Webhook support

### 2. Configure Proper DNS Records

**SPF Record:**
```
v=spf1 include:smtp.sbc-servicesinc.com ~all
```

**DKIM Record:**
- Get from your email provider
- Add to DNS as TXT record

**DMARC Record:**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### 3. Monitor Email Sending

Add monitoring:
```javascript
// In emailService.js, after sending email:
if (process.env.NODE_ENV === 'production') {
  // Log to monitoring service (Sentry, LogRocket, etc.)
  console.log('Email sent successfully', { to, subject, messageId });
}
```

### 4. Implement Email Queue

For high-volume applications, use a queue:
- **Bull** (Redis-based queue)
- **BeeQueue**
- **AWS SQS**

## Quick Reference: Working Configurations

### Configuration A: Hostgator/cPanel SMTP
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password
SMTP_TLS_REJECT_UNAUTHORIZED=false
EMAIL_FROM=Your App <your-email@yourdomain.com>
```

### Configuration B: Gmail (App Password)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=Your App <your-email@gmail.com>
```

### Configuration C: SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=Your App <verified-sender@yourdomain.com>
```

### Configuration D: AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
EMAIL_FROM=Your App <verified-sender@yourdomain.com>
```

## Still Not Working?

If you've tried everything above and email still doesn't work:

1. **Contact your hosting provider** - They may have specific SMTP restrictions
2. **Check server logs** - Look for blocked ports or security restrictions
3. **Try a different SMTP service** - Use SendGrid or Mailgun as a test
4. **Enable verbose logging:**

   In `emailService.js`, add:
   ```javascript
   this.transporter = nodemailer.createTransport({
     ...config,
     debug: true, // Enable debug output
     logger: true // Log to console
   });
   ```

## Contact & Support

If you need help:
1. Run `node test-email-production.js` and save the output
2. Check logs in `logs/` directory
3. Document exact error messages
4. Note your hosting provider and server OS
