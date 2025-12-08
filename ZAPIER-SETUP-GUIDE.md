## 📧 Zapier Email Integration Setup Guide

Complete guide to send emails through Zapier webhooks.

---

## 🎯 What You'll Need

1. **Zapier account** (free tier works!)
2. **Email service** connected to Zapier (Gmail, Outlook, SendGrid, etc.)
3. **5 minutes** setup time

---

## 📋 Step 1: Create Zapier Webhook

### 1. Go to Zapier

Visit: https://zapier.com/app/zaps

### 2. Create New Zap

Click **"Create Zap"** button

### 3. Set Up Trigger (Webhook)

**Step 3a: Choose App**
- Search for: **"Webhooks by Zapier"**
- Click to select it

**Step 3b: Choose Event**
- Select: **"Catch Hook"**
- Click **"Continue"**

**Step 3c: Copy Webhook URL**
- Zapier will show you a webhook URL like:
  ```
  https://hooks.zapier.com/hooks/catch/123456/abcdef/
  ```
- **COPY THIS URL** - you'll need it for your .env file
- Click **"Continue"**

**Step 3d: Test Trigger (Skip for now)**
- Click **"Skip Test"** for now (we'll test later)

---

## 📋 Step 2: Set Up Action (Send Email)

### 1. Choose Email App

**Popular options:**
- **Gmail** (if you want to send from your Gmail)
- **Email by Zapier** (easiest option, uses Zapier's email service)
- **SendGrid** (if you have SendGrid account)
- **Mailgun** (if you have Mailgun account)
- **Outlook** (if you want to send from Outlook)

**Recommendation:** Start with **"Email by Zapier"** (simplest)

### 2. Choose Event
- Select: **"Send Outbound Email"**
- Click **"Continue"**

### 3. Connect Account (if needed)
- Follow prompts to connect your email account
- Grant necessary permissions

### 4. Map the Fields

This is **crucial** - map exactly like this:

| Zapier Field | Map To | Description |
|--------------|--------|-------------|
| **To** | `to_email` | Recipient email address |
| **From** | `from_email` | Sender email address |
| **Subject** | `subject` | Email subject line |
| **Body** | `html_body` | Email HTML content |
| **Body Type** | Select: **HTML** | Important: Set to HTML! |

**Visual Guide:**
```
To: [Click field] → Select "to_email"
From: [Click field] → Select "from_email"
Subject: [Click field] → Select "subject"
Body: [Click field] → Select "html_body"
Body Type: [Dropdown] → Select "HTML"
```

### 5. Test the Action

- Click **"Test step"**
- Zapier will show if test succeeded
- Check your email inbox (or the test email address)

### 6. Turn On Zap

- Give your Zap a name (e.g., "AI Prompt Templates - Email Sender")
- Click **"Publish"** or **"Turn on Zap"**

✅ **Zapier setup complete!**

---

## 🔧 Step 3: Configure Your Application

### 1. Install axios (if not already installed)

```bash
cd /var/www/website-with-auth-secured
npm install axios
```

### 2. Update .env File

```bash
nano /var/www/website-with-auth-secured/.env
```

**Add these lines:**
```env
# Zapier Email Configuration
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR/WEBHOOK/URL
ZAPIER_SECRET=your-optional-secret-key-here
EMAIL_FROM=SBC Services <pmo@sbc-servicesinc.com>
BASE_URL=https://yourdomain.com
```

**Replace:**
- `YOUR/WEBHOOK/URL` with the actual webhook URL from Step 1
- `your-optional-secret-key-here` with a random string (or remove this line if not using)

**Generate random secret (optional but recommended):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Replace emailService.js

```bash
# Backup current emailService.js
cp src/services/emailService.js src/services/emailService.js.backup

# Replace with Zapier version
cp src/services/emailService-zapier.js src/services/emailService.js
```

### 4. Restart Application

```bash
pm2 restart all

# Verify it started
pm2 logs
```

---

## 🧪 Step 4: Test the Integration

### Test 1: Run Test Script

```bash
cd /var/www/website-with-auth-secured

# Test with your email
node test-zapier-email.js your-email@gmail.com
```

**Expected Output:**
```
✅ Webhook request successful!
🎉 Test completed successfully!

💡 Next Steps:
   1. Check your inbox at: your-email@gmail.com
   2. Verify the email looks correct
   3. Check spam folder if not in inbox
```

### Test 2: Test Registration Flow

```bash
# Go to your website
https://yourdomain.com/signup

# Register with a test email
# Check if verification email arrives
```

### Test 3: Test Password Reset

```bash
# Go to forgot password page
https://yourdomain.com/forgot-password

# Request password reset
# Check if reset email arrives
```

---

## 📊 Zapier Field Mapping Reference

Your application sends this data to Zapier:

```javascript
{
  "to_email": "user@example.com",           // Recipient
  "from_email": "Your App <no-reply@domain.com>",  // Sender
  "subject": "Verify Your Email",           // Subject line
  "html_body": "<html>...</html>",          // Full HTML email
  "timestamp": "2024-01-20T10:30:00.000Z",  // When sent
  "secret": "your-secret-key"               // (optional) For security
}
```

**In your Zap, map:**
- `to_email` → **To** field
- `from_email` → **From** field
- `subject` → **Subject** field
- `html_body` → **Body** field (set Body Type to "HTML")

---

## 🔐 Optional: Add Security with Secret

To prevent unauthorized use of your webhook:

### 1. In Zapier - Add Filter Step

After "Catch Hook" trigger, before email action:

**Add Step:**
- Click **"+" between trigger and action**
- Choose **"Filter"**
- Set condition:
  - `secret` (Exactly matches) `your-secret-key`

This ensures only requests with correct secret are processed.

### 2. In .env File

```env
ZAPIER_SECRET=your-secret-key-here
```

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📧 Email Service Options in Zapier

### Option 1: Email by Zapier (Easiest)
- **Pros:** No setup, works immediately
- **Cons:** Basic, limited customization
- **Best for:** Getting started quickly

### Option 2: Gmail
- **Pros:** Free, reliable, you control the account
- **Cons:** Daily sending limits (500/day)
- **Best for:** Small apps, personal projects

### Option 3: SendGrid
- **Pros:** Professional, high deliverability, analytics
- **Cons:** Requires SendGrid account
- **Best for:** Production apps with high volume

### Option 4: Mailgun
- **Pros:** Developer-friendly, good features
- **Cons:** Requires Mailgun account
- **Best for:** Apps needing detailed tracking

### Option 5: AWS SES
- **Pros:** Cheapest at scale, AWS integration
- **Cons:** More complex setup
- **Best for:** AWS-based applications

---

## 🐛 Troubleshooting

### Issue: "ZAPIER_WEBHOOK_URL not configured"

**Solution:**
```bash
# Check if .env has the variable
grep ZAPIER_WEBHOOK_URL /var/www/website-with-auth-secured/.env

# If missing, add it:
echo "ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR/URL" >> .env

# Restart
pm2 restart all
```

---

### Issue: Webhook receives data but email doesn't send

**Possible causes:**
1. **Body Type not set to HTML**
   - In Zapier action settings, ensure Body Type is "HTML", not "Plain"

2. **Field mapping incorrect**
   - Double-check: `html_body` mapped to **Body** field
   - Check: `to_email` mapped to **To** field

3. **Email service not connected**
   - Reconnect your email account in Zapier
   - Check for authorization errors

**Debug:**
- Check Zapier "Task History" for errors
- Look at the data received by webhook
- Verify email service connection

---

### Issue: Email arrives but formatting is broken

**Solution:**
- In Zapier action, make sure **Body Type** is set to **"HTML"**
- Not "Plain Text" or "Markdown"

---

### Issue: Emails going to spam

**Solutions:**
1. **Use authenticated email service**
   - Use Gmail/Outlook/SendGrid action in Zapier
   - Don't use "Email by Zapier" for production

2. **Set up SPF/DKIM**
   - If using custom domain, configure DNS records
   - See GMAIL-DELIVERY-GUIDE.md

3. **Test spam score**
   - Send to: https://www.mail-tester.com/
   - Fix issues listed in report

---

### Issue: Timeout errors

**Solution:**
```javascript
// In emailService-zapier.js, increase timeout:
const response = await axios.post(this.zapierWebhookUrl, payload, {
  timeout: 30000 // Increase to 30 seconds
});
```

---

### Issue: Zap turns off automatically

**Causes:**
- Too many errors in Zap
- Email service connection lost
- Billing issue with Zapier/email service

**Solution:**
- Check Zapier dashboard for error messages
- Reconnect email service
- Review Zapier task history
- Check account status

---

## 📈 Monitoring & Limits

### Zapier Free Tier Limits
- **100 tasks/month**
- **15-minute update time**
- **Single-step Zaps** (webhook → email is 2 steps)

**Each email sent = 1 task**

### Upgrade Needed If:
- Sending >100 emails/month
- Need faster webhook processing
- Want multi-step Zaps (with filters, etc.)

**Zapier Paid Plans:**
- **Starter:** $19.99/mo - 750 tasks
- **Professional:** $49/mo - 2,000 tasks
- **Team:** $299/mo - 50,000 tasks

---

## 🎯 Production Checklist

Before going live:

- [ ] Zapier webhook URL configured in .env
- [ ] Zap is turned ON in Zapier
- [ ] Email service connected and authorized
- [ ] Body Type set to "HTML" in Zapier action
- [ ] All fields mapped correctly (to_email, from_email, subject, html_body)
- [ ] Test script passes: `node test-zapier-email.js`
- [ ] Registration email test successful
- [ ] Password reset email test successful
- [ ] Welcome email test successful
- [ ] Emails arrive in inbox (not spam)
- [ ] Email formatting looks correct
- [ ] Monitor Zapier task usage
- [ ] Set up Zapier alerts for failures
- [ ] Document webhook URL securely
- [ ] Consider adding secret key for security

---

## 🔄 Rollback Instructions

If you need to go back to SMTP:

```bash
# Restore original emailService
cp src/services/emailService.js.backup src/services/emailService.js

# Update .env to use SMTP
nano .env
# Comment out Zapier, uncomment SMTP settings

# Restart
pm2 restart all
```

---

## 📊 Zapier vs SMTP Comparison

| Feature | SMTP | Zapier |
|---------|------|--------|
| Setup Time | 1-24 hours (DNS) | 5 minutes |
| Deliverability | Depends on DNS | Excellent |
| Gmail Delivery | Often blocked | Works great |
| Configuration | Complex | Simple |
| Tracking | None | Built-in |
| Cost | Free | 100/mo free |
| Reliability | Variable | High |
| Maintenance | High | Low |

---

## 💡 Tips & Best Practices

1. **Name your Zap clearly**
   - e.g., "Prod - AI Templates - Email Sender"
   - Makes it easy to find later

2. **Monitor task usage**
   - Check Zapier dashboard weekly
   - Set up usage alerts

3. **Test before deploying**
   - Always test with real email addresses
   - Check spam folder
   - Verify formatting

4. **Keep webhook URL secret**
   - Don't commit to git
   - Store in .env only
   - Use ZAPIER_SECRET for extra security

5. **Set up failure notifications**
   - In Zapier, enable email alerts for failures
   - Monitor Zap health regularly

6. **Use descriptive email subjects**
   - Makes debugging easier
   - Better user experience

---

## 🆘 Need Help?

- **Test Script:** `node test-zapier-email.js your-email@gmail.com`
- **Check Logs:** `pm2 logs | grep -i email`
- **Zapier Support:** https://help.zapier.com/
- **Task History:** https://zapier.com/app/history

---

## 📚 Additional Resources

- **Zapier Webhooks Docs:** https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks
- **Email by Zapier:** https://zapier.com/apps/email/integrations
- **API Rate Limits:** https://zapier.com/help/account/account-settings/zapier-plan-limits

---

**Last Updated:** 2025-10-22
