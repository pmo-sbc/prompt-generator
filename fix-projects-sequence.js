/**
 * Fix projects_id_seq sequence
 * Resets the sequence to match the current maximum ID in the projects table
 */

const { getDatabase } = require('./src/db/index');
const logger = require('./src/utils/logger');

async function fixProjectsSequence() {
  try {
    const pool = await getDatabase();
    
    // Get the current maximum ID
    const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM projects');
    const maxId = maxIdResult.rows[0]?.max_id || 0;
    
    console.log(`Current maximum ID in projects table: ${maxId}`);
    
    // Get the current sequence value
    const seqResult = await pool.query("SELECT last_value, is_called FROM projects_id_seq");
    const lastValue = seqResult.rows[0]?.last_value || 0;
    const isCalled = seqResult.rows[0]?.is_called || false;
    
    console.log(`Current sequence value: ${lastValue} (is_called: ${isCalled})`);
    
    // Set the sequence to max_id + 1
    const newSeqValue = maxId + 1;
    await pool.query(`SELECT setval('projects_id_seq', $1, false)`, [newSeqValue]);
    
    console.log(`✓ Sequence reset to: ${newSeqValue}`);
    console.log('✓ Next project will get ID:', newSeqValue);
    
    // Verify
    const verifyResult = await pool.query("SELECT last_value, is_called FROM projects_id_seq");
    console.log(`✓ Verified sequence value: ${verifyResult.rows[0].last_value}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing sequence:', error);
    process.exit(1);
  }
}

// Initialize database and run fix
(async () => {
  const { initializeDatabase } = require('./src/db/index');
  await initializeDatabase();
  await fixProjectsSequence();
})();

