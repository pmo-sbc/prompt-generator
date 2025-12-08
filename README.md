# AI Prompt Templates - With Authentication

A professional web application for generating high-quality AI prompts with user authentication, database storage, and saved prompts functionality.

## 🎯 New Features

- ✅ **User Authentication** - Secure login/signup system
- ✅ **Database Storage** - SQLite database for user data
- ✅ **Save Prompts** - Save your favorite prompts
- ✅ **User Dashboard** - View stats and saved prompts
- ✅ **Usage Tracking** - Track which templates you use most
- ✅ **Session Management** - Secure session handling

## 📁 Project Structure

```
website-with-auth/
├── server.js                # Express backend server
├── package.json             # Node.js dependencies
├── .env.example             # Environment variables template
├── prompts.db               # SQLite database (auto-created)
├── public/                  # Frontend files
│   ├── index.html           # Landing page
│   ├── login.html           # Login page
│   ├── signup.html          # Signup page
│   ├── dashboard.html       # User dashboard
│   ├── templates.html       # Templates tool
│   ├── about.html           # About page
│   └── css/
│       └── styles.css       # Styles
└── README.md                # This file
```

## 🚀 Installation

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)

### Step 1: Install Node.js

If you don't have Node.js installed:

**Windows/Mac:**
- Download from https://nodejs.org/
- Install the LTS version
- Verify installation: `node --version` and `npm --version`

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install Dependencies

```bash
cd website-with-auth
npm install
```

This will install:
- `express` - Web framework
- `express-session` - Session management
- `bcrypt` - Password hashing
- `better-sqlite3` - Database
- `body-parser` - Request parsing
- `dotenv` - Environment variables

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and change the SESSION_SECRET:
```
SESSION_SECRET=your-unique-secret-key-here
```

### Step 4: Start the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## 💻 Usage

### For End Users

1. **Open your browser** to `http://localhost:3000`
2. **Sign up** for a new account
3. **Log in** with your credentials
4. **Create prompts** using the templates
5. **Save prompts** for later use
6. **View your dashboard** to see stats and saved prompts

### User Flow

```
Home → Sign Up → Dashboard → Templates → Generate → Save → Dashboard
```

## 🗄️ Database Schema

### Users Table
```sql
- id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- password (hashed)
- created_at
```

### Saved Prompts Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- template_name
- category
- prompt_text
- inputs (JSON)
- created_at
```

### Usage Stats Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- template_name
- category
- used_at
```

## 🔐 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user` - Get current user (protected)

### Prompts
- `POST /api/prompts/save` - Save a prompt (protected)
- `GET /api/prompts` - Get user's prompts (protected)
- `DELETE /api/prompts/:id` - Delete prompt (protected)

### Stats
- `POST /api/usage` - Track template usage (protected)
- `GET /api/stats` - Get user statistics (protected)

### Pages
- `GET /` - Home page (or dashboard if logged in)
- `GET /login` - Login page
- `GET /signup` - Signup page
- `GET /dashboard` - User dashboard (protected)

## 🔒 Security Features

1. **Password Hashing** - bcrypt with salt rounds
2. **Session Management** - Secure session cookies
3. **Protected Routes** - Authentication middleware
4. **SQL Injection Prevention** - Prepared statements
5. **Input Validation** - Server-side validation

## 🛠️ Development

### Running in Development

```bash
npm run dev
```

This uses `nodemon` for auto-restart on file changes.

### Database Management

**View database:**
```bash
sqlite3 prompts.db
.tables
.schema users
SELECT * FROM users;
```

**Reset database:**
```bash
rm prompts.db
# Restart server - tables will be recreated
```

## 📦 Deployment

### Option 1: Deploy to Heroku

1. Create Heroku app
2. Add SQLite buildpack (or switch to PostgreSQL)
3. Set environment variables
4. Deploy

```bash
heroku create your-app-name
heroku config:set SESSION_SECRET=your-secret
git push heroku main
```

### Option 2: Deploy to DigitalOcean/AWS

1. Set up Ubuntu server
2. Install Node.js
3. Clone repository
4. Install dependencies
5. Use PM2 for process management
6. Set up Nginx as reverse proxy

```bash
npm install -g pm2
pm2 start server.js --name "ai-prompts"
pm2 startup
pm2 save
```

### Option 3: Docker

```dockerfile
FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🎨 Customization

### Adding New Templates

Edit `public/templates.html` and add to the `templates` object.

### Changing Styles

Edit `public/css/styles.css`.

### Database Changes

Edit `server.js` database schema and restart.

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env file
PORT=3001
```

**Database locked:**
```bash
# Close all connections and restart
rm prompts.db
npm start
```

**bcrypt installation issues (Windows):**
```bash
npm install --global --production windows-build-tools
npm install bcrypt
```

**Session not persisting:**
- Check SESSION_SECRET is set
- Ensure cookies are enabled
- Check browser console for errors

## 📊 Monitoring

### View Logs

```bash
# Development
npm run dev

# Production with PM2
pm2 logs ai-prompts
pm2 monit
```

### Database Stats

```bash
sqlite3 prompts.db "SELECT COUNT(*) FROM users;"
sqlite3 prompts.db "SELECT COUNT(*) FROM saved_prompts;"
```

## 🔄 Backup

### Backup Database

```bash
# Manual backup
cp prompts.db prompts.db.backup

# Automated backup (add to cron)
0 2 * * * cp /path/to/prompts.db /path/to/backups/prompts-$(date +\%Y\%m\%d).db
```

## 🚨 Production Checklist

- [ ] Change SESSION_SECRET
- [ ] Use HTTPS (set `cookie: { secure: true }`)
- [ ] Set NODE_ENV=production
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Use reverse proxy (Nginx)
- [ ] Enable CORS properly
- [ ] Add CSP headers

## 💡 Tips

1. **Regular Backups** - Backup `prompts.db` regularly
2. **Monitor Usage** - Check `usage_stats` table for insights
3. **Update Dependencies** - Run `npm audit` periodically
4. **Use Environment Variables** - Never commit `.env` file
5. **Test Locally** - Always test changes before deploying

## 📝 License

This project is provided as-is for educational and commercial use.

## 🤝 Support

For issues:
1. Check this README
2. Check server console logs
3. Check browser console
4. Verify database exists and has correct schema

## 📞 Technical Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Authentication:** bcrypt + express-session
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **No frameworks:** Pure, simple, easy to understand

---

**Version:** 2.0 (With Authentication)
**Last Updated:** 2025
**Node Version:** >=14.0.0
