# Architecture Guide

## Quick Reference

### Project Structure at a Glance

```
src/
├── config/           → Configuration management
├── db/              → Data access layer (repositories)
├── middleware/      → Request processing (auth, validation, errors)
├── routes/          → HTTP endpoints
├── utils/           → Utilities (logging)
└── validators/      → Input validation schemas
```

## Module Overview

### Configuration (src/config/)
**Purpose:** Centralize all configuration settings

**File:** `index.js`
- Environment variables
- Server settings
- Session configuration
- Security settings
- Validation rules
- Database configuration

**Usage:**
```javascript
const config = require('./src/config');
console.log(config.port); // 3000
console.log(config.isProduction); // false
```

---

### Database Layer (src/db/)
**Purpose:** Separate data access from business logic

#### Files:
1. **index.js** - Database initialization and connection
2. **userRepository.js** - User operations
3. **promptRepository.js** - Prompt operations
4. **statsRepository.js** - Statistics operations

**Key Methods:**

**userRepository:**
- `findById(userId)` - Get user by ID
- `findByUsernameOrEmail(username, email)` - Find user
- `create(username, email, hashedPassword)` - Create user
- `usernameExists(username)` - Check username
- `emailExists(email)` - Check email
- `updatePassword(userId, hashedPassword)` - Update password
- `delete(userId)` - Delete user

**promptRepository:**
- `create(userId, templateName, category, promptText, inputs)` - Save prompt
- `findByUserId(userId, limit, offset)` - Get user's prompts
- `findById(promptId, userId)` - Get specific prompt
- `delete(promptId, userId)` - Delete prompt
- `countByUserId(userId)` - Count user's prompts
- `search(userId, searchTerm)` - Search prompts

**statsRepository:**
- `trackUsage(userId, templateName, category)` - Track usage
- `getTotalUsage(userId)` - Get total count
- `getUsageByCategory(userId)` - Category stats
- `getRecentActivity(userId, limit)` - Recent activity
- `getMostUsedTemplates(userId, limit)` - Top templates
- `getUserStats(userId)` - Comprehensive stats

**Usage:**
```javascript
const userRepository = require('./src/db/userRepository');
const user = userRepository.findById(1);
```

---

### Middleware (src/middleware/)
**Purpose:** Handle cross-cutting concerns

#### Files:

**1. auth.js** - Authentication
- `requireAuth` - Protect routes
- `redirectIfAuthenticated` - Redirect logged-in users
- `attachUser` - Add user to request

**2. validation.js** - Input validation
- `handleValidationErrors` - Process validation results
- `sanitizeBody` - Prevent prototype pollution

**3. errorHandler.js** - Error management
- `AppError` - Custom error class
- `asyncHandler(fn)` - Wrap async functions
- `notFoundHandler` - 404 handler
- `globalErrorHandler` - Catch all errors
- `requestLogger` - Log requests

**4. security.js** - Security configuration
- `configureHelmet()` - Security headers
- `configureApiRateLimit()` - API rate limiter
- `configureAuthRateLimit()` - Auth rate limiter
- `configureCsrf()` - CSRF protection
- `sendCsrfToken` - Send token to client
- `securityHeaders` - Additional headers

**Usage:**
```javascript
const { requireAuth } = require('./src/middleware/auth');
router.get('/dashboard', requireAuth, (req, res) => {
  // Protected route
});
```

---

### Routes (src/routes/)
**Purpose:** Handle HTTP endpoints

#### Files:

**1. authRoutes.js** - Authentication endpoints
- `GET /login` - Login page
- `GET /signup` - Signup page
- `POST /api/register` - Register user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user` - Get current user

**2. promptRoutes.js** - Prompt management
- `POST /api/prompts/save` - Save prompt
- `GET /api/prompts` - Get all prompts
- `GET /api/prompts/:id` - Get specific prompt
- `DELETE /api/prompts/:id` - Delete prompt
- `POST /api/prompts/search` - Search prompts

**3. statsRoutes.js** - Statistics
- `POST /api/usage` - Track usage
- `GET /api/stats` - Get all stats
- `GET /api/stats/category` - Category stats
- `GET /api/stats/recent` - Recent activity
- `GET /api/stats/templates` - Most used templates

**4. pageRoutes.js** - HTML pages
- `GET /` - Home or dashboard
- `GET /dashboard` - User dashboard
- `GET /templates` - Templates page
- `GET /about` - About page

---

### Utils (src/utils/)
**Purpose:** Utility functions

**logger.js** - Logging utility
- `logger.error(message, error)` - Log errors
- `logger.warn(message, data)` - Log warnings
- `logger.info(message, data)` - Log info
- `logger.debug(message, data)` - Log debug (dev only)
- `logger.request(req, res, time)` - Log HTTP requests
- `logger.db(operation, table, data)` - Log DB operations (dev only)

**Usage:**
```javascript
const logger = require('./src/utils/logger');
logger.info('User logged in', { userId: 123 });
logger.error('Database error', error);
```

---

### Validators (src/validators/)
**Purpose:** Input validation schemas

**index.js** - Validation rules
- `validators.register` - Registration validation
- `validators.login` - Login validation
- `validators.savePrompt` - Save prompt validation
- `validators.trackUsage` - Usage tracking validation
- `validators.deletePrompt` - Delete prompt validation
- `validators.searchPrompts` - Search validation

**Usage:**
```javascript
const validators = require('./src/validators');
router.post('/api/register',
  validators.register,
  handleValidationErrors,
  async (req, res) => {
    // Handler
  }
);
```

---

## Request Flow

### Authentication Flow
```
Client Request
  ↓
requestLogger (log request)
  ↓
