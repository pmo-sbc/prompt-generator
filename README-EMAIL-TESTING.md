# 📧 Email Testing Quick Start

Fast reference for testing email configuration.

## 🚀 Quick Commands

```bash
# Test 1: Self-test (send to yourself)
node test-email-production.js

# Test 2: Send to specific email
node test-email-production.js recipient@example.com
```

## 📋 Examples

```bash
# Test with Gmail
node test-email-production.js yourname@gmail.com

# Test with Outlook
node test-email-production.js yourname@outlook.com

# Test with your domain
node test-email-production.js admin@yourdomain.com
```

## ✅ What Success Looks Like

```
✅ SMTP Connection Successful!
✅ Test email sent successfully!
🎉 Your email configuration is working perfectly!
```

Then check the recipient's inbox (and spam folder).

## ❌ Common Errors & Quick Fixes

### Error: Connection Refused
```bash
# Fix: Check firewall and SMTP settings
sudo ufw allow out 465/tcp
sudo ufw allow out 587/tcp
```

### Error: Authentication Failed
```bash
# Fix: Verify credentials in .env
nano .env
# Check SMTP_USER and SMTP_PASSWORD
```

### Error: Certificate Error
```bash
# Fix: Disable certificate validation
echo "SMTP_TLS_REJECT_UNAUTHORIZED=false" >> .env
pm2 restart all
```

## 🔧 Production Setup

```bash
# 1. Upload script to production
scp test-email-production.js user@server:/var/www/website-with-auth-secured/

# 2. SSH into server
ssh user@server

# 3. Navigate to app directory
cd /var/www/website-with-auth-secured

# 4. Run test
node test-email-production.js admin@yourdomain.com

# 5. Check result
```

## 📚 Full Documentation

- **TEST-EMAIL-USAGE.md** - Complete usage guide with examples
- **EMAIL-TROUBLESHOOTING.md** - Comprehensive troubleshooting
- **PRODUCTION-SETUP-GUIDE.md** - Production environment setup

## 🆘 Still Not Working?

Run diagnostic and save output:
```bash
node test-email-production.js > email-test.log 2>&1
cat email-test.log
```

Then check **EMAIL-TROUBLESHOOTING.md** for solutions to your specific error.
