/**
 * Fix saved_prompts sequence to be in sync with the actual data
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

(async () => {
  try {
    console.log('Checking saved_prompts sequence...\n');
    
    // Get current sequence value
    const seqResult = await pool.query(
      "SELECT last_value, is_called FROM saved_prompts_id_seq"
    );
    const currentSeq = seqResult.rows[0];
    console.log(`Current sequence value: ${currentSeq.last_value}`);
    console.log(`Sequence has been called: ${currentSeq.is_called}\n`);
    
    // Get max ID from table
    const maxResult = await pool.query(
      "SELECT COALESCE(MAX(id), 0) as max_id FROM saved_prompts"
    );
    const maxId = parseInt(maxResult.rows[0].max_id, 10);
    console.log(`Maximum ID in table: ${maxId}\n`);
    
    if (maxId >= currentSeq.last_value) {
      // Sequence is behind - need to fix it
      const newSeqValue = maxId + 1;
      console.log(`Fixing sequence: setting to ${newSeqValue}...`);
      
      await pool.query(
        `SELECT setval('saved_prompts_id_seq', $1, true)`,
        [newSeqValue]
      );
      
      console.log('✓ Sequence fixed successfully!');
      
      // Verify
      const verifyResult = await pool.query(
        "SELECT last_value FROM saved_prompts_id_seq"
      );
      console.log(`Verified sequence value: ${verifyResult.rows[0].last_value}`);
    } else {
      console.log('✓ Sequence is already in sync (or ahead of data)');
    }
    
  } catch (error) {
    console.error('Error fixing sequence:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

