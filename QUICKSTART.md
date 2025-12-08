# Quick Start Guide

## ⚡ Get Running in 5 Minutes

### 1. Install Node.js
Download and install from https://nodejs.org/ (if you don't have it)

### 2. Install Dependencies
```bash
cd website-with-auth
npm install
```

### 3. **IMPORTANT: Security Setup** 🔒
Run the setup wizard to configure secure settings:
```bash
npm run setup
```

This will:
- Auto-generate a secure SESSION_SECRET
- Create your .env configuration file
- Set up your port and environment

**Alternative Manual Setup:**
```bash
# Copy the example file
cp .env.example .env

# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env and paste the generated secret into SESSION_SECRET
```

⚠️ **CRITICAL:** The server will NOT start without a proper SESSION_SECRET!

### 4. Start Server
```bash
npm start
```

### 5. Open Browser
Go to http://localhost:3000

### 6. Create Account
Click "Sign Up" and create your first account!

---

## 🎯 What You Get

✅ User authentication (login/signup) with **bcrypt password hashing**
✅ Save your favorite prompts
✅ Personal dashboard with statistics
✅ Track template usage
✅ All 27+ marketing templates
✅ Works with ChatGPT, Claude, Gemini, etc.
✅ **Rate limiting** to prevent abuse
✅ **CSRF protection** for secure forms
✅ **Input validation** to prevent attacks
✅ **Security headers** with Helmet.js

---

## 🔒 Security Features

This version includes enterprise-grade security:

1. **Password Security**: Bcrypt hashing, strength requirements
2. **Rate Limiting**: Prevents brute force attacks
3. **CSRF Protection**: Secure against cross-site attacks
4. **Input Validation**: Server-side validation on all inputs
5. **Secure Sessions**: httpOnly, secure cookies in production
6. **Security Headers**: Helmet.js protection

See **SECURITY.md** for complete security documentation.

---

## 📝 First-Time Setup

1. **Sign Up** - Create your account at `/signup`
2. **Log In** - Log in at `/login`
3. **Generate** - Go to Templates and create a prompt
4. **Save** - Save prompts you want to reuse
5. **Dashboard** - View your saved prompts and stats

---

## 🔐 Password Requirements

New security requirements for passwords:
- **Minimum 8 characters** (increased from 6)
- **At least one uppercase letter**
- **At least one lowercase letter**
- **At least one number**

Example valid password: `MyPass123`

---

## 🔐 Default Admin

There is no default admin account. The first user you create is your first user!

---

## 🗄️ Database

- SQLite database created automatically
- Located at `prompts.db`
- No configuration needed
- Backs up with a simple file copy

---

## 🚨 Common Issues

**"Port 3000 already in use"**
```bash
# Option 1: Change port
# Edit .env file: PORT=3001

# Option 2: Kill process using port 3000
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

**"Cannot find module"**
```bash
npm install
```

**"bcrypt" errors on Windows**
```bash
npm install --global --production windows-build-tools
npm install
```

---

## 📱 Using the App

### Create Your First Prompt

1. Go to **Templates** page
2. Select a category (e.g., "Frameworks")
3. Choose a template (e.g., "AIDA Framework")
4. Fill in your business details
5. Click "Execute Template"
6. Click "Save Prompt" (new button with auth enabled!)
7. Find it later in your Dashboard

### View Your Stats

1. Go to **Dashboard**
2. See:
   - Total saved prompts
   - Templates used count
   - Most used category
   - Recent activity
   - All saved prompts

---

## 🎓 Example Workflow

```
1. Sign Up → Create account (username: demo, password: demo123)
2. Login → Log in with credentials
3. Templates → Select "AIDA Framework"
4. Input → "FitLife Pro fitness app"
5. Generate → Click "Execute Template"
6. Save → Click "Save Prompt"
7. Dashboard → View saved prompt
8. Reuse → Copy from dashboard anytime
```

---

## 🔧 For Developers

**Start with auto-reload:**
```bash
npm run dev
```

**View database:**
```bash
sqlite3 prompts.db
.tables
SELECT * FROM users;
```

**Reset everything:**
```bash
rm prompts.db
npm start
```

---

## 📦 Production Deployment

1. Set strong `SESSION_SECRET` in `.env`
2. Use process manager (PM2)
3. Set up reverse proxy (Nginx)
4. Enable HTTPS
5. Set up automated backups

```bash
# Quick PM2 setup
npm install -g pm2
pm2 start server.js --name ai-prompts
pm2 startup
pm2 save
```

---

## 🎉 That's It!

You now have a fully functional AI prompt templates app with:
- User authentication
- Database storage  
- Saved prompts
- Usage tracking
- Personal dashboard

Need more help? Check README.md for detailed documentation!

---

**Having Fun? Share with your team! 🚀**
