/**
 * Test approval access by simulating the exact middleware check
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function testApprovalAccess() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log('\nTesting Approval Access for diego3\n');
    console.log('='.repeat(60));

    const userId = 14; // diego3's ID
    
    // Simulate the exact query from requireManagerOrAdmin middleware
    const result = await pool.query(
      'SELECT is_admin, is_manager FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('Database query result (exact middleware query):');
    console.log(JSON.stringify(user, null, 2));

    // Apply EXACT middleware logic
    if (!user) {
      console.log('\n❌ USER IS NULL - This would deny access');
      return;
    }

    const isAdmin = !!(user.is_admin === true || user.is_admin === 'true' || user.is_admin === 1 || user.is_admin === '1');
    const isManager = !!(user.is_manager === true || user.is_manager === 'true' || user.is_manager === 1 || user.is_manager === '1');
    const hasAdmin = user.is_admin !== null && user.is_admin !== undefined && isAdmin;
    const hasManager = user.is_manager !== null && user.is_manager !== undefined && isManager;

    console.log('\nMiddleware logic evaluation:');
    console.log(`  user exists: ${!!user}`);
    console.log(`  isAdmin check: ${isAdmin}`);
    console.log(`  isManager check: ${isManager}`);
    console.log(`  hasAdmin: ${hasAdmin}`);
    console.log(`  hasManager: ${hasManager}`);
    console.log(`  Final check (!hasAdmin && !hasManager): ${!hasAdmin && !hasManager}`);

    console.log('\n' + '='.repeat(60));
    
    if (!hasAdmin && !hasManager) {
      console.log('❌ ACCESS DENIED - This is what the middleware returns');
      console.log('\nValues that caused denial:');
      console.log(`  user.is_admin: ${JSON.stringify(user.is_admin)}`);
      console.log(`  user.is_manager: ${JSON.stringify(user.is_manager)}`);
    } else {
      console.log('✅ ACCESS GRANTED - This is what should happen');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testApprovalAccess();

