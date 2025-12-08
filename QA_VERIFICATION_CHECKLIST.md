# Quality Assurance Verification Checklist

**Project:** AI Prompt Templates - Website with Authentication & E-commerce  
**Version:** 2.0  
**Last Updated:** 2025-01-27  
**Purpose:** Comprehensive testing checklist to verify all features are working correctly

---

## 📖 How to Use This Document

This QA checklist is designed for testing on a **Linux production server**. Each checklist item includes:

1. **Checkbox** - Mark as complete when tested
2. **How to test** - Step-by-step instructions with Linux commands
3. **Expected result** - What you should see when the feature works correctly

### Quick Start

1. **SSH into your production server:**
   ```bash
   ssh sbc@your-production-server  # Replace with your actual server
   cd /var/www/website-with-auth-secured
   ```

2. **Start with Pre-Testing Setup** - Verify environment is configured correctly

3. **Test Critical Features First** - Use the Quick Test Checklist at the end

4. **Use Linux Commands Section** - Reference the dedicated section for performance testing commands

5. **Document Issues** - Use the Testing Notes section to record any problems found

### Testing Tools Required

Most commands use standard Linux tools. Install if needed:
```bash
sudo apt update
sudo apt install -y curl wget apache2-utils sqlite3 htop net-tools
# For advanced load testing:
sudo apt install -y wrk  # Optional
```

### Configuration Variables

**Your Production Environment:**

- **Application Path:** `/var/www/website-with-auth-secured/`
- **Database:** `/var/www/website-with-auth-secured/prompts.db`
- **Logs Directory:** `/var/www/website-with-auth-secured/logs/`
- **Backup Directory:** `/var/backups/website-with-auth-secured/`
- **Domain Name:** `txrba-2025.3rdrockads.com`
- **PM2 Process Name:** `ai-prompt-templates`
- **Internal Port:** `3000` (Node.js app, proxied by Nginx)
- **External Port:** `443` (HTTPS via Nginx)
- **System User:** `sbc` (user that runs the process)

### Important Notes

- All commands assume you have appropriate permissions
- Always backup database before testing destructive operations
- The application runs on port 3000 internally, accessed via HTTPS on port 443 through Nginx
- Use `sudo` when needed for operations requiring elevated permissions
- The system user `sbc` should own the application files

---

