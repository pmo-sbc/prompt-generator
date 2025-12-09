/**
 * Check if a user should see the approve users menu
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function checkMenuVisibility(identifier) {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log(`\nChecking menu visibility for: ${identifier}\n`);
    console.log('='.repeat(60));

    // Get user from database
    const result = await pool.query(
      `SELECT id, username, email, is_admin, is_manager
       FROM users 
       WHERE username = $1 OR email = $1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    
    // Simulate what the session status endpoint returns
    const sessionResponse = {
      authenticated: true,
      userId: user.id,
      username: user.username,
      is_admin: user.is_admin || false,
      is_manager: user.is_manager || false
    };

    console.log('Database values:');
    console.log(`  is_admin: ${user.is_admin} (type: ${typeof user.is_admin})`);
    console.log(`  is_manager: ${user.is_manager} (type: ${typeof user.is_manager})`);

    console.log('\nSession Status API would return:');
    console.log(JSON.stringify(sessionResponse, null, 2));

    console.log('\nFrontend Menu Visibility Check:');
    const shouldShowMenu = sessionResponse.is_manager || sessionResponse.is_admin;
    console.log(`  user.is_manager || user.is_admin = ${shouldShowMenu}`);

    console.log('\n' + '='.repeat(60));
    
    if (shouldShowMenu) {
      console.log('✅ YES - User SHOULD see the "Approve Users" menu');
      if (user.is_manager && !user.is_admin) {
        console.log('   Role: Manager (can approve users)');
      } else if (user.is_admin) {
        console.log('   Role: Admin (full access)');
      }
    } else {
      console.log('❌ NO - User will NOT see the "Approve Users" menu');
      console.log('   Role: Regular User');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const identifier = process.argv[2] || 'diego3';
checkMenuVisibility(identifier);

