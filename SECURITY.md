# Security Documentation

## Overview

This document outlines all the security measures implemented in the AI Prompt Templates application to protect user data and prevent common web vulnerabilities.

---

## Critical Security Features Implemented

### 1. **Session Secret Enforcement**

**What it does:** Prevents the server from starting with default/weak session secrets.

**Implementation:**
- Server checks for `SESSION_SECRET` in environment variables at startup
- Fails immediately if using default value or if not set
- Requires a strong, randomly generated secret

**How to set:**
```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
SESSION_SECRET=your_generated_secret_here
```

**Risk if not implemented:** Session hijacking, unauthorized access to accounts

---

### 2. **Rate Limiting**

**What it does:** Prevents brute force attacks and API abuse.

**Implementation:**
- **General API Rate Limiter:** 100 requests per 15 minutes per IP
- **Authentication Rate Limiter:** 5 login/register attempts per 15 minutes per IP
- Automatic IP-based tracking
- Customizable time windows and limits

**Protected endpoints:**
- All `/api/*` endpoints (general limiter)
- `/api/login` and `/api/register` (strict limiter)

**Risk if not implemented:** Brute force password attacks, account enumeration, DoS attacks

---

### 3. **CSRF Protection**

**What it does:** Prevents Cross-Site Request Forgery attacks where malicious sites trick users into performing unwanted actions.

**Implementation:**
- CSRF tokens generated for each session
- Tokens required for all state-changing operations (POST, PUT, DELETE)
- Tokens stored in cookies and validated on server
- Frontend helper automatically includes tokens

**Protected endpoints:**
- All POST, PUT, DELETE, PATCH requests to `/api/*`

**How it works:**
1. Server generates CSRF token when user visits login/signup page
2. Token sent to client in `XSRF-TOKEN` cookie
3. Client includes token in `X-CSRF-Token` header for all requests
4. Server validates token matches session

**Risk if not implemented:** Unauthorized actions performed on behalf of logged-in users

---

### 4. **Input Validation & Sanitization**

**What it does:** Prevents injection attacks and ensures data integrity.

**Implementation:**
- Server-side validation using `express-validator`
- Input sanitization (escaping, trimming, normalizing)
- Type checking and length restrictions
- Email format validation
- Password strength requirements

**Validation rules:**

**Registration:**
- Username: 3-30 characters, alphanumeric only
- Email: Valid email format, max 100 characters
- Password: Min 8 characters, must contain uppercase, lowercase, and number

**Login:**
- Username/Email: Required, non-empty
- Password: Required

**Prompts:**
- Template name: Required, sanitized
- Category: Required, sanitized
- Prompt text: Max 10,000 characters

**Risk if not implemented:** SQL injection, XSS attacks, data corruption

---

### 5. **Helmet.js Security Headers**

**What it does:** Sets secure HTTP headers to protect against various attacks.

