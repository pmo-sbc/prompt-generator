# Fix Password Reset Error on Production

## The Error
```
no such column: password_reset_token
```

## Why This Happens
Your production database is missing the `password_reset_token` columns. These need to be added via migration.

## Step-by-Step Fix

### Step 1: Upload Files to Production Server
Upload these files to your production server:
- `migrate-add-password-reset.js`
- `check-database-columns.js` (optional, for testing)

### Step 2: SSH into Your Production Server
```bash
ssh your-user@your-production-server
cd /path/to/your/app
```

### Step 3: Check Current Database State (Optional)
```bash
node check-database-columns.js
```

You should see that `password_reset_token` is **✗ MISSING**

### Step 4: Backup Database
**CRITICAL - Don't skip this!**
```bash
cp prompts.db prompts.db.backup.$(date +%Y%m%d-%H%M%S)
```

### Step 5: Stop Your Application
```bash
# If using PM2:
pm2 stop all

# Or if using systemd:
sudo systemctl stop your-app-name

# Or if running directly:
pkill node
```

### Step 6: Run the Migration
```bash
node migrate-add-password-reset.js
```

Expected output:
```
Migrating database: prompts.db
Starting migration...

Adding password_reset_token column...
✓ Added password_reset_token column
Adding password_reset_token_expires column...
✓ Added password_reset_token_expires column
Adding is_admin column...
✓ Added is_admin column (or already exists)
✓ Set user "username" (ID: 1) as admin

✓ Migration completed successfully!
Your database now supports:
  - Password reset functionality
  - Admin user management
```

### Step 7: Verify Migration (Optional)
```bash
node check-database-columns.js
```

Now you should see `password_reset_token: ✓ EXISTS`

### Step 8: Restart Your Application
```bash
# If using PM2:
pm2 start all
# or
pm2 start server.js

# Or if using systemd:
sudo systemctl start your-app-name

# Or if running directly:
npm start
```

### Step 9: Test the Feature
1. Go to `https://your-domain.com/admin-users.html`
2. Find a user with verified email
3. Click "🔑 Reset PW" button
4. Should now work without errors!

## If Something Goes Wrong

### Restore from Backup
```bash
# Stop the app
pm2 stop all

# Restore backup
cp prompts.db.backup.* prompts.db

# Restart app
pm2 start all
```

## Alternative: Manual SQL (if migration script doesn't work)

If for some reason the migration script fails, you can add the columns manually:

```bash
# Open SQLite
sqlite3 prompts.db

# Run these commands:
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_token_expires DATETIME;
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;

# Make first user admin
UPDATE users SET is_admin = 1 WHERE id = 1;

# Exit
.quit
```

## Need Help?

If you're still getting errors:
1. Check the exact error message
2. Run `node check-database-columns.js` and send me the output
3. Check if you have write permissions to the database file
4. Make sure the database file path is correct (check your .env file for DB_PATH)

---

# Fix Authentication Error in Production

## Issue: Getting "Authentication required" error

Error message:
```json
{"error":"Authentication required","message":"You must be logged in to access this resource"}
```

This means sessions are not being persisted between requests.

---

## Fix 1: Trust Proxy Setting (CRITICAL) ✅

**Status:** FIXED in server.js

If you're using a reverse proxy (Nginx, Apache, Cloudflare), Express needs to trust proxy headers.

**What was added:**
```javascript
if (config.isProduction) {
  app.set('trust proxy', 1);
}
```

This is now automatically enabled when `NODE_ENV=production`.

**ACTION REQUIRED:** Restart your server after pulling these changes.

---

## Fix 2: Ensure HTTPS is Configured

Your session cookies have `secure: true` in production, which requires HTTPS.

### Check if HTTPS is working:
```bash
curl -I https://yourdomain.com
```

### If you're using Nginx, ensure SSL is configured:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### If HTTPS is not available yet:
Add this to your `.env`:
```env
NODE_ENV=development
```
This will disable the secure cookie requirement temporarily.

---

## Fix 3: Check Environment Variables

Ensure these are set in your production `.env`:

```env
NODE_ENV=production
SESSION_SECRET=your-strong-secret-here
PORT=3000
```

Generate a strong session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Fix 4: Check Cookie Domain (if frontend and backend are on different domains)

If your frontend is on `app.yourdomain.com` and backend is on `api.yourdomain.com`, update the session config:

Edit `src/config/index.js`:
```javascript
session: {
  secret: process.env.SESSION_SECRET,
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',  // Changed from 'strict'
    domain: '.yourdomain.com'  // Add this line
  }
}
```

---

## Fix 5: Verify Session Store

Check if sessions table exists in your database:

```bash
sqlite3 prompts.db "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';"
```

If the table doesn't exist, restart your server to create it automatically.

---

## Fix 6: Check CORS (if applicable)

If you separated frontend and backend, you need CORS:

```bash
npm install cors
```

Add to `server.js` (after `const app = express();`):
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'https://yourdomain.com',  // Your frontend URL
  credentials: true  // Allow cookies
}));
```

---

## Testing Steps

### 1. Check if server starts correctly:
```bash
NODE_ENV=production node server.js
```

Look for:
```
[INFO] Trust proxy enabled for production
[INFO] Server running on port 3000
```

### 2. Test login endpoint:
```bash
curl -X POST https://yourdomain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' \
  -c cookies.txt -v
```

Check for `Set-Cookie` in the response headers.

### 3. Test authenticated endpoint:
```bash
curl https://yourdomain.com/api/user \
  -b cookies.txt -v
```

Should return user data, not authentication error.

---

## Common Authentication Issues

### Issue: "Set-Cookie" header not appearing
**Cause:** HTTPS not configured but `secure: true` is set
**Fix:** Either enable HTTPS or set `NODE_ENV=development`

### Issue: Cookies received but not sent on subsequent requests
**Cause:** Wrong domain or sameSite setting
**Fix:** Check cookie domain matches your URL, set `sameSite: 'lax'`

### Issue: Sessions working locally but not in production
**Cause:** Missing `trust proxy` setting
**Fix:** Already fixed in server.js - pull changes and restart

### Issue: Random logouts or sessions expiring immediately
**Cause:** Session store not persisting or multiple server instances without shared store
**Fix:** Use Redis or PostgreSQL session store for multiple servers

---

## Production Deployment Checklist

- [ ] `NODE_ENV=production` is set
- [ ] Strong `SESSION_SECRET` is set (not default value)
- [ ] HTTPS is configured and working
- [ ] `trust proxy` is enabled (pull latest changes)
- [ ] Session store is working (check sessions table)
- [ ] Firewall allows traffic on port 3000 (or your configured port)
- [ ] Database file has correct permissions
- [ ] All environment variables are set correctly

---

## Quick Restart Commands

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart server with PM2
pm2 restart ai-prompts

# Or if using systemd
sudo systemctl restart ai-prompts

# Or if running manually
pkill node && NODE_ENV=production node server.js
```
