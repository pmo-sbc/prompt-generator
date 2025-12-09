/**
 * AI Prompt Templates - Main Server
 * Refactored for maintainability, scalability, and testability
 */

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

// Import configuration
const config = require('./src/config');

// Import utilities
const logger = require('./src/utils/logger');

// Import database
const { initializeDatabase, closeDatabase, getDatabase } = require('./src/db');

// Import middleware
const { configureHelmet, configureApiRateLimit, securityHeaders } = require('./src/middleware/security');
const { sanitizeBody } = require('./src/middleware/validation');
const { attachUser } = require('./src/middleware/auth');
const {
  requestLogger,
  notFoundHandler,
  globalErrorHandler
} = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const promptRoutes = require('./src/routes/promptRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const pageRoutes = require('./src/routes/pageRoutes');
const templateRoutes = require('./src/routes/templateRoutes');
const userManagementRoutes = require('./src/routes/userManagementRoutes');
const generatePromptRoutes = require('./src/routes/generatePromptRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const communityRoutes = require('./src/routes/communityRoutes');
const servicePackageRoutes = require('./src/routes/servicePackageRoutes');
const promptGeneratorRoutes = require('./src/routes/promptGeneratorRoutes');
const adminTemplateRoutes = require('./src/routes/adminTemplateRoutes');
const approvalRoutes = require('./src/routes/approvalRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const activityLogRoutes = require('./src/routes/activityLogRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const productManagementRoutes = require('./src/routes/productManagementRoutes');
const discountCodeManagementRoutes = require('./src/routes/discountCodeManagementRoutes');
const publicProductRoutes = require('./src/routes/publicProductRoutes');

// Initialize Express app
const app = express();

// Trust proxy - required for production behind reverse proxies (Nginx, Apache, Cloudflare, etc.)
// This ensures req.ip and secure cookies work correctly
if (config.isProduction) {
  app.set('trust proxy', 1); // Trust first proxy
  logger.info('Trust proxy enabled for production');
}

// Initialize database (async)
let dbInitialized = false;
initializeDatabase()
  .then(() => {
    logger.info('Database initialized successfully');
    dbInitialized = true;
  })
  .catch((error) => {
    logger.error('Failed to initialize database', error);
    process.exit(1);
  });

// ===== MIDDLEWARE SETUP =====

// 1. Request logging (first middleware to capture all requests)
app.use(requestLogger);

// 2. Generate CSP nonce for each request (MUST be before Helmet)
// This nonce is used in CSP headers for inline scripts
app.use((req, res, next) => {
  // Generate a random nonce for this request
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// 3. Security headers (Helmet uses the nonce from res.locals)
app.use(configureHelmet());
app.use(securityHeaders);

// Explicitly remove CSP headers (CSP is disabled)
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('content-security-policy');
  next();
});

// 3. Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sanitizeBody);

// 4. Cookie parser (required for CSRF)
app.use(cookieParser());

// 5. CSP nonce injection middleware (before static files)
// This injects nonces into HTML files for inline scripts
const injectCspNonce = require('./src/middleware/injectCspNonce');
app.use(injectCspNonce);

// 6. Static files
app.use(express.static(path.join(__dirname, 'public')));

// 7. Session configuration with PostgreSQL store
const sessionStore = new pgSession({
  pool: getDatabase(), // PostgreSQL pool
  tableName: 'user_sessions', // Optional: custom table name
  createTableIfMissing: true // Automatically create session table
});

app.use(session({
  ...config.session,
  store: sessionStore
}));

// 8. Attach user info to request
app.use(attachUser);

// 9. Validate device fingerprint for authenticated sessions
// This middleware runs after session is established but before routes
app.use((req, res, next) => {
  // Only validate if user is authenticated
  if (req.session && req.session.userId && req.session.deviceFingerprint) {
    const { validateFingerprint, generateFingerprint } = require('./src/utils/deviceFingerprint');
    
    const isValid = validateFingerprint(req, req.session);
    
    if (!isValid) {
      logger.warn('Device fingerprint mismatch - invalidating session', {
        userId: req.session.userId,
        url: req.originalUrl,
        ip: req.ip
      });
      
      // Destroy session for security
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session on fingerprint mismatch', err);
        }
      });
      
      // For API requests, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          error: 'Session invalid',
          message: 'Your session has been invalidated for security reasons. Please log in again.',
          redirect: '/login?error=session_invalid'
        });
      }
      
      // For page requests, redirect to login
      return res.redirect('/login?error=session_invalid');
    }
    
    // Update last activity timestamp
    req.session.lastActivity = Date.now();
  } else if (req.session && req.session.userId && !req.session.deviceFingerprint) {
    // Generate fingerprint for existing sessions (migration support)
    const { generateFingerprint } = require('./src/utils/deviceFingerprint');
    req.session.deviceFingerprint = generateFingerprint(req);
    req.session.lastActivity = Date.now();
  }
  
  next();
});

// 10. Rate limiting for API routes
app.use('/api/', configureApiRateLimit());

// ===== ROUTES =====

// Health check routes (no auth required, should be first)
app.use('/', healthRoutes);

// Authentication routes (includes /login, /signup, /api/register, /api/login, /api/logout, /api/user)
app.use('/', authRoutes);

// Page routes (/, /dashboard, /templates, /about)
app.use('/', pageRoutes);

// User management routes
app.use('/', userManagementRoutes);

// Profile routes
app.use('/', profileRoutes);

// Company routes
app.use('/', companyRoutes);

// Community routes
app.use('/', communityRoutes);
app.use('/', servicePackageRoutes);
app.use('/', promptGeneratorRoutes);

// User approval routes (must be registered BEFORE adminTemplateRoutes)
// adminTemplateRoutes has router.use(requireAdmin) which blocks all /admin/* routes
app.use('/', approvalRoutes);

// Admin template management routes
app.use('/admin', adminTemplateRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Prompt Templates API',
  customfavIcon: '/favicon.png'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Public config endpoints
app.get('/api/config/stripe-test-mode', (req, res) => {
  res.json({ isTestMode: config.stripe.testMode });
});

app.get('/api/config/stripe-publishable-key', (req, res) => {
  res.json({ 
    publishableKey: config.stripe.publishableKey || '',
    testMode: config.stripe.testMode 
  });
});

app.get('/api/config/paypal-client-id', (req, res) => {
  res.json({ 
    clientId: config.paypal.clientId || '',
    sandboxMode: config.paypal.sandboxMode 
  });
});

// API routes
app.use('/api/prompts', promptRoutes);
app.use('/api/usage', statsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api', generatePromptRoutes);
app.use('/api', projectRoutes);
app.use('/api/activity', activityLogRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', orderRoutes);
app.use('/', publicProductRoutes);
app.use('/', productManagementRoutes);
app.use('/', discountCodeManagementRoutes);

// ===== ERROR HANDLING =====

// 404 handler (must be after all other routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// ===== SERVER STARTUP =====

const server = app.listen(config.port, () => {
  logger.info(`Server started on port ${config.port}`, {
    environment: config.nodeEnv,
    url: `http://localhost:${config.port}`
  });

  if (!config.isProduction) {
    logger.info('Development mode enabled - verbose logging active');
  }
});

// ===== GRACEFUL SHUTDOWN =====

function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connection
    closeDatabase();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

module.exports = app; // Export for testing
