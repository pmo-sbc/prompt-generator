/**
 * Session Secret Generator
 * Generates a cryptographically secure random string for SESSION_SECRET
 */

const crypto = require('crypto');

console.log('\n🔐 Session Secret Generator\n');
console.log('=========================================\n');

// Generate different lengths of secrets
const secrets = {
  recommended: crypto.randomBytes(64).toString('hex'), // 128 characters (most secure)
  standard: crypto.randomBytes(32).toString('hex'),    // 64 characters (good)
  minimum: crypto.randomBytes(16).toString('hex')      // 32 characters (acceptable)
};

console.log('📋 Generated Session Secrets:\n');

console.log('✅ RECOMMENDED (128 characters):');
console.log(`SESSION_SECRET=${secrets.recommended}\n`);

console.log('✅ STANDARD (64 characters):');
console.log(`SESSION_SECRET=${secrets.standard}\n`);

console.log('⚠️  MINIMUM (32 characters):');
console.log(`SESSION_SECRET=${secrets.minimum}\n`);

console.log('=========================================\n');
console.log('📝 How to Use:\n');
console.log('1. Copy one of the secrets above (recommended is best)');
console.log('2. Add it to your .env file on the production server');
console.log('3. Restart your application\n');

console.log('Example .env entry:');
console.log(`SESSION_SECRET=${secrets.recommended}\n`);

console.log('⚠️  IMPORTANT SECURITY NOTES:\n');
console.log('• Keep this secret PRIVATE - never commit to git');
console.log('• Use different secrets for dev and production');
console.log('• Changing the secret will invalidate all existing sessions');
console.log('• Store securely - treat like a password\n');

console.log('🔄 Quick Setup Commands:\n');
console.log('# Option 1: Add to .env file');
console.log(`echo 'SESSION_SECRET=${secrets.recommended}' >> .env\n`);

console.log('# Option 2: Use environment variable directly');
console.log(`export SESSION_SECRET="${secrets.recommended}"\n`);

console.log('# Option 3: One-liner to generate and add to .env');
console.log(`echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env\n`);

console.log('=========================================\n');

// Also generate a CSRF secret if needed
const csrfSecret = crypto.randomBytes(32).toString('hex');
console.log('🔐 Bonus: CSRF Secret (if needed):\n');
console.log(`CSRF_SECRET=${csrfSecret}\n`);

console.log('=========================================\n');