**Headers set:**
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Strict-Transport-Security` - Enforces HTTPS (production)
- `Content-Security-Policy` - Restricts resource loading

**Risk if not implemented:** XSS, clickjacking, MIME sniffing attacks

---

### 6. **Secure Session Management**

**What it does:** Protects user sessions from hijacking and unauthorized access.

**Implementation:**
- `httpOnly: true` - Prevents JavaScript access to session cookie
- `secure: true` (production) - Requires HTTPS for cookie transmission
- `sameSite: 'strict'` - Prevents CSRF attacks
- Custom session cookie name (not default)
- 24-hour session expiration

**Risk if not implemented:** Session hijacking, XSS-based session theft

---

### 7. **Environment-Based Security**

**What it does:** Applies stricter security in production environments.

**Production features:**
- Secure cookies (HTTPS only)
- HSTS headers
- Stricter CSP policies

**Configuration:**
```bash
NODE_ENV=production npm start
```

**Risk if not implemented:** Security features not enforced in production

---

## Password Security

### Hashing
- Algorithm: **bcrypt**
- Cost factor: **10 rounds** (2^10 iterations)
- Automatic salting

### Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Recommendations for users:
- Use 12+ characters
- Include special characters
- Use password manager
- Never reuse passwords

---

## Database Security

### SQL Injection Prevention
- **Prepared statements** for all queries
- Parameter binding instead of string concatenation
- No dynamic SQL construction

### Example (SAFE):
```javascript
db.prepare('SELECT * FROM users WHERE username = ?').get(username);
```

### Example (UNSAFE - NOT USED):
```javascript
db.prepare(`SELECT * FROM users WHERE username = '${username}'`).get();
```

---

## API Security Summary

| Endpoint | Rate Limit | CSRF | Validation | Auth Required |
|----------|-----------|------|------------|---------------|
| POST /api/register | 5/15min | ✅ | ✅ | ❌ |
| POST /api/login | 5/15min | ✅ | ✅ | ❌ |
| POST /api/logout | 100/15min | ✅ | ❌ | ❌ |
| GET /api/user | 100/15min | ❌ | ❌ | ✅ |
| POST /api/prompts/save | 100/15min | ✅ | ✅ | ✅ |
| GET /api/prompts | 100/15min | ❌ | ❌ | ✅ |
| DELETE /api/prompts/:id | 100/15min | ✅ | ❌ | ✅ |
| POST /api/usage | 100/15min | ✅ | ✅ | ✅ |
| GET /api/stats | 100/15min | ❌ | ❌ | ✅ |

---

## Security Checklist for Deployment

### Before Production:

- [x] Set strong SESSION_SECRET (not default)
- [x] Set NODE_ENV=production
- [x] Enable HTTPS
- [x] Set secure: true for cookies
- [x] Configure helmet CSP for your domain
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Implement intrusion detection
- [ ] Set up automated security scanning
- [ ] Review and adjust rate limits
- [ ] Test CSRF protection
- [ ] Perform security audit

### Regular Maintenance:

- [ ] Update dependencies monthly
- [ ] Run `npm audit` weekly
- [ ] Monitor failed login attempts
- [ ] Review server logs daily
- [ ] Backup database daily
- [ ] Test recovery procedures
- [ ] Update security headers
- [ ] Rotate session secrets periodically

---

## Known Limitations

1. **SQLite scalability**: Consider PostgreSQL for high-traffic production
2. **No email verification**: Users can register without confirming email
3. **No password reset**: No mechanism for forgotten passwords
4. **No account lockout**: After rate limit expires, attempts can continue
5. **No 2FA**: Single-factor authentication only
6. **No API versioning**: Breaking changes affect all clients
7. **No audit logging**: User actions not logged for forensics

---

## Recommended Future Enhancements

### High Priority:
1. Add email verification for new accounts
2. Implement password reset via email
3. Add account lockout after repeated failures
4. Implement comprehensive audit logging
5. Add honeypot fields to forms
6. Implement CAPTCHA for registration/login

### Medium Priority:
1. Add two-factor authentication (2FA/TOTP)
2. Implement OAuth login (Google, GitHub)
3. Add API versioning
4. Migrate to PostgreSQL for production
5. Add IP whitelist/blacklist functionality
6. Implement session device tracking

### Low Priority:
1. Add security headers testing
2. Implement automated penetration testing
3. Add security event notifications
4. Implement geolocation-based access control
5. Add biometric authentication support

---

## Security Incident Response

### If you suspect a security breach:

1. **Immediately:**
   - Take the server offline if actively being exploited
   - Change all secrets (SESSION_SECRET, database passwords)
   - Invalidate all active sessions

2. **Investigation:**
   - Check server logs for suspicious activity
   - Review database for unauthorized changes
   - Identify attack vector

3. **Remediation:**
   - Patch vulnerability
   - Reset affected user passwords
   - Notify affected users
   - Update security measures

4. **Post-incident:**
   - Document the incident
   - Review and improve security measures
   - Conduct security training
   - Implement additional monitoring

---

## Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Express Security Best Practices**: https://expressjs.com/en/advanced/best-practice-security.html
- **Node.js Security Checklist**: https://blog.risingstack.com/node-js-security-checklist/
- **Helmet.js Documentation**: https://helmetjs.github.io/

---

## Contact

For security concerns or to report vulnerabilities, please contact the development team immediately.

**Last Updated:** October 2025
**Version:** 2.0 (Security Hardened)
