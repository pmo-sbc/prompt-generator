/**
 * Import users from SQLite export to PostgreSQL database
 * Replicates users from the production SQLite database
 */

require('dotenv').config();

const { Pool } = require('pg');

// Get database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Only import these 3 users
const users = [
  {
    id: 2,
    username: 'ecompean',
    email: 'ely@elycompean.com',
    password: '$2b$10$uVpeiyWFm52j.AayTaZFd.g78ObFHX.m1BQrx7tHOSoQKJolwJYBS',
    email_verified: true,
    verification_token: null,
    verification_token_expires: null,
    password_reset_token: null,
    password_reset_token_expires: null,
    is_admin: true,
    tokens: 93,
    created_at: '2025-10-22 17:44:21'
  },
  {
    id: 4,
    username: 'Jcompean',
    email: 'johnnycompean@gmail.com',
    password: '$2b$10$SS/bx.WUb9wuwgCkFm8F5uPfG8tydFn0OYABUlot4zVeIRvDFR3KK',
    email_verified: true,
    verification_token: null,
    verification_token_expires: null,
    password_reset_token: null,
    password_reset_token_expires: null,
    is_admin: false,
    tokens: 97,
    created_at: '2025-10-29 15:26:17'
  },
  {
    id: 5,
    username: 'Cpurchis',
    email: 'courtney@uniquelyplannedinc.com',
    password: '$2b$10$QPgji8TzzJDEElBA.C0.yOlPZrwN0D6IBMj74vOz8mrJ/8axnpDTC',
    email_verified: true,
    verification_token: null,
    verification_token_expires: null,
    password_reset_token: null,
    password_reset_token_expires: null,
    is_admin: false,
    tokens: 90,
    created_at: '2025-10-29 17:31:46'
  }
];

async function importUsers() {
  console.log('\n========================================');
  console.log('Importing Users to PostgreSQL');
  console.log('========================================\n');
  
  console.log(`Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
  console.log(`Users to import: ${users.length}\n`);
  
  const pool = new Pool(dbConfig);
  
  try {
    // Test connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW(), current_database()');
      console.log(`✓ Connected to: ${result.rows[0].current_database}\n`);
    } finally {
      client.release();
    }
    
    // Import each user
    console.log('Importing users...\n');
    const results = [];
    
    for (const user of users) {
      try {
        // Check if user already exists
        const existing = await pool.query('SELECT id FROM users WHERE id = $1 OR email = $2 OR username = $3', 
          [user.id, user.email, user.username]);
        
        if (existing.rows.length > 0) {
          console.log(`⚠️  User ${user.username} (ID: ${user.id}) already exists - skipping`);
          results.push({ user: user.username, status: 'skipped', reason: 'already exists' });
          continue;
        }
        
        // Insert user with specific ID
        const insertQuery = `
          INSERT INTO users (
            id, username, email, password, email_verified,
            verification_token, verification_token_expires,
            password_reset_token, password_reset_token_expires,
            is_admin, tokens, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, username, email
        `;
        
        const insertResult = await pool.query(insertQuery, [
          user.id,
          user.username,
          user.email,
          user.password,
          user.email_verified,
          user.verification_token,
          user.verification_token_expires ? new Date(user.verification_token_expires) : null,
          user.password_reset_token,
          user.password_reset_token_expires ? new Date(user.password_reset_token_expires) : null,
          user.is_admin,
          user.tokens,
          new Date(user.created_at)
        ]);
        
        console.log(`✓ Imported: ${user.username} (ID: ${user.id}) - ${user.email}`);
        results.push({ user: user.username, status: 'imported', id: user.id });
        
      } catch (error) {
        console.error(`❌ Failed to import ${user.username}: ${error.message}`);
        results.push({ user: user.username, status: 'failed', error: error.message });
      }
    }
    
    // Reset sequence to match imported IDs
    const maxId = Math.max(...users.map(u => u.id));
    await pool.query(`SELECT setval('users_id_seq', $1, true)`, [maxId]);
    console.log(`\n✓ Reset users sequence to ${maxId + 1}`);
    
    // Summary
    console.log('\n========================================');
    console.log('Import Summary');
    console.log('========================================\n');
    
    const imported = results.filter(r => r.status === 'imported').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`Total users: ${users.length}`);
    console.log(`✓ Imported: ${imported}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed imports:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  - ${r.user}: ${r.error}`);
      });
    }
    
    // Verify import
    console.log('\nVerifying import...');
    const countResult = await pool.query('SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE is_admin = true) as admins FROM users');
    console.log(`✓ Total users in database: ${countResult.rows[0].count}`);
    console.log(`✓ Admin users: ${countResult.rows[0].admins}`);
    
    console.log('\n✓ Import completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import
importUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

