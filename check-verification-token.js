/**
 * Diagnostic script to check verification token status
 * Usage: node check-verification-token.js <token>
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

const token = process.argv[2];

if (!token) {
  console.error('Usage: node check-verification-token.js <token>');
  process.exit(1);
}

(async () => {
  try {
    console.log('Checking verification token...\n');
    console.log(`Token (first 8 chars): ${token.substring(0, 8)}...\n`);
    
    // Check if token exists
    const tokenCheck = await pool.query(
      `SELECT id, username, email, verification_token, verification_token_expires, email_verified, created_at
       FROM users
       WHERE verification_token = $1`,
      [token]
    );
    
    if (tokenCheck.rows.length === 0) {
      console.log('❌ Token NOT FOUND in database');
      console.log('\nPossible reasons:');
      console.log('  - Token was never saved');
      console.log('  - Token was already used and cleared');
      console.log('  - Token is incorrect/typo');
      process.exit(1);
    }
    
    const user = tokenCheck.rows[0];
    console.log('✓ Token found in database\n');
    console.log('User Information:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Email Verified: ${user.email_verified}`);
    console.log(`  Created At: ${user.created_at}\n`);
    
    // Check expiration
    if (!user.verification_token_expires) {
      console.log('❌ Token has NO expiration date');
      console.log('  This is a problem - token should have an expiration date');
      process.exit(1);
    }
    
    const expiresAt = new Date(user.verification_token_expires);
    const now = new Date();
    const isExpired = expiresAt <= now;
    
    console.log('Expiration Status:');
    console.log(`  Expires At: ${expiresAt.toISOString()}`);
    console.log(`  Current Time: ${now.toISOString()}`);
    console.log(`  Time Difference: ${Math.round((expiresAt - now) / 1000 / 60)} minutes`);
    console.log(`  Status: ${isExpired ? '❌ EXPIRED' : '✓ Valid'}\n`);
    
    if (isExpired) {
      console.log('Token has expired. User needs to request a new verification email.');
      process.exit(1);
    }
    
    // Check if already verified
    if (user.email_verified) {
      console.log('⚠️  User email is already verified');
      console.log('  Token is valid but user is already verified');
      process.exit(1);
    }
    
    // Check with SQL query (same as findByVerificationToken)
    const validCheck = await pool.query(
      `SELECT * FROM users
       WHERE verification_token = $1
       AND verification_token_expires IS NOT NULL
       AND verification_token_expires > NOW()`,
      [token]
    );
    
    if (validCheck.rows.length === 0) {
      console.log('❌ Token does NOT pass SQL validation query');
      console.log('  This means the SQL query in findByVerificationToken would return null');
      console.log('  Even though token exists, it fails the expiration check');
    } else {
      console.log('✓ Token passes SQL validation query');
      console.log('  Token should work for verification\n');
    }
    
    console.log('\n✅ Token is valid and ready for verification!');
    
  } catch (error) {
    console.error('\n❌ Error checking token:');
    console.error(`   ${error.message}`);
    console.error(`   ${error.stack}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