## 📋 Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Authentication & User Management](#authentication--user-management)
3. [Core Features](#core-features)
4. [E-commerce Features](#e-commerce-features)
5. [Admin Features](#admin-features)
6. [API Endpoints](#api-endpoints)
7. [Security Features](#security-features)
8. [Performance & Reliability](#performance--reliability)
9. [Linux Performance Testing Commands](#linux-performance-testing-commands)
10. [UI/UX Testing](#uiux-testing)
11. [Cross-Browser Testing](#cross-browser-testing)
12. [Mobile Responsiveness](#mobile-responsiveness)
13. [Error Handling](#error-handling)

---

## Pre-Testing Setup

### Environment Configuration
- [ ] Server starts without errors (`npm start` or `npm run dev`)
  - **How to test:** SSH into production server and run:
    ```bash
    cd /var/www/website-with-auth-secured
    npm start
    # OR if using PM2:
    pm2 start server.js --name "ai-prompt-templates"
    pm2 logs ai-prompt-templates
    ```
  - **Expected:** Server starts without errors, logs show "Server started on port 3000"
  
- [ ] Database initializes correctly (SQLite database created)
  - **How to test:** Check if database file exists:
    ```bash
    ls -lh /var/www/website-with-auth-secured/*.db
    # Check database schema:
    sqlite3 /var/www/website-with-auth-secured/prompts.db ".tables"
    sqlite3 /var/www/website-with-auth-secured/prompts.db "PRAGMA table_info(users);"
    ```
  - **Expected:** Database file exists, all required tables are present
  
- [ ] Environment variables are set correctly (`.env` file exists)
  - **How to test:**
    ```bash
    cd /var/www/website-with-auth-secured
    cat .env | grep -v PASSWORD  # View env vars (excluding passwords)
    # Verify required variables:
    grep -E "SESSION_SECRET|NODE_ENV|PORT" .env
    ```
  - **Expected:** All required environment variables are set
  
- [ ] All dependencies installed (`npm install` completed successfully)
  - **How to test:**
    ```bash
    cd /var/www/website-with-auth-secured
    npm list --depth=0  # Check installed packages
    # Check for missing dependencies:
    npm audit
    ```
  - **Expected:** All packages listed in package.json are installed
  
- [ ] Server accessible at configured port (default: `http://localhost:3000`)
  - **How to test:**
    ```bash
    # Test local connection:
    curl -I http://localhost:3000
    # Test from external:
    curl -I https://txrba-2025.3rdrockads.com
    # Check if port is listening:
    netstat -tlnp | grep :3000
    # OR
    ss -tlnp | grep :3000
    ```
  - **Expected:** Server responds with HTTP 200 or 302 status
  
- [ ] No console errors on server startup
  - **How to test:**
    ```bash
    # Check PM2 logs:
    pm2 logs ai-prompt-templates --lines 50
    # OR check systemd logs:
    sudo journalctl -u ai-prompt-templates -n 50
    # OR if running manually, check output for errors
    ```
  - **Expected:** No error messages in logs
  
- [ ] Health check endpoint responds (`GET /health`)
  - **How to test:**
    ```bash
    curl http://localhost:3000/health
    # OR with authentication if required:
    curl -H "Authorization: Bearer TOKEN" http://localhost:3000/health
    ```
  - **Expected:** Returns JSON with status: "ok" or similar

### Test Accounts
- [ ] Create test user account (regular user)
  - **How to test:** Use signup form or API:
    ```bash
    curl -X POST http://localhost:3000/api/register \
      -H "Content-Type: application/json" \
      -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'
    ```
  - **Expected:** User created successfully, returns user ID
  
- [ ] Create test admin account (admin user)
  - **How to test:** Create user then promote to admin:
    ```bash
    # First create user, then use admin script or database:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "UPDATE users SET is_admin = 1 WHERE username = 'testadmin';"
    ```
  - **Expected:** User has admin privileges
  
- [ ] Note test credentials for reuse during testing
  - **Document:** Username, email, password, and admin status

---

## Authentication & User Management

### User Registration
- [ ] **Sign Up Page** (`/signup`)
  - [ ] Page loads correctly
  - [ ] Form fields are visible (username, email, password, confirm password)
  - [ ] Form validation works (empty fields show errors)
  - [ ] Username validation (minimum length, special characters)
  - [ ] Email validation (format check)
  - [ ] Password validation (strength requirements)
  - [ ] Password confirmation matches password
  - [ ] Submit button works
  - [ ] Success: User created and redirected to dashboard
  - [ ] Error: Duplicate username shows error message
  - [ ] Error: Duplicate email shows error message
  - [ ] Error: Invalid email format shows error message
  - [ ] CSRF protection is active
    - **How to test:**
      ```bash
      # Check CSRF token cookie exists:
      curl -c cookies.txt -b cookies.txt http://localhost:3000/signup
      cat cookies.txt | grep XSRF-TOKEN
      
      # Test API call without CSRF token (should fail):
      curl -X POST http://localhost:3000/api/register \
        -H "Content-Type: application/json" \
        -d '{"username":"test","email":"test@test.com","password":"Test123!"}'
      # Should return 403 Forbidden
      ```
    - **Expected:** Requests without CSRF token are rejected (403)

### User Login
- [ ] **Login Page** (`/login`)
  - [ ] Page loads correctly
  - [ ] Form fields are visible (username/email, password)
  - [ ] Form validation works
  - [ ] Submit button works
  - [ ] Success: Valid credentials redirect to dashboard
  - [ ] Error: Invalid username shows error message
  - [ ] Error: Invalid password shows error message
  - [ ] Error: Empty fields show validation errors
  - [ ] "Remember me" functionality (if implemented)
  - [ ] Rate limiting prevents brute force attacks
  - [ ] CSRF protection is active
    - **How to test:**
      ```bash
      # Check CSRF token cookie exists:
      curl -c cookies.txt -b cookies.txt http://localhost:3000/login
      cat cookies.txt | grep XSRF-TOKEN
      
      # Test API call without CSRF token (should fail):
      curl -X POST http://localhost:3000/api/login \
        -H "Content-Type: application/json" \
        -d '{"username":"test","password":"test"}'
      # Should return 403 Forbidden
      ```
    - **Expected:** Requests without CSRF token are rejected (403)

### User Logout
- [ ] **Logout Functionality**
  - [ ] Logout button/link is visible when logged in
  - [ ] Logout clears session
  - [ ] User redirected to home/login page
  - [ ] Protected routes are inaccessible after logout
  - [ ] Session cookie is removed

### Password Reset
- [ ] **Forgot Password** (`/forgot-password`)
  - [ ] Page loads correctly
  - [ ] Email input field works
  - [ ] Submit sends password reset email
  - [ ] Success message displayed
  - [ ] Email received with reset link
  - [ ] Reset link is valid and not expired

- [ ] **Reset Password** (`/reset-password`)
  - [ ] Page loads with valid token
  - [ ] Invalid/expired token shows error
  - [ ] Password and confirm password fields work
  - [ ] Password validation works
  - [ ] Success: Password updated and user can login
  - [ ] Old password no longer works
  - [ ] New password works for login

### Email Verification
- [ ] **Email Verification**
  - [ ] Verification email sent after registration
  - [ ] Email contains verification link
  - [ ] Verification link works (`/verify-email`)
  - [ ] Invalid/expired token shows error
  - [ ] Success: Email verified, user can access features
  - [ ] Unverified users have limited access (if implemented)

### Session Management
- [ ] **Session Persistence**
  - [ ] Session persists across page refreshes
  - [ ] Session expires after configured time
  - [ ] Session persists after browser restart (if configured)
  - [ ] Multiple tabs share same session
  - [ ] Logout in one tab logs out all tabs (if implemented)

### User Profile
- [ ] **Profile Page** (`/profile`)
  - [ ] Page loads correctly (requires authentication)
  - [ ] User information displays correctly
  - [ ] Edit profile form works
  - [ ] Update username works
  - [ ] Update email works
  - [ ] Update password works
  - [ ] Profile picture upload (if implemented)
  - [ ] Changes are saved correctly
  - [ ] Validation errors display correctly
  - [ ] Unauthorized access redirects to login

---

## Core Features

### Landing Page
- [ ] **Home Page** (`/`)
  - [ ] Page loads correctly
  - [ ] Navigation menu works
  - [ ] All links are functional
  - [ ] Call-to-action buttons work
  - [ ] Features section displays correctly
  - [ ] Responsive design works
  - [ ] Logged-in users see different content (if implemented)

### Dashboard
- [ ] **User Dashboard** (`/dashboard`)
  - [ ] Page loads correctly (requires authentication)
  - [ ] Welcome message displays with username
  - [ ] Statistics cards display correctly:
    - [ ] Total saved prompts count
    - [ ] Templates used count
    - [ ] Most used category
  - [ ] Saved prompts list displays
  - [ ] Recent activity feed displays
  - [ ] Delete prompt button works
  - [ ] Empty state displays when no prompts saved
  - [ ] Navigation links work
  - [ ] Unauthorized access redirects to login

### Prompt Templates
- [ ] **Templates Page** (`/templates`)
  - [ ] Page loads correctly
  - [ ] All templates display correctly
  - [ ] Category dropdown works
  - [ ] Subcategory dropdown works
  - [ ] Template selection works
  - [ ] Form fields populate based on template
  - [ ] Generate prompt button works
  - [ ] Generated prompt displays correctly
  - [ ] Copy to clipboard works
  - [ ] Submit to AI platforms works (ChatGPT, Claude, etc.)
  - [ ] Save prompt button works (requires authentication)
  - [ ] Search functionality works (if implemented)
  - [ ] Filter by category works
  - [ ] Template preview works

### Prompt Generation
- [ ] **Prompt Generation API**
  - [ ] `POST /api/generate-prompt` works
  - [ ] Valid input generates prompt
  - [ ] Invalid input returns error
  - [ ] All template types work
  - [ ] Custom inputs are incorporated correctly
  - [ ] Response time is acceptable (< 2 seconds)

### Saved Prompts
- [ ] **Save Prompt**
  - [ ] Save button appears when logged in
  - [ ] Prompt saves successfully
  - [ ] Success message displays
  - [ ] Saved prompt appears in dashboard
  - [ ] Error: Not logged in shows appropriate message

- [ ] **View Saved Prompts**
  - [ ] List displays all saved prompts
  - [ ] Prompts are sorted correctly (newest first)
  - [ ] Pagination works (if implemented)
  - [ ] Search saved prompts works (if implemented)

- [ ] **Delete Saved Prompt**
  - [ ] Delete button works
  - [ ] Confirmation dialog appears (if implemented)
  - [ ] Prompt is removed from database
  - [ ] Prompt disappears from list
  - [ ] Success message displays
  - [ ] Only owner can delete their prompts

- [ ] **Share Prompt**
  - [ ] Share button works (if implemented)
  - [ ] Share link is generated
  - [ ] Share link is accessible without login
  - [ ] Shared prompt displays correctly
  - [ ] Share link expires after configured time (if implemented)

### Projects
- [ ] **Projects Page** (`/projects`)
  - [ ] Page loads correctly (requires authentication)
  - [ ] Create project button works
  - [ ] Project list displays
  - [ ] Project details display correctly
  - [ ] Edit project works
  - [ ] Delete project works
  - [ ] Project search works (if implemented)
  - [ ] Project filtering works (if implemented)

### Companies
- [ ] **Companies Page** (`/companies`)
  - [ ] Page loads correctly (requires authentication)
  - [ ] Create company button works
  - [ ] Company list displays
  - [ ] Company details display correctly
  - [ ] Edit company works
  - [ ] Delete company works
  - [ ] Company search works (if implemented)

### Communities
- [ ] **Communities Page** (`/communities`)
  - [ ] Page loads correctly (requires authentication)
  - [ ] Create community button works
  - [ ] Community list displays
  - [ ] Community details display correctly
  - [ ] Join/Leave community works (if implemented)
  - [ ] Community members display (if implemented)

### Service Packages
- [ ] **Service Packages**
  - [ ] Service packages display correctly
  - [ ] Package details display
  - [ ] Purchase package works
  - [ ] Package features are correct

### Usage Statistics
- [ ] **Statistics Tracking**
  - [ ] Usage is tracked when template is used
  - [ ] Statistics API returns correct data (`GET /api/stats`)
  - [ ] Category statistics are accurate
  - [ ] Recent activity is logged
  - [ ] Most used templates are correct
  - [ ] Statistics update in real-time

### Activity Logging
- [ ] **Activity Logs**
  - [ ] User actions are logged
  - [ ] Activity log API works (`GET /api/activity`)
  - [ ] Logs display in dashboard (if implemented)
  - [ ] Logs are searchable (if implemented)

---

## E-commerce Features

### Products
- [ ] **Product Listing** (`/products` or public product routes)
  - [ ] Products display correctly
  - [ ] Product images load
  - [ ] Product details display
  - [ ] Product search works
  - [ ] Product filtering works
  - [ ] Product categories display
  - [ ] Product pagination works (if implemented)

- [ ] **Product Details** (`/product/:id`)
  - [ ] Product page loads correctly
  - [ ] All product information displays
  - [ ] Add to cart button works
  - [ ] Quantity selector works
  - [ ] Related products display (if implemented)

### Shopping Cart
- [ ] **Cart Page** (`/cart`)
  - [ ] Page loads correctly
  - [ ] Cart items display correctly
  - [ ] Item quantity can be updated
  - [ ] Item can be removed
  - [ ] Subtotal calculates correctly
  - [ ] Tax calculates correctly (if applicable)
  - [ ] Total calculates correctly
  - [ ] Empty cart message displays
  - [ ] Continue shopping link works
  - [ ] Proceed to checkout button works
  - [ ] Cart persists across sessions (if implemented)

### Discount Codes
- [ ] **Discount Code Application**
  - [ ] Discount code input field works
  - [ ] Valid discount code applies discount
  - [ ] Invalid discount code shows error
  - [ ] Expired discount code shows error
  - [ ] Discount amount calculates correctly
  - [ ] Discount displays in cart
  - [ ] Discount displays in checkout
  - [ ] Discount code can be removed

### Checkout
- [ ] **Checkout Page** (`/checkout`)
  - [ ] Page loads correctly (requires authentication)
  - [ ] Cart items display correctly
  - [ ] Order summary is accurate
  - [ ] Personal information form works
  - [ ] Save personal information works
  - [ ] Payment method selection works
  - [ ] Stripe payment form loads
  - [ ] PayPal payment option works (if enabled)
  - [ ] Form validation works
  - [ ] Error messages display correctly

### Payment Processing

#### Stripe Integration
- [ ] **Stripe Payment**
  - [ ] Stripe publishable key loads correctly
  - [ ] Stripe Elements form displays
  - [ ] Card input field works
  - [ ] Card validation works (valid/invalid cards)
  - [ ] Payment processing works
  - [ ] Test mode indicator displays (if in test mode)
  - [ ] Payment success redirects to success page
  - [ ] Payment failure shows error message
  - [ ] Payment intent created correctly
  - [ ] Payment confirmation works

#### PayPal Integration
- [ ] **PayPal Payment** (if enabled)
  - [ ] PayPal client ID loads correctly
  - [ ] PayPal button displays
  - [ ] PayPal sandbox mode indicator (if in sandbox)
  - [ ] PayPal payment flow works
  - [ ] Payment success redirects to success page
  - [ ] Payment failure shows error message
  - [ ] PayPal order creation works

### Orders
- [ ] **Order Creation**
  - [ ] Order is created after successful payment
  - [ ] Order details are saved correctly
  - [ ] Order number is generated
  - [ ] Order confirmation email sent (if implemented)
  - [ ] Order appears in user's order history

- [ ] **Order Success Page** (`/order-success`)
  - [ ] Page loads correctly
  - [ ] Order details display correctly
  - [ ] Order number displays
  - [ ] Tokens added message displays (if applicable)
  - [ ] Continue shopping button works

- [ ] **Order History**
  - [ ] Order list displays (if implemented)
  - [ ] Order details are accessible
  - [ ] Order status displays correctly
  - [ ] Order search works (if implemented)

### Tokens System
- [ ] **Token Management**
  - [ ] Tokens are added after purchase
  - [ ] Token balance displays correctly
  - [ ] Tokens are deducted when used (if applicable)
  - [ ] Token history displays (if implemented)

---

## Admin Features

### Admin Authentication
- [ ] **Admin Access**
  - [ ] Admin login works
  - [ ] Admin dashboard accessible
  - [ ] Regular users cannot access admin routes
  - [ ] Admin role is checked correctly

### Admin Templates
- [ ] **Template Management** (`/admin/templates`)
  - [ ] Admin templates page loads
  - [ ] Template list displays
  - [ ] Create template works
  - [ ] Edit template works
  - [ ] Delete template works
  - [ ] Template preview works
  - [ ] Template categories can be managed
  - [ ] Template search works

### Admin Users
- [ ] **User Management** (`/admin/users`)
  - [ ] Admin users page loads
  - [ ] User list displays
  - [ ] User search works
  - [ ] User details display
  - [ ] Edit user works
  - [ ] Delete user works
  - [ ] Make admin works
  - [ ] User statistics display

### Admin Products
- [ ] **Product Management** (`/admin/products`)
  - [ ] Admin products page loads
  - [ ] Product list displays
  - [ ] Create product works
  - [ ] Edit product works
  - [ ] Delete product works
  - [ ] Product images can be uploaded
  - [ ] Product categories can be managed
  - [ ] Product pricing can be set
  - [ ] Product stock management (if implemented)

### Admin Discount Codes
- [ ] **Discount Code Management** (`/admin/discounts`)
  - [ ] Admin discount codes page loads
  - [ ] Discount code list displays
  - [ ] Create discount code works
  - [ ] Edit discount code works
  - [ ] Delete discount code works
  - [ ] Discount code usage tracking works
  - [ ] Discount code expiration works

### Admin Analytics
- [ ] **Analytics Dashboard** (`/admin/analytics`)
  - [ ] Analytics page loads
  - [ ] User statistics display
  - [ ] Revenue statistics display
  - [ ] Product statistics display
  - [ ] Order statistics display
  - [ ] Charts/graphs display correctly (if implemented)
  - [ ] Date range filtering works (if implemented)
  - [ ] Export data works (if implemented)

### Admin Orders
- [ ] **Order Management**
  - [ ] Order list displays
  - [ ] Order details display
  - [ ] Order status can be updated
  - [ ] Order search works
  - [ ] Order filtering works
  - [ ] Order export works (if implemented)

---

## API Endpoints

### Authentication API
- [ ] `POST /api/register` - Register new user
  - **How to test:**
    ```bash
    curl -X POST http://localhost:3000/api/register \
      -H "Content-Type: application/json" \
      -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'
    ```
  - **Expected:** Returns user object or success message
  
- [ ] `POST /api/login` - Login user
  - **How to test:**
    ```bash
    curl -X POST http://localhost:3000/api/login \
      -H "Content-Type: application/json" \
      -c cookies.txt \
      -d '{"username":"testuser","password":"Test123!"}'
    ```
  - **Expected:** Returns success, session cookie set
  
- [ ] `POST /api/logout` - Logout user
  - **How to test:**
    ```bash
    curl -X POST http://localhost:3000/api/logout \
      -b cookies.txt \
      -c cookies.txt
    ```
  - **Expected:** Session cleared, returns success
  
- [ ] `GET /api/user` - Get current user
  - **How to test:**
    ```bash
    curl http://localhost:3000/api/user -b cookies.txt
    ```
  - **Expected:** Returns current user data
  
- [ ] `POST /api/forgot-password` - Request password reset
  - **How to test:**
    ```bash
    curl -X POST http://localhost:3000/api/forgot-password \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com"}'
    ```
  - **Expected:** Returns success message
  
- [ ] `POST /api/reset-password` - Reset password
  - **How to test:**
    ```bash
    curl -X POST http://localhost:3000/api/reset-password \
      -H "Content-Type: application/json" \
      -d '{"token":"reset-token","password":"NewPass123!"}'
    ```
  - **Expected:** Password reset successfully
  
- [ ] `POST /api/verify-email` - Verify email address
  - **How to test:**
    ```bash
    curl -X POST http://localhost:3000/api/verify-email \
      -H "Content-Type: application/json" \
      -d '{"token":"verification-token"}'
    ```
  - **Expected:** Email verified successfully

### Prompts API
- [ ] `POST /api/prompts/save` - Save a prompt
- [ ] `GET /api/prompts` - Get user's prompts
- [ ] `GET /api/prompts/:id` - Get specific prompt
- [ ] `DELETE /api/prompts/:id` - Delete prompt
- [ ] `POST /api/prompts/search` - Search prompts

### Templates API
- [ ] `GET /api/templates` - Get all templates
- [ ] `GET /api/templates/categories` - Get categories
- [ ] `GET /api/templates/category/:category` - Get templates by category
- [ ] `GET /api/templates/search?q=term` - Search templates
- [ ] `POST /api/templates/:id/save` - Save template
- [ ] `DELETE /api/templates/:id/save` - Unsave template
- [ ] `GET /api/templates/saved/my` - Get saved templates
- [ ] `POST /api/templates/share` - Create shared prompt
- [ ] `GET /api/templates/share/:token` - Get shared prompt

### Statistics API
- [ ] `POST /api/usage` - Track template usage
- [ ] `GET /api/stats` - Get user statistics
- [ ] `GET /api/stats/category` - Get category statistics
- [ ] `GET /api/stats/recent` - Get recent activity
- [ ] `GET /api/stats/templates` - Get most used templates

### Projects API
- [ ] `GET /api/projects` - Get user's projects
- [ ] `POST /api/projects` - Create project
- [ ] `GET /api/projects/:id` - Get project details
- [ ] `PUT /api/projects/:id` - Update project
- [ ] `DELETE /api/projects/:id` - Delete project

### Orders API
- [ ] `POST /api/orders` - Create order
- [ ] `GET /api/orders` - Get user's orders
- [ ] `GET /api/orders/:id` - Get order details
- [ ] `PUT /api/orders/:id` - Update order (admin)

### Products API
- [ ] `GET /api/products` - Get all products
- [ ] `GET /api/products/:id` - Get product details
- [ ] `POST /api/products` - Create product (admin)
- [ ] `PUT /api/products/:id` - Update product (admin)
- [ ] `DELETE /api/products/:id` - Delete product (admin)

### Analytics API
- [ ] `GET /api/analytics/overview` - Get analytics overview
- [ ] `GET /api/analytics/users` - Get user analytics
- [ ] `GET /api/analytics/revenue` - Get revenue analytics
- [ ] `GET /api/analytics/products` - Get product analytics

### Activity Log API
- [ ] `GET /api/activity` - Get activity logs
- [ ] `GET /api/activity/user/:userId` - Get user activity
- [ ] `GET /api/activity/recent` - Get recent activity

### Health Check API
- [ ] `GET /health` - Health check endpoint
  - **How to test:**
    ```bash
    curl http://localhost:3000/health
    # Test response time:
    curl -w "\nTime: %{time_total}s\n" -o /dev/null -s http://localhost:3000/health
    # Test from external:
    curl https://txrba-2025.3rdrockads.com/health
    ```
  - **Expected:** Returns JSON with status: "ok" or similar, response time < 100ms
  
- [ ] `GET /api/health` - API health check
  - **How to test:**
    ```bash
    curl http://localhost:3000/api/health
    ```
  - **Expected:** Returns API health status

### Configuration API
- [ ] `GET /api/config/stripe-publishable-key` - Get Stripe key
- [ ] `GET /api/config/stripe-test-mode` - Get Stripe test mode
- [ ] `GET /api/config/paypal-client-id` - Get PayPal client ID

### API Documentation
- [ ] **Swagger Documentation** (`/api-docs`)
  - [ ] Swagger UI loads correctly
  - [ ] All endpoints are documented
  - [ ] API documentation is accurate
  - [ ] Try it out functionality works
  - [ ] Response examples are correct

---

## Security Features

### Authentication Security
- [ ] Passwords are hashed (bcrypt)
  - **How to test:**
    ```bash
    # Check database - passwords should be hashed:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT id, username, password FROM users LIMIT 1;"
    # Password should be a long hash string, not plain text
    ```
  - **Expected:** Passwords in database are bcrypt hashes (start with $2a$ or $2b$)
  
- [ ] Passwords are never returned in API responses
  - **How to test:**
    ```bash
    # Login and check response:
    curl -X POST http://localhost:3000/api/login \
      -H "Content-Type: application/json" \
      -d '{"username":"test","password":"test"}' | jq .
    # Check /api/user endpoint:
    curl http://localhost:3000/api/user -b cookies.txt | jq .
    ```
  - **Expected:** No password field in any API response
  
- [ ] Session cookies are secure (httpOnly, secure in production)
  - **How to test:**
    ```bash
    # Check cookie headers:
    curl -I http://localhost:3000/api/login 2>&1 | grep -i set-cookie
    # In production with HTTPS, should see: HttpOnly; Secure; SameSite=Strict
    ```
  - **Expected:** Cookies have HttpOnly flag, Secure flag in production
  
- [ ] CSRF protection is active
  - **How to test:** (See detailed instructions in Authentication section above)
  
- [ ] Rate limiting prevents brute force attacks
  - **How to test:**
    ```bash
    # Try multiple failed login attempts:
    for i in {1..10}; do
      curl -X POST http://localhost:3000/api/login \
        -H "Content-Type: application/json" \
        -d '{"username":"test","password":"wrong"}' \
        -w "\nStatus: %{http_code}\n"
      sleep 1
    done
    # After 5 attempts, should get rate limit error (429)
    ```
  - **Expected:** After 5 failed attempts, returns 429 Too Many Requests
  
- [ ] Account lockout after failed attempts (if implemented)
  - **How to test:** Similar to rate limiting test above

### Authorization
- [ ] Protected routes require authentication
- [ ] Users can only access their own data
- [ ] Admin routes require admin role
- [ ] Unauthorized access returns 403/401
- [ ] API endpoints validate user permissions

### Input Validation
- [ ] All user inputs are validated
- [ ] SQL injection prevention (prepared statements)
- [ ] XSS prevention (input sanitization)
- [ ] File upload validation (if implemented)
- [ ] Email format validation
- [ ] URL validation (if implemented)

### Security Headers
- [ ] Helmet security headers are set
- [ ] Content Security Policy (CSP) is configured
- [ ] X-Frame-Options is set
- [ ] X-Content-Type-Options is set
- [ ] Referrer-Policy is set
- [ ] Permissions-Policy is set

### Data Protection
- [ ] Sensitive data is not logged
- [ ] Error messages don't expose sensitive information
- [ ] Database queries use parameterized statements
- [ ] Environment variables are not exposed
- [ ] API keys are not exposed in frontend

### Payment Security
- [ ] Payment data is not stored (PCI compliance)
- [ ] Stripe handles sensitive payment data
- [ ] PayPal handles sensitive payment data
- [ ] Payment webhooks are validated
- [ ] Payment amounts are validated server-side

---

## Performance & Reliability

### Server Performance

- [ ] Server starts within acceptable time (< 5 seconds)
  - **How to test:**
    ```bash
    # Time server startup:
    time pm2 restart ai-prompt-templates
    # OR if using systemd:
    time sudo systemctl restart ai-prompt-templates
    # Monitor startup logs:
    pm2 logs ai-prompt-templates --lines 20
    ```
  - **Expected:** Server is ready to accept requests within 5 seconds
  
- [ ] API response times are acceptable (< 500ms for most endpoints)
  - **How to test:**
    ```bash
    # Test individual endpoints with timing:
    curl -w "\nTime: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/templates
    curl -w "\nTime: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/stats
    curl -w "\nTime: %{time_total}s\n" -o /dev/null -s http://localhost:3000/health
    
    # Test multiple endpoints at once:
    for endpoint in "/health" "/api/templates" "/api/stats" "/api/products"; do
      echo "Testing $endpoint:"
      curl -w "Time: %{time_total}s\n" -o /dev/null -s "http://localhost:3000$endpoint"
    done
    
    # Use Apache Bench for load testing:
    ab -n 100 -c 10 http://localhost:3000/api/templates
    # OR use wrk (install: apt install wrk):
    wrk -t4 -c100 -d30s http://localhost:3000/api/templates
    ```
  - **Expected:** Most API endpoints respond in < 500ms, 95th percentile < 1s
  
- [ ] Database queries are optimized
  - **How to test:**
    ```bash
    # Enable SQLite query timing:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "PRAGMA timer = ON;"
    
    # Test query performance:
    time sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT * FROM users WHERE email = 'test@example.com';"
    time sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT * FROM saved_prompts WHERE user_id = 1;"
    
    # Check if indexes exist:
    sqlite3 /var/www/website-with-auth-secured/prompts.db ".indices users"
    sqlite3 /var/www/website-with-auth-secured/prompts.db ".indices saved_prompts"
    
    # Analyze query plans:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';"
    ```
  - **Expected:** Queries use indexes, response time < 50ms for simple queries
  
- [ ] No memory leaks during extended use
  - **How to test:**
    ```bash
    # Monitor memory usage over time:
    watch -n 5 'pm2 info ai-prompt-templates | grep memory'
    # OR using systemd:
    watch -n 5 'systemctl status ai-prompt-templates | grep Memory'
    
    # Check memory usage with ps:
    ps aux | grep node | awk '{print $2, $4, $6}'
    
    # Monitor for 30 minutes and check if memory grows continuously:
    for i in {1..12}; do
      pm2 info ai-prompt-templates | grep "memory\|heap"
      sleep 150  # 2.5 minutes
    done
    
    # Check for memory leaks using Node.js inspector (if available):
    node --inspect server.js
    # Then use Chrome DevTools to take heap snapshots
    ```
  - **Expected:** Memory usage stabilizes, no continuous growth over hours
  
- [ ] Server handles concurrent requests
  - **How to test:**
    ```bash
    # Install Apache Bench if not available:
    sudo apt install apache2-utils
    
    # Test concurrent requests:
    ab -n 1000 -c 50 http://localhost:3000/api/templates
    # -n: total requests
    # -c: concurrent requests
    
    # Test with wrk (more realistic):
    wrk -t12 -c400 -d30s http://localhost:3000/api/templates
    
    # Test multiple endpoints simultaneously:
    for i in {1..10}; do
      curl -s http://localhost:3000/api/templates > /dev/null &
    done
    wait
    
    # Monitor server during load test:
    pm2 monit
    # OR
    htop
    ```
  - **Expected:** Server handles 50+ concurrent requests without errors

### Database Performance

- [ ] Database queries are fast
  - **How to test:**
    ```bash
    # Test common queries:
    time sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT COUNT(*) FROM users;"
    time sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT * FROM saved_prompts ORDER BY created_at DESC LIMIT 10;"
    time sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT COUNT(*) FROM usage_stats WHERE user_id = 1;"
    
    # Test with EXPLAIN QUERY PLAN:
    sqlite3 /var/www/website-with-auth-secured/prompts.db <<EOF
    EXPLAIN QUERY PLAN SELECT * FROM saved_prompts WHERE user_id = 1;
    EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';
    EOF
    ```
  - **Expected:** Simple queries < 10ms, complex queries < 100ms
  
- [ ] Database indexes are created
  - **How to test:**
    ```bash
    # List all indexes:
    sqlite3 /var/www/website-with-auth-secured/prompts.db ".indices"
    
    # Check indexes for specific tables:
    sqlite3 /var/www/website-with-auth-secured/prompts.db ".indices users"
    sqlite3 /var/www/website-with-auth-secured/prompts.db ".indices saved_prompts"
    sqlite3 /var/www/website-with-auth-secured/prompts.db ".indices usage_stats"
    
    # View index details:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT name, sql FROM sqlite_master WHERE type='index';"
    
    # Verify indexes are being used:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "EXPLAIN QUERY PLAN SELECT * FROM saved_prompts WHERE user_id = 1;"
    # Should show "SEARCH TABLE saved_prompts USING INDEX..."
    ```
  - **Expected:** Indexes exist on foreign keys and frequently queried columns
  
- [ ] Database connection is stable
  - **How to test:**
    ```bash
    # Check database file integrity:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "PRAGMA integrity_check;"
    
    # Check database is not locked:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "BEGIN; SELECT 1; COMMIT;"
    
    # Monitor database file:
    watch -n 5 'ls -lh /var/www/website-with-auth-secured/prompts.db'
    
    # Check for database locks:
    lsof /var/www/website-with-auth-secured/prompts.db 2>/dev/null
    ```
  - **Expected:** No lock errors, integrity check passes
  
- [ ] Database transactions work correctly
  - **How to test:**
    ```bash
    # Test transaction rollback:
    sqlite3 /var/www/website-with-auth-secured/prompts.db <<EOF
    BEGIN;
    INSERT INTO users (username, email, password) VALUES ('test', 'test@test.com', 'hash');
    ROLLBACK;
    SELECT COUNT(*) FROM users WHERE username = 'test';
    EOF
    # Should return 0
    
    # Test transaction commit:
    sqlite3 /var/www/website-with-auth-secured/prompts.db <<EOF
    BEGIN;
    INSERT INTO users (username, email, password) VALUES ('test2', 'test2@test.com', 'hash');
    COMMIT;
    SELECT COUNT(*) FROM users WHERE username = 'test2';
    EOF
    # Should return 1
    ```
  - **Expected:** Transactions commit and rollback correctly
  
- [ ] Database backups work (if implemented)
  - **How to test:**
    ```bash
    # Manual backup:
    cp /var/www/website-with-auth-secured/prompts.db /var/backups/website-with-auth-secured/prompts-$(date +%Y%m%d-%H%M%S).db
    
    # Verify backup:
    sqlite3 /var/backups/website-with-auth-secured/prompts-*.db "SELECT COUNT(*) FROM users;"
    
    # Test restore:
    cp /var/backups/website-with-auth-secured/prompts-*.db /var/www/website-with-auth-secured/prompts.db.restore
    sqlite3 /var/www/website-with-auth-secured/prompts.db.restore "PRAGMA integrity_check;"
    
    # If using automated backup script:
    node /var/www/website-with-auth-secured/backup-database.js
    ls -lh /var/backups/website-with-auth-secured/
    ```
  - **Expected:** Backups are created, can be restored, data integrity maintained

### Error Handling

- [ ] Server errors are caught and handled
  - **How to test:**
    ```bash
    # Check error logs:
    pm2 logs ai-prompt-templates --err --lines 50
    # OR
    tail -n 50 /var/www/website-with-auth-secured/logs/error.log
    
    # Test error endpoint:
    curl http://localhost:3000/nonexistent-page
    # Should return 404, not crash server
    
    # Monitor for uncaught exceptions:
    pm2 logs ai-prompt-templates | grep -i "uncaught\|error\|exception"
    ```
  - **Expected:** Errors are logged, server continues running
  
- [ ] Error messages are user-friendly
  - **How to test:** Test various error scenarios in browser and verify messages are clear
  
- [ ] Error logs are created
  - **How to test:**
    ```bash
    # Check log directory:
    ls -lh /var/www/website-with-auth-secured/logs/
    
    # Check log files exist:
    ls -lh /var/www/website-with-auth-secured/logs/*.log
    
    # Check recent errors:
    tail -n 100 /var/www/website-with-auth-secured/logs/error.log
    tail -n 100 /var/www/website-with-auth-secured/logs/combined.log
    
    # Check log file sizes (should grow):
    du -h /var/www/website-with-auth-secured/logs/
    ```
  - **Expected:** Log files exist and contain error entries
  
- [ ] 404 errors display correctly
  - **How to test:**
    ```bash
    curl -I http://localhost:3000/nonexistent-page
    # Should return 404 status
    ```
  
- [ ] 500 errors don't expose sensitive information
  - **How to test:**
    ```bash
    # Trigger an error and check response:
    curl http://localhost:3000/api/test-error-endpoint
    # Response should not contain stack traces, file paths, or database details
    ```
  
- [ ] Database errors are handled gracefully
  - **How to test:**
    ```bash
    # Temporarily corrupt database (backup first!):
    # This is just for testing - restore backup after
    echo "test" >> /var/www/website-with-auth-secured/prompts.db
    # Try to access API:
    curl http://localhost:3000/api/user
    # Should return error message, not crash
    # Restore backup:
    cp /var/backups/website-with-auth-secured/prompts-backup.db /var/www/website-with-auth-secured/prompts.db
    ```
  
- [ ] Payment errors are handled gracefully
  - **How to test:** Test with invalid payment data in browser

### Logging

- [ ] Request logging works
  - **How to test:**
    ```bash
    # Make a request:
    curl http://localhost:3000/api/templates
    
    # Check logs:
    tail -n 20 /var/www/website-with-auth-secured/logs/combined.log
    # OR
    pm2 logs ai-prompt-templates --lines 20
    
    # Should see request logged with method, URL, status, response time
    ```
  - **Expected:** All requests are logged with timestamp, method, URL, status code
  
- [ ] Error logging works
  - **How to test:**
    ```bash
    # Trigger an error, then check:
    tail -n 50 /var/www/website-with-auth-secured/logs/error.log
    # Should see error entries
    ```
  
- [ ] Activity logging works
  - **How to test:**
    ```bash
    # Check activity logs in database:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;"
    ```
  
- [ ] Log files are created
  - **How to test:**
    ```bash
    ls -lh /var/www/website-with-auth-secured/logs/
    # Check file permissions:
    ls -l /var/www/website-with-auth-secured/logs/
    ```
  - **Expected:** Log files exist with appropriate permissions
  
- [ ] Log rotation works (if implemented)
  - **How to test:**
    ```bash
    # Check for rotated log files:
    ls -lh /var/www/website-with-auth-secured/logs/*.log.*
    
    # Check logrotate configuration:
    cat /etc/logrotate.d/ai-prompt-templates 2>/dev/null
    
    # Manually test rotation:
    sudo logrotate -d /etc/logrotate.d/ai-prompt-templates
    ```
  
- [ ] Log levels are appropriate
  - **How to test:** Check logs don't contain sensitive data (passwords, tokens, etc.)

### Graceful Shutdown

- [ ] Server shuts down gracefully
  - **How to test:**
    ```bash
    # Test PM2 graceful shutdown:
    pm2 stop ai-prompt-templates
    # Check it stops without errors:
    pm2 logs ai-prompt-templates --lines 20
    
    # Test systemd graceful shutdown:
    sudo systemctl stop ai-prompt-templates
    sudo systemctl status ai-prompt-templates
    
    # Test with active requests (in another terminal):
    while true; do curl -s http://localhost:3000/api/templates > /dev/null; done &
    # Then stop server and verify active requests complete
    ```
  - **Expected:** Server stops cleanly, no force kills needed
  
- [ ] Database connections are closed
  - **How to test:**
    ```bash
    # Check for open database connections:
    lsof /var/www/website-with-auth-secured/prompts.db
    # Stop server:
    pm2 stop ai-prompt-templates
    # Check again:
    lsof /var/www/website-with-auth-secured/prompts.db
    # Should show no connections
    ```
  
- [ ] Active requests are completed
  - **How to test:** Start long-running request, then stop server - request should complete
  
- [ ] No data loss on shutdown
  - **How to test:**
    ```bash
    # Before shutdown, note data:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT COUNT(*) FROM users;"
    # Stop server:
    pm2 stop ai-prompt-templates
    # Restart:
    pm2 start ai-prompt-templates
    # Check data again:
    sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT COUNT(*) FROM users;"
    # Should be the same
    ```

---

## UI/UX Testing

### Navigation
- [ ] Navigation menu works on all pages
- [ ] All links are functional
- [ ] Active page is highlighted
- [ ] Breadcrumbs work (if implemented)
- [ ] Back button works correctly

### Forms
- [ ] All form fields are accessible
- [ ] Form labels are clear
- [ ] Form validation messages are clear
- [ ] Required fields are marked
- [ ] Form submission feedback is clear
- [ ] Form errors are displayed correctly
- [ ] Form success messages are displayed

### Buttons & Actions
- [ ] All buttons are clickable
- [ ] Button states are clear (hover, active, disabled)
- [ ] Loading states are displayed
- [ ] Action confirmations work (if implemented)
- [ ] Cancel buttons work

### Feedback & Messages
- [ ] Success messages display correctly
- [ ] Error messages display correctly
- [ ] Warning messages display correctly
- [ ] Info messages display correctly
- [ ] Messages auto-dismiss (if implemented)
- [ ] Toast notifications work (if implemented)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Alt text for images (if applicable)
- [ ] ARIA labels are used (if applicable)
- [ ] Color contrast is sufficient
- [ ] Screen reader compatibility (basic)

---

## Cross-Browser Testing

Test on the following browsers:
- [ ] **Chrome** (latest version)
- [ ] **Firefox** (latest version)
- [ ] **Safari** (latest version)
- [ ] **Edge** (latest version)
- [ ] **Mobile browsers** (Chrome Mobile, Safari Mobile)

For each browser, verify:
- [ ] Pages load correctly
- [ ] Forms work correctly
- [ ] JavaScript functions work
- [ ] CSS styling is correct
- [ ] No console errors
- [ ] Payment processing works

---

## Mobile Responsiveness

### Mobile Devices
- [ ] **Small screens** (320px - 480px)
  - [ ] Layout adapts correctly
  - [ ] Navigation menu works (hamburger menu)
  - [ ] Forms are usable
  - [ ] Buttons are tappable
  - [ ] Text is readable

- [ ] **Tablets** (481px - 768px)
  - [ ] Layout adapts correctly
  - [ ] Navigation works
  - [ ] Forms are usable
  - [ ] Content is readable

- [ ] **Large screens** (769px+)
  - [ ] Layout uses available space
  - [ ] Content is not too wide
  - [ ] Navigation is accessible

### Touch Interactions
- [ ] Touch targets are large enough (min 44x44px)
- [ ] Swipe gestures work (if implemented)
- [ ] Pinch to zoom works
- [ ] Scroll works smoothly

---

## Error Handling

### User-Facing Errors
- [ ] **404 Not Found**
  - [ ] Custom 404 page displays
  - [ ] 404 page has navigation back to site

- [ ] **500 Server Error**
  - [ ] User-friendly error message
  - [ ] Error is logged
  - [ ] No sensitive information exposed

- [ ] **Network Errors**
  - [ ] Offline message displays
  - [ ] Retry functionality works (if implemented)

- [ ] **Form Errors**
  - [ ] Validation errors display inline
  - [ ] Error messages are clear
  - [ ] Errors persist until fixed

### API Errors
- [ ] **400 Bad Request**
  - [ ] Error message explains the issue
  - [ ] Validation errors are detailed

- [ ] **401 Unauthorized**
  - [ ] User is redirected to login
  - [ ] Error message is clear

- [ ] **403 Forbidden**
  - [ ] Error message explains permission issue
  - [ ] User is redirected appropriately

- [ ] **404 Not Found**
  - [ ] Error message indicates resource not found
  - [ ] Appropriate status code returned

- [ ] **500 Internal Server Error**
  - [ ] Error is logged
  - [ ] User receives generic error message
  - [ ] No sensitive information exposed

---

## Additional Testing Scenarios

### Edge Cases
- [ ] Very long usernames/emails
- [ ] Special characters in inputs
- [ ] Empty strings
- [ ] Null/undefined values
- [ ] Very large numbers
- [ ] Negative numbers (where not applicable)
- [ ] Concurrent form submissions
- [ ] Rapid button clicks
- [ ] Browser back/forward buttons
- [ ] Page refresh during operations

### Data Integrity
- [ ] Data persists after page refresh
- [ ] Data persists after logout/login
- [ ] Data is not corrupted
- [ ] Foreign key constraints work
- [ ] Unique constraints work
- [ ] Data validation prevents invalid data

### Integration Testing
- [ ] Email service works (if implemented)
- [ ] Stripe webhooks work (if implemented)
- [ ] PayPal webhooks work (if implemented)
- [ ] Third-party API integrations work
- [ ] Database migrations work

---

## Testing Notes

### Test Environment
- **URL:** _________________________
- **Database:** _________________________
- **Test Date:** _________________________
- **Tester:** _________________________

### Known Issues
1. _________________________
2. _________________________
3. _________________________

### Recommendations
1. _________________________
2. _________________________
3. _________________________

### Sign-off
- [ ] All critical features tested
- [ ] All major bugs fixed
- [ ] Ready for production deployment

**Tester Signature:** _________________________  
**Date:** _________________________  
**Approved by:** _________________________  
**Date:** _________________________

---

## Linux Performance Testing Commands

This section provides ready-to-use Linux commands for performance testing on your production server.

### Server Status & Monitoring

```bash
# Check if server is running (PM2):
pm2 status
pm2 list
pm2 info ai-prompt-templates

# Check if server is running (systemd):
sudo systemctl status ai-prompt-templates

# Check server process:
ps aux | grep node
ps aux | grep "server.js"

# Check port is listening:
netstat -tlnp | grep :3000
# OR
ss -tlnp | grep :3000
lsof -i :3000

# Check server uptime:
pm2 describe ai-prompt-templates | grep "uptime"
# OR
ps -p $(pgrep -f "server.js") -o etime
```

### Resource Usage Monitoring

```bash
# Real-time CPU and Memory usage (PM2):
pm2 monit

# Real-time system resources:
htop
# OR
top

# Memory usage:
free -h
pm2 info ai-prompt-templates | grep memory

# CPU usage:
mpstat 1 5  # 5 samples, 1 second apart
top -bn1 | grep "Cpu(s)"

# Disk usage:
df -h
du -sh /var/www/website-with-auth-secured/*
du -sh /var/www/website-with-auth-secured/logs/

# Network connections:
netstat -an | grep :3000 | wc -l  # Count connections
ss -s  # Summary of socket statistics
```

### API Performance Testing

```bash
# Install testing tools (if not installed):
sudo apt update
sudo apt install -y apache2-utils curl wget

# Simple response time test:
curl -w "\nTime: %{time_total}s\nStatus: %{http_code}\n" \
  -o /dev/null -s http://localhost:3000/health

# Test multiple endpoints:
for endpoint in "/health" "/api/templates" "/api/stats" "/api/products"; do
  echo "Testing: $endpoint"
  curl -w "  Time: %{time_total}s, Status: %{http_code}\n" \
    -o /dev/null -s "http://localhost:3000$endpoint"
done

# Load testing with Apache Bench:
# -n: total requests, -c: concurrent requests
ab -n 1000 -c 50 http://localhost:3000/api/templates
ab -n 5000 -c 100 http://localhost:3000/health

# Load testing with wrk (install: sudo apt install wrk):
wrk -t12 -c400 -d30s http://localhost:3000/api/templates
# -t: threads, -c: connections, -d: duration

# Continuous monitoring during load test:
watch -n 1 'pm2 info ai-prompt-templates | grep -E "memory|cpu|uptime"'
```

### Database Performance Testing

```bash
# Database file size:
ls -lh /var/www/website-with-auth-secured/prompts.db

# Database integrity check:
sqlite3 /var/www/website-with-auth-secured/prompts.db "PRAGMA integrity_check;"

# Check database statistics:
sqlite3 /var/www/website-with-auth-secured/prompts.db <<EOF
SELECT 
  name,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as table_exists
FROM sqlite_master m WHERE type='table';
EOF

# Count records in tables:
sqlite3 /var/www/website-with-auth-secured/prompts.db <<EOF
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'saved_prompts', COUNT(*) FROM saved_prompts
UNION ALL
SELECT 'usage_stats', COUNT(*) FROM usage_stats;
EOF

# Check indexes:
sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT name, sql FROM sqlite_master WHERE type='index';"

# Test query performance:
time sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT * FROM users LIMIT 100;"
time sqlite3 /var/www/website-with-auth-secured/prompts.db "SELECT * FROM saved_prompts WHERE user_id = 1;"

# Analyze query plans:
sqlite3 /var/www/website-with-auth-secured/prompts.db <<EOF
EXPLAIN QUERY PLAN SELECT * FROM saved_prompts WHERE user_id = 1;
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';
EOF

# Database optimization:
sqlite3 /var/www/website-with-auth-secured/prompts.db "VACUUM;"
sqlite3 /var/www/website-with-auth-secured/prompts.db "ANALYZE;"
```

### Log Analysis

```bash
# View recent logs (PM2):
pm2 logs ai-prompt-templates --lines 100
pm2 logs ai-prompt-templates --err --lines 50

# View recent logs (systemd):
sudo journalctl -u ai-prompt-templates -n 100
sudo journalctl -u ai-prompt-templates --since "1 hour ago"

# View log files:
tail -n 100 /var/www/website-with-auth-secured/logs/combined.log
tail -n 100 /var/www/website-with-auth-secured/logs/error.log
tail -f /var/www/website-with-auth-secured/logs/combined.log  # Follow logs in real-time

# Search logs for errors:
grep -i "error" /var/www/website-with-auth-secured/logs/*.log | tail -n 50
grep -i "exception" /var/www/website-with-auth-secured/logs/*.log | tail -n 50

# Count errors in last hour:
grep -i "error" /var/www/website-with-auth-secured/logs/combined.log | \
  awk -v d="$(date -d '1 hour ago' '+%Y-%m-%d %H')" '$0 > d' | wc -l

# Check log file sizes:
ls -lh /var/www/website-with-auth-secured/logs/
du -sh /var/www/website-with-auth-secured/logs/*

# Find largest log entries:
awk '{print length, $0}' /var/www/website-with-auth-secured/logs/combined.log | \
  sort -rn | head -n 20
```

### Network & Connectivity Testing

```bash
# Test local connectivity:
curl -I http://localhost:3000/health

# Test external connectivity:
curl -I https://txrba-2025.3rdrockads.com/health

# Test with timeout:
curl --max-time 5 http://localhost:3000/health

# Check DNS resolution:
nslookup txrba-2025.3rdrockads.com
dig txrba-2025.3rdrockads.com

# Test SSL/TLS (if using HTTPS):
openssl s_client -connect txrba-2025.3rdrockads.com:443 -servername txrba-2025.3rdrockads.com

# Monitor network traffic:
sudo tcpdump -i any port 3000 -n
# OR
sudo netstat -i  # Network interface statistics
```

### Process Management

```bash
# PM2 Commands:
pm2 start server.js --name "ai-prompt-templates"
pm2 restart ai-prompt-templates
pm2 stop ai-prompt-templates
pm2 delete ai-prompt-templates
pm2 reload ai-prompt-templates  # Zero-downtime reload
pm2 save  # Save process list
pm2 startup  # Generate startup script

# Systemd Commands:
sudo systemctl start ai-prompt-templates
sudo systemctl stop ai-prompt-templates
sudo systemctl restart ai-prompt-templates
sudo systemctl status ai-prompt-templates
sudo systemctl enable ai-prompt-templates  # Enable on boot
sudo systemctl disable ai-prompt-templates

# Kill process if needed:
pkill -f "server.js"
# OR find and kill:
ps aux | grep "server.js" | grep -v grep | awk '{print $2}' | xargs kill
```

### Backup & Restore

```bash
# Backup database:
cp /var/www/website-with-auth-secured/prompts.db /var/backups/website-with-auth-secured/prompts-$(date +%Y%m%d-%H%M%S).db

# Backup with compression:
tar -czf /var/backups/website-with-auth-secured/app-backup-$(date +%Y%m%d).tar.gz \
  /var/www/website-with-auth-secured/prompts.db \
  /var/www/website-with-auth-secured/.env

# List backups:
ls -lh /var/backups/website-with-auth-secured/

# Restore database:
cp /var/backups/website-with-auth-secured/prompts-YYYYMMDD-HHMMSS.db /var/www/website-with-auth-secured/prompts.db

# Verify backup:
sqlite3 /var/backups/website-with-auth-secured/prompts-*.db "PRAGMA integrity_check;"
```

### System Health Check Script

Create a comprehensive health check script:

```bash
#!/bin/bash
# Save as: /var/www/website-with-auth-secured/health-check.sh

echo "=== Server Health Check ==="
echo "Date: $(date)"
echo ""

echo "=== Process Status ==="
pm2 status ai-prompt-templates || systemctl status ai-prompt-templates --no-pager

echo ""
echo "=== Resource Usage ==="
echo "Memory:"
free -h | grep -E "Mem|Swap"
echo ""
echo "Disk:"
df -h | grep -E "/$|/var/www/website-with-auth-secured"
echo ""
echo "CPU Load:"
uptime

echo ""
echo "=== Database Status ==="
if [ -f "/var/www/website-with-auth-secured/prompts.db" ]; then
  echo "Database exists: $(ls -lh /var/www/website-with-auth-secured/prompts.db | awk '{print $5}')"
  sqlite3 /var/www/website-with-auth-secured/prompts.db "PRAGMA integrity_check;" | head -n 1
else
  echo "Database file not found!"
fi

echo ""
echo "=== Network Status ==="
netstat -tlnp | grep :3000 || echo "Port 3000 not listening"

echo ""
echo "=== Recent Errors ==="
tail -n 5 /var/www/website-with-auth-secured/logs/error.log 2>/dev/null || echo "No error log found"

echo ""
echo "=== Health Check Complete ==="
```

Make it executable:
```bash
chmod +x /var/www/website-with-auth-secured/health-check.sh
./health-check.sh
```

### Automated Performance Monitoring

```bash
# Create a monitoring script that runs every 5 minutes:
# Save as: /var/www/website-with-auth-secured/monitor.sh

#!/bin/bash
LOG_FILE="/var/www/website-with-auth-secured/logs/performance.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Get memory usage
MEMORY=$(pm2 info ai-prompt-templates 2>/dev/null | grep "memory" | awk '{print $4}' || echo "N/A")

# Get CPU usage
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

# Get response time
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3000/health 2>/dev/null || echo "N/A")

# Log to file
echo "$TIMESTAMP | Memory: $MEMORY | CPU: $CPU% | Response: ${RESPONSE_TIME}s" >> $LOG_FILE

# Add to crontab to run every 5 minutes:
# */5 * * * * /var/www/website-with-auth-secured/monitor.sh
```

---

## Quick Test Checklist (Priority Features)

For quick verification, test these critical features first:

1. [ ] User registration
2. [ ] User login
3. [ ] User logout
4. [ ] Dashboard loads
5. [ ] Templates page loads
6. [ ] Generate prompt works
7. [ ] Save prompt works
8. [ ] View saved prompts
9. [ ] Delete prompt works
10. [ ] Add product to cart
11. [ ] Checkout process
12. [ ] Payment processing (Stripe)
13. [ ] Order creation
14. [ ] Admin login
15. [ ] Admin dashboard

---

**End of QA Verification Checklist**