Security Middleware (helmet, rate limiting)
  ↓
Body Parsing & Sanitization
  ↓
Session Middleware
  ↓
Auth Route Handler
  ↓
Validation Middleware
  ↓
User Repository (database)
  ↓
Response
  ↓
requestLogger (log response)
```

### Protected Route Flow
```
Client Request
  ↓
All Basic Middleware (above)
  ↓
requireAuth Middleware (check session)
  ↓
CSRF Protection
  ↓
Route-specific Validation
  ↓
Repository (database operation)
  ↓
Response
```

### Error Flow
```
Error Occurs
  ↓
asyncHandler (catch async errors)
  ↓
globalErrorHandler
  ↓
logger.error() or logger.warn()
  ↓
JSON Error Response
```

---

## How to Add New Features

### Adding a New API Endpoint

**1. Create validation schema** (src/validators/index.js)
```javascript
newFeature: [
  body('field').trim().notEmpty().withMessage('Field required')
]
```

**2. Add repository method** (create new repository if needed)
```javascript
// src/db/featureRepository.js
class FeatureRepository {
  create(data) {
    // Implementation
  }
}
```

**3. Create route** (src/routes/featureRoutes.js)
```javascript
router.post('/api/feature',
  requireAuth,
  validators.newFeature,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    // Handler using repository
  })
);
```

**4. Register route** (server.js)
```javascript
const featureRoutes = require('./src/routes/featureRoutes');
app.use('/api/feature', featureRoutes);
```

### Adding Middleware

**1. Create middleware** (src/middleware/myMiddleware.js)
```javascript
function myMiddleware(req, res, next) {
  // Logic
  next();
}
module.exports = { myMiddleware };
```

**2. Apply middleware** (server.js or specific route)
```javascript
const { myMiddleware } = require('./src/middleware/myMiddleware');
app.use(myMiddleware); // Global
// OR
router.use(myMiddleware); // Route-specific
```

### Adding Configuration

**1. Add to .env**
```
NEW_CONFIG=value
```

**2. Add to config** (src/config/index.js)
```javascript
const config = {
  // ... existing
  newConfig: process.env.NEW_CONFIG || 'default'
};
```

**3. Use everywhere**
```javascript
const config = require('./src/config');
console.log(config.newConfig);
```

---

## Debugging Tips

### Enable Verbose Logging
Set `NODE_ENV=development` in `.env` to see:
- Database queries
- Debug messages
- Detailed error stacks

### Check Logs
All operations are logged with timestamps and context:
```
[2025-10-15T21:49:08.024Z] [DEBUG] Database tables created/verified
[2025-10-15T21:49:08.025Z] [INFO] Database initialized successfully
[2025-10-15T21:49:08.031Z] [INFO] Server started on port 3000
```

### Database Issues
```javascript
// In src/config/index.js, enable verbose mode:
database: {
  verbose: console.log // See all SQL queries
}
```

### Request Logging
Every HTTP request is logged with:
- Method and URL
- Status code
- Response time
- IP address

---

## Testing Strategy

### Unit Tests (Recommended)
```javascript
// test/db/userRepository.test.js
const userRepository = require('../../src/db/userRepository');

describe('UserRepository', () => {
  test('should create user', () => {
    const user = userRepository.create('test', 'test@example.com', 'hash');
    expect(user.username).toBe('test');
  });
});
```

### Integration Tests
```javascript
// test/routes/authRoutes.test.js
const request = require('supertest');
const app = require('../../server');

describe('Auth Routes', () => {
  test('POST /api/register', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'test', email: 'test@test.com', password: 'Test123!' });
    expect(res.status).toBe(200);
  });
});
```

---

## Performance Considerations

### Database Indexes
Added in `src/db/index.js`:
- `idx_saved_prompts_user_id` - Fast user prompt lookups
- `idx_usage_stats_user_id` - Fast user stats
- `idx_usage_stats_category` - Fast category queries

### Caching Opportunities
- Session data (already cached via express-session)
- User data (can add Redis)
- Static content (can add CDN)
- Frequently used stats (can add Redis)

### Connection Pooling
SQLite is single-connection. For production with PostgreSQL/MySQL:
```javascript
// Update src/db/index.js to use connection pool
const pool = new Pool(config.database);
```

---

## Security Best Practices

### Already Implemented
- Password hashing (bcrypt)
- CSRF protection
- Rate limiting (API and Auth)
- Helmet security headers
- Session security
- Input validation and sanitization
- SQL injection prevention (prepared statements)
- XSS prevention (input escaping)

### Additional Recommendations
1. Enable HTTPS in production
2. Set secure cookies (`config.session.cookie.secure = true`)
3. Implement 2FA for sensitive operations
4. Add email verification
5. Implement password reset with tokens
6. Add audit logging
7. Regular security audits
8. Keep dependencies updated

---

## Common Patterns

### Async Route Handler
```javascript
router.post('/endpoint',
  asyncHandler(async (req, res) => {
    // Async code - errors caught automatically
    const data = await someAsyncOperation();
    res.json(data);
  })
);
```

### Protected Route
```javascript
router.get('/protected',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Only authenticated users reach here
    const userId = req.session.userId;
    // ...
  })
);
```

### Validated Route
```javascript
router.post('/validated',
  validators.schema,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    // Input is validated
    const { field } = req.body;
    // ...
  })
);
```

### Full Protection
```javascript
router.post('/api/secure',
  requireAuth,           // Must be logged in
  csrfProtection,       // CSRF token required
  validators.schema,     // Input validated
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    // Fully protected endpoint
  })
);
```

---

**Last Updated:** 2025-10-15
**Version:** 2.0 (Refactored)
