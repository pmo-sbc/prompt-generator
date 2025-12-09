/**
 * Fix Users Sequence
 * Resets the users_id_seq sequence to MAX(id) + 1 to prevent duplicate key errors
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function fixUsersSequence() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl
  });

  try {
    console.log('Checking users table sequence...\n');

    // Get current sequence value
    const seqResult = await pool.query("SELECT last_value, is_called FROM users_id_seq");
    const currentSeq = seqResult.rows[0].last_value;
    const isCalled = seqResult.rows[0].is_called;

    // Get max ID from users table
    const maxResult = await pool.query('SELECT MAX(id) as max_id FROM users');
    const maxId = maxResult.rows[0].max_id || 0;

    console.log(`Current sequence value: ${currentSeq} (is_called: ${isCalled})`);
    console.log(`Maximum ID in users table: ${maxId}`);

    const nextSeqValue = isCalled ? currentSeq + 1 : currentSeq;
    const targetValue = maxId + 1;

    if (nextSeqValue <= maxId) {
      console.log(`\n⚠️  Sequence is out of sync!`);
      console.log(`   Next sequence value would be: ${nextSeqValue}`);
      console.log(`   Should be: ${targetValue}\n`);

      // Reset sequence
      await pool.query(`SELECT setval('users_id_seq', $1, false)`, [targetValue]);

      // Verify
      const verifyResult = await pool.query("SELECT last_value, is_called FROM users_id_seq");
      console.log(`✓ Sequence reset successfully!`);
      console.log(`  New sequence value: ${verifyResult.rows[0].last_value}`);
      console.log(`  Next ID will be: ${verifyResult.rows[0].last_value + 1}\n`);
    } else {
      console.log(`\n✓ Sequence is already correct!`);
      console.log(`  Next ID will be: ${nextSeqValue}\n`);
    }

    console.log('Done!');

  } catch (error) {
    console.error('\n❌ Error fixing sequence:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixUsersSequence();

