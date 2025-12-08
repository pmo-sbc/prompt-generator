# 🚀 Zapier Email - Quick Start (5 Minutes)

Fast setup guide for Zapier email integration.

---

## ✅ Checklist

### **Step 1: Create Zap (2 minutes)**

1. Go to https://zapier.com/app/zaps
2. Click **"Create Zap"**
3. **Trigger:**
   - Choose "Webhooks by Zapier"
   - Event: "Catch Hook"
   - **COPY THE WEBHOOK URL** ← Important!
4. **Action:**
   - Choose "Email by Zapier" (or Gmail/SendGrid)
   - Event: "Send Outbound Email"
   - **Map fields:**
     - To → `to_email`
     - From → `from_email`
     - Subject → `subject`
     - Body → `html_body`
     - **Body Type → "HTML"** ← Important!
5. **Test & Turn On**

---

### **Step 2: Configure App (2 minutes)**

```bash
# 1. Install axios
npm install axios

# 2. Edit .env
nano /var/www/website-with-auth-secured/.env
```

**Add this:**
```env
ZAPIER_WEBHOOK_URL=paste-your-webhook-url-here
EMAIL_FROM=SBC Services <pmo@sbc-servicesinc.com>
```

```bash
# 3. Replace email service
cp src/services/emailService.js src/services/emailService.js.backup
cp src/services/emailService-zapier.js src/services/emailService.js

# 4. Restart
pm2 restart all
```

---

### **Step 3: Test (1 minute)**

```bash
node test-zapier-email.js your-email@gmail.com
```

**Check your inbox!** ✅

---

## 🎯 What Data You Need

Just give me:

1. **Zapier Webhook URL**
   - From Step 1, looks like: `https://hooks.zapier.com/hooks/catch/123456/abcdef/`

2. **Email FROM address** (optional)
   - e.g., `SBC Services <pmo@sbc-servicesinc.com>`

That's it! The email format stays exactly the same.

---

## 📧 Zapier Field Mapping

In your Zap action, map these fields:

| Zapier Field | Maps To | Example |
|--------------|---------|---------|
| **To** | `to_email` | user@example.com |
| **From** | `from_email` | SBC <no-reply@domain.com> |
| **Subject** | `subject` | Verify Your Email |
| **Body** | `html_body` | [full HTML content] |
| **Body Type** | Select "HTML" | HTML (not Plain) |

---

## 🆘 Quick Troubleshooting

**Email not arriving?**
- Check Zapier "Task History" for errors
- Verify Zap is turned ON
- Make sure Body Type is set to "HTML"

**Webhook not working?**
- Verify ZAPIER_WEBHOOK_URL in .env is correct
- Make sure you restarted the app: `pm2 restart all`

**Formatting broken?**
- In Zapier, set Body Type to "HTML" (not Plain Text)

---

## 📚 Full Documentation

- **Complete Guide:** ZAPIER-SETUP-GUIDE.md
- **Test Script:** `node test-zapier-email.js`
- **Support:** https://help.zapier.com/

---

**Ready?** Give me your Zapier webhook URL and I'll help you get it set up! 🚀
