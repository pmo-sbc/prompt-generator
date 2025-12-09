/**
 * Cleanup pending user record
 * Can delete or reset to pending status
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function cleanupPendingUser(email, action = 'delete') {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log(`\nCleaning up pending user: ${email}\n`);
    console.log('='.repeat(60));

    // Check if pending user exists
    const pendingResult = await pool.query(
      'SELECT * FROM pending_users WHERE email = $1',
      [email]
    );

    if (pendingResult.rows.length === 0) {
      console.log('❌ No pending user found for this email');
      return;
    }

    const pendingUser = pendingResult.rows[0];
    console.log('Found pending user:');
    console.log(`  ID: ${pendingUser.id}`);
    console.log(`  Username: ${pendingUser.username}`);
    console.log(`  Email: ${pendingUser.email}`);
    console.log(`  Status: ${pendingUser.status}`);

    // Check if user exists in users table
    const usersResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (usersResult.rows.length > 0) {
      console.log(`\n⚠️  User exists in users table (ID: ${usersResult.rows[0].id})`);
      console.log('   Cannot delete pending record while user exists.');
      return;
    }

    if (action === 'delete') {
      // Delete the pending user
      await pool.query(
        'DELETE FROM pending_users WHERE id = $1',
        [pendingUser.id]
      );
      console.log('\n✅ Pending user deleted successfully');
    } else if (action === 'reset') {
      // Reset to pending
      await pool.query(
        `UPDATE pending_users 
         SET status = 'pending',
             reviewed_at = NULL,
             reviewed_by = NULL,
             review_notes = NULL
         WHERE id = $1`,
        [pendingUser.id]
      );
      console.log('\n✅ Pending user reset to pending status');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Cleanup completed!');
    console.log(`\nUser can now register again with email: ${email}`);

  } catch (error) {
    console.error('\n❌ Error cleaning up pending user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get email and action from command line
const email = process.argv[2] || 'diegoriveramontano@gmail.com';
const action = process.argv[3] || 'delete'; // 'delete' or 'reset'

if (action !== 'delete' && action !== 'reset') {
  console.error('Invalid action. Use "delete" or "reset"');
  process.exit(1);
}

cleanupPendingUser(email, action);

