/**
 * Check for user diego6 in both tables
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function checkUser() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log('\nChecking for username: diego6\n');
    console.log('='.repeat(60));

    // Check in users table
    const usersResult = await pool.query(
      'SELECT id, username, email, email_verified, is_admin, created_at FROM users WHERE username = $1 OR email = $2',
      ['diego6', 'diegoriveramontano@gmail.com']
    );

    console.log('\n📧 USERS table:');
    if (usersResult.rows.length > 0) {
      usersResult.rows.forEach(user => {
        console.log(JSON.stringify(user, null, 2));
      });
    } else {
      console.log('❌ Not found');
    }

    // Check in pending_users table
    const pendingResult = await pool.query(
      'SELECT * FROM pending_users WHERE username = $1 OR email = $2',
      ['diego6', 'diegoriveramontano@gmail.com']
    );

    console.log('\n📧 PENDING_USERS table:');
    if (pendingResult.rows.length > 0) {
      pendingResult.rows.forEach(user => {
        console.log(JSON.stringify(user, null, 2));
      });
    } else {
      console.log('❌ Not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUser();

