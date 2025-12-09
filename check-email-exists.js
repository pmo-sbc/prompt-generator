/**
 * Check if email exists in database
 * Checks both users and pending_users tables
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function checkEmailExists(email) {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log(`\nChecking for email: ${email}\n`);
    console.log('='.repeat(60));

    // Check in users table
    console.log('\n📧 Checking in USERS table...');
    const usersResult = await pool.query(
      'SELECT id, username, email, email_verified, is_admin, created_at FROM users WHERE email = $1',
      [email]
    );

    if (usersResult.rows.length > 0) {
      console.log('✅ Found in USERS table:');
      usersResult.rows.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Verified: ${user.email_verified}`);
        console.log(`   Admin: ${user.is_admin}`);
        console.log(`   Created: ${user.created_at}`);
      });
    } else {
      console.log('❌ Not found in USERS table');
    }

    // Check in pending_users table
    console.log('\n📧 Checking in PENDING_USERS table...');
    const pendingResult = await pool.query(
      'SELECT id, username, email, status, created_at, reviewed_at, review_notes FROM pending_users WHERE email = $1',
      [email]
    );

    if (pendingResult.rows.length > 0) {
      console.log('✅ Found in PENDING_USERS table:');
      pendingResult.rows.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Reviewed: ${user.reviewed_at || 'Not reviewed'}`);
        console.log(`   Notes: ${user.review_notes || 'None'}`);
      });
    } else {
      console.log('❌ Not found in PENDING_USERS table');
    }

    console.log('\n' + '='.repeat(60));
    
    // Summary
    const totalFound = usersResult.rows.length + pendingResult.rows.length;
    if (totalFound === 0) {
      console.log('\n✅ Email does NOT exist in either table - registration should proceed');
    } else {
      console.log(`\n⚠️  Email exists in ${totalFound} record(s) - registration will be blocked`);
    }

  } catch (error) {
    console.error('\n❌ Error checking email:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'diegoriveramontano@gmail.com';
checkEmailExists(email);

