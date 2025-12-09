/**
 * Verify Manager Role Setup
 * Checks if the is_manager column exists and shows current user roles
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function verifyManagerSetup() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log('\nVerifying Manager Role Setup\n');
    console.log('='.repeat(60));

    // Check if is_manager column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_manager'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ ERROR: is_manager column does NOT exist!');
      console.log('\n⚠️  You need to run the migration:');
      console.log('   sudo -u postgres psql -d prompt_generator -f add-manager-role.sql');
      console.log('\n   OR the database schema will be updated automatically on next server restart.');
      return;
    } else {
      console.log('✅ is_manager column exists');
      console.log(`   Type: ${columnCheck.rows[0].data_type}`);
      console.log(`   Default: ${columnCheck.rows[0].column_default}`);
    }

    // Get all users with their roles
    console.log('\n📊 Current User Roles:');
    console.log('-'.repeat(60));
    
    const users = await pool.query(`
      SELECT id, username, email, is_admin, is_manager
      FROM users
      ORDER BY id
    `);

    if (users.rows.length === 0) {
      console.log('No users found');
    } else {
      users.rows.forEach(user => {
        const roles = [];
        if (user.is_admin) roles.push('Admin');
        if (user.is_manager) roles.push('Manager');
        if (roles.length === 0) roles.push('User');
        
        console.log(`ID ${user.id}: ${user.username} (${user.email}) - ${roles.join(', ')}`);
        console.log(`   is_admin: ${user.is_admin}, is_manager: ${user.is_manager}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Setup verification complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyManagerSetup();

