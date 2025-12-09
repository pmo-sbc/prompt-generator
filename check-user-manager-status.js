/**
 * Check a user's manager status
 * Usage: node check-user-manager-status.js <username or email>
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function checkUserManagerStatus(identifier) {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log(`\nChecking manager status for: ${identifier}\n`);
    console.log('='.repeat(60));

    // Find user by username or email
    const result = await pool.query(
      `SELECT id, username, email, is_admin, is_manager, 
              pg_typeof(is_admin) as admin_type, 
              pg_typeof(is_manager) as manager_type
       FROM users 
       WHERE username = $1 OR email = $1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  is_admin: ${user.is_admin} (type: ${user.admin_type})`);
    console.log(`  is_manager: ${user.is_manager} (type: ${user.manager_type})`);
    
    // Check boolean values
    const isAdmin = user.is_admin === true || user.is_admin === 'true' || user.is_admin === 1;
    const isManager = user.is_manager === true || user.is_manager === 'true' || user.is_manager === 1;
    
    console.log('\nInterpreted values:');
    console.log(`  isAdmin: ${isAdmin}`);
    console.log(`  isManager: ${isManager}`);
    
    console.log('\n' + '='.repeat(60));
    
    if (isAdmin) {
      console.log('✅ User has ADMIN role');
    } else if (isManager) {
      console.log('✅ User has MANAGER role');
    } else {
      console.log('❌ User has no special role (regular user)');
    }

  } catch (error) {
    console.error('\n❌ Error checking user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get identifier from command line argument
const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node check-user-manager-status.js <username or email>');
  process.exit(1);
}

checkUserManagerStatus(identifier);

