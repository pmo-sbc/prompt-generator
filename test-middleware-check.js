/**
 * Test the middleware check logic directly
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function testMiddlewareCheck() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log('\nTesting middleware check logic for diego3 (ID: 14)\n');
    console.log('='.repeat(60));

    // Simulate the middleware query
    const userId = 14; // diego3
    const result = await pool.query(
      'SELECT is_admin, is_manager FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('Raw database values:');
    console.log(`  is_admin: ${JSON.stringify(user.is_admin)} (type: ${typeof user.is_admin})`);
    console.log(`  is_manager: ${JSON.stringify(user.is_manager)} (type: ${typeof user.is_manager})`);

    // Apply the middleware logic
    const isAdmin = !!(user.is_admin === true || user.is_admin === 'true' || user.is_admin === 1 || user.is_admin === '1');
    const isManager = !!(user.is_manager === true || user.is_manager === 'true' || user.is_manager === 1 || user.is_manager === '1');
    
    const hasAdmin = user.is_admin !== null && user.is_admin !== undefined && isAdmin;
    const hasManager = user.is_manager !== null && user.is_manager !== undefined && isManager;

    console.log('\nMiddleware logic results:');
    console.log(`  isAdmin: ${isAdmin}`);
    console.log(`  isManager: ${isManager}`);
    console.log(`  hasAdmin: ${hasAdmin}`);
    console.log(`  hasManager: ${hasManager}`);
    console.log(`  hasAccess (hasAdmin || hasManager): ${hasAdmin || hasManager}`);

    console.log('\n' + '='.repeat(60));
    
    if (hasAdmin || hasManager) {
      console.log('✅ Access GRANTED - User should be able to access approve users page');
    } else {
      console.log('❌ Access DENIED - This is the problem!');
      console.log('\nDebugging:');
      console.log(`  user.is_manager === true: ${user.is_manager === true}`);
      console.log(`  user.is_manager === 'true': ${user.is_manager === 'true'}`);
      console.log(`  user.is_manager === 1: ${user.is_manager === 1}`);
      console.log(`  user.is_manager === '1': ${user.is_manager === '1'}`);
      console.log(`  Boolean(user.is_manager): ${Boolean(user.is_manager)}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testMiddlewareCheck();

