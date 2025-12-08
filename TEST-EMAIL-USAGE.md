# Email Testing Script Usage Guide

Quick guide for using the email testing script.

## Basic Usage

### Test 1: Self-Test (Send to SMTP_USER)

```bash
node test-email-production.js
```

This sends a test email to the SMTP_USER address (the email account configured in your .env file).

**Use this for:** Initial testing to verify SMTP configuration works.

---

### Test 2: Send to Specific Email Address

```bash
node test-email-production.js user@example.com
```

Replace `user@example.com` with any email address you want to test.

**Use this for:**
- Testing email delivery to external addresses
- Verifying emails reach customer inboxes
- Checking spam folder placement

---

## Examples

### Test with your personal email:
```bash
node test-email-production.js yourname@gmail.com
```

### Test with multiple recipients (run multiple times):
```bash
node test-email-production.js user1@example.com
node test-email-production.js user2@example.com
node test-email-production.js user3@example.com
```

### Test on production server:
```bash
# SSH into production
ssh user@your-server

# Navigate to app directory
cd /var/www/website-with-auth-secured

# Run test
node test-email-production.js admin@yourdomain.com
```

---

## What It Tests

The script performs a comprehensive test:

1. ✅ **Environment Variables** - Checks all required variables are set
2. ✅ **SMTP Connection** - Verifies connection to mail server
3. ✅ **Authentication** - Tests username/password login
4. ✅ **Email Sending** - Sends actual test email
5. ✅ **Delivery** - Confirms email was accepted by server

---

## Output Explanation

### ✅ Success Output:
```
🔍 Email Configuration Diagnostics
=====================================
📧 Test email will be sent to: user@example.com
📋 Environment Variables:
   [Shows your configuration]
✅ All required environment variables are set
✅ SMTP Connection Successful!
📤 Sending test email...
✅ Test email sent successfully!
📬 Email Details:
   Message ID: <unique-id>
   Response: 250 OK
   To: user@example.com
   From: Your App <noreply@yourdomain.com>
🎉 Your email configuration is working perfectly!
```

**What to do:** Check the recipient's inbox (and spam folder) for the test email.

---

### ❌ Error: Connection Refused
```
❌ SMTP Connection Failed!
Error details:
   Code: ECONNREFUSED
   Message: connect ECONNREFUSED 1.2.3.4:465
💡 Troubleshooting tips:
   - Check if SMTP_HOST is correct and reachable
   - Verify SMTP_PORT is correct
   - Check firewall rules on the server
```

**Solution:**
1. Verify SMTP_HOST and SMTP_PORT in .env
2. Check firewall allows outbound port 465/587
3. Test connection: `telnet smtp.yourdomain.com 465`

---

### ❌ Error: Authentication Failed
```
❌ SMTP Connection Failed!
Error details:
   Code: EAUTH
   Message: Invalid login: 535 Authentication failed
💡 Troubleshooting tips:
   - Verify SMTP_USER and SMTP_PASSWORD are correct
   - Check if the email account exists
```

**Solution:**
1. Double-check SMTP_USER and SMTP_PASSWORD in .env
2. Log into email account via webmail to verify credentials
3. Check if account is locked or requires 2FA

---

### ❌ Error: Invalid Email Format
```
❌ Invalid email format!
   "notanemail" is not a valid email address.
Usage: node test-email-production.js user@example.com
```

**Solution:** Provide a valid email address with @ and domain.

---

## Common Use Cases

### 1. Initial Setup Verification
```bash
# Test that SMTP works at all
node test-email-production.js
```

### 2. Test Deliverability
```bash
# Test if emails reach Gmail
node test-email-production.js test@gmail.com

# Test if emails reach Outlook
node test-email-production.js test@outlook.com

# Test if emails reach your domain
node test-email-production.js test@yourdomain.com
```

### 3. Debug Production Issues
```bash
# On production server
cd /var/www/website-with-auth-secured
node test-email-production.js

# Check what error occurs
# Follow troubleshooting tips in output
```

### 4. Verify After Configuration Changes
```bash
# After editing .env
node test-email-production.js

# After restarting application
pm2 restart all
node test-email-production.js
```

---

## Troubleshooting

### Email sent successfully but not received

**Possible causes:**
1. Email in spam/junk folder
2. Email blocked by recipient's server
3. SPF/DKIM records not configured
4. Sender IP blacklisted

**Steps:**
1. Check spam folder
2. Check application logs for detailed SMTP response
3. Use mail-tester.com to check spam score
4. Verify SPF/DKIM DNS records

### Script hangs or times out

**Possible causes:**
1. Firewall blocking connection
2. Wrong SMTP_HOST or SMTP_PORT
3. SMTP server not responding

**Steps:**
1. Press Ctrl+C to stop
2. Test connection: `telnet smtp.yourdomain.com 465`
3. Check firewall rules
4. Try different SMTP_PORT (587 instead of 465)

### "Environment variables not set" error

**Solution:**
1. Check .env file exists:
   ```bash
   cat .env
   ```

2. Verify it has required variables:
   ```bash
   grep SMTP .env
   ```

3. Check file permissions:
   ```bash
   ls -la .env
   ```

---

## Production Checklist

Before deploying to production, verify:

- [ ] Self-test works: `node test-email-production.js`
- [ ] Test with external email works: `node test-email-production.js external@gmail.com`
- [ ] Email arrives in inbox (not spam)
- [ ] Links in email work correctly
- [ ] Email formatting looks good
- [ ] FROM address is correct
- [ ] BASE_URL is set to production domain
- [ ] SPF/DKIM records configured
- [ ] Application logs show successful email sending

---

## Quick Reference

```bash
# Self-test
node test-email-production.js

# Test specific email
node test-email-production.js user@example.com

# Test and save output
node test-email-production.js user@example.com > email-test.log 2>&1

# Test from production server
ssh user@server "cd /var/www/website-with-auth-secured && node test-email-production.js admin@domain.com"
```

---

## Related Documentation

- **EMAIL-TROUBLESHOOTING.md** - Comprehensive troubleshooting guide
- **PRODUCTION-SETUP-GUIDE.md** - Production environment setup
- **.env.example** - Example environment configuration

---

## Need Help?

If the script shows errors you can't resolve:

1. Run the test and save full output:
   ```bash
   node test-email-production.js > test-output.log 2>&1
   ```

2. Check application logs:
   ```bash
   tail -100 logs/error-$(date +%Y-%m-%d).log
   ```

3. Review EMAIL-TROUBLESHOOTING.md for detailed solutions

4. Verify environment variables are loaded:
   ```bash
   node -e "require('dotenv').config(); console.log('SMTP_HOST:', process.env.SMTP_HOST)"
   ```
