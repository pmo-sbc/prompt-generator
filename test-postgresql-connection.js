/**
 * Test PostgreSQL Connection
 * 
 * Simple script to test PostgreSQL database connection
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');

async function testConnection() {
  console.log('Testing PostgreSQL connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${config.database.host}`);
  console.log(`  Port: ${config.database.port}`);
  console.log(`  Database: ${config.database.database}`);
  console.log(`  User: ${config.database.user}`);
  console.log(`  SSL: ${config.database.ssl ? 'enabled' : 'disabled'}\n`);

  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl,
  });

  try {
    const client = await pool.connect();
    console.log('✓ Successfully connected to PostgreSQL!\n');

    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('Database Information:');
    console.log(`  Current Time: ${result.rows[0].current_time}`);
    console.log(`  PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);

    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`Tables found (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    client.release();
    await pool.end();
    
    console.log('\n✓ Connection test completed successfully!');
  } catch (error) {
    console.error('\n✗ Connection failed!');
    console.error(`Error: ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Possible issues:');
      console.error('  - PostgreSQL service is not running');
      console.error('  - Wrong host or port in configuration');
      console.error('  - Firewall blocking connection');
    } else if (error.code === '28P01') {
      console.error('Possible issues:');
      console.error('  - Wrong username or password');
      console.error('  - User does not have access to the database');
    } else if (error.code === '3D000') {
      console.error('Possible issues:');
      console.error('  - Database does not exist');
      console.error('  - Wrong database name in configuration');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();

