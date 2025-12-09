/**
 * Complete pending user approval
 * Creates user in users table from approved pending_users record
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');
const crypto = require('crypto');

async function completeApproval() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    const email = 'diegoriveramontano@gmail.com';
    
    console.log(`\nCompleting approval for: ${email}\n`);
    console.log('='.repeat(60));

    // Get pending user
    const pendingResult = await pool.query(
      'SELECT * FROM pending_users WHERE email = $1 AND status = $2',
      [email, 'approved']
    );

    if (pendingResult.rows.length === 0) {
      console.log('❌ No approved pending user found for this email');
      return;
    }

    const pendingUser = pendingResult.rows[0];
    console.log('Found pending user:');
    console.log(`  ID: ${pendingUser.id}`);
    console.log(`  Username: ${pendingUser.username}`);
    console.log(`  Email: ${pendingUser.email}`);
    console.log(`  Status: ${pendingUser.status}`);

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, pendingUser.username]
    );

    if (existingUser.rows.length > 0) {
      console.log('\n⚠️  User already exists in users table:');
      console.log(`  ID: ${existingUser.rows[0].id}`);
      return;
    }

    // Create user in users table
    console.log('\nCreating user in users table...');
    const insertResult = await pool.query(
      `INSERT INTO users (username, email, password, email_verified)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, username, email`,
      [pendingUser.username, pendingUser.email, pendingUser.password]
    );

    const newUser = insertResult.rows[0];
    console.log('✅ User created successfully:');
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Username: ${newUser.username}`);
    console.log(`  Email: ${newUser.email}`);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `UPDATE users 
       SET verification_token = $1, verification_token_expires = $2 
       WHERE id = $3`,
      [verificationToken, expiresAt.toISOString(), newUser.id]
    );

    console.log('✅ Verification token generated');
    console.log(`  Token: ${verificationToken.substring(0, 16)}...`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Approval completed successfully!');
    console.log(`\nUser can now verify their email with the token or log in.`);
    console.log(`User ID: ${newUser.id}`);

  } catch (error) {
    console.error('\n❌ Error completing approval:', error.message);
    if (error.code === '23505') {
      console.error('  → Duplicate key error - user may already exist');
    }
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

completeApproval();

