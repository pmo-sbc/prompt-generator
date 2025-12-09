/**
 * Test session status endpoint to see what it returns for a manager user
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/config');
const userRepository = require('./src/db/userRepository');

async function testSessionStatus() {
  try {
    console.log('\nTesting session status for diego3 (user ID 14)\n');
    console.log('='.repeat(60));

    // Simulate what the session status endpoint does
    const userId = 14; // diego3's ID
    const user = await userRepository.findById(userId);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('User found:');
    console.log(JSON.stringify(user, null, 2));

    // Simulate the response from /api/session/status
    const sessionStatusResponse = {
      authenticated: true,
      username: user.username,
      userId: user.id,
      is_admin: user.is_admin || false,
      is_manager: user.is_manager || false,
      tokens: user.tokens || 0
    };

    console.log('\nSession Status Response (what frontend receives):');
    console.log(JSON.stringify(sessionStatusResponse, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('\nFrontend Menu Visibility Check:');
    console.log(`  user.is_manager = ${sessionStatusResponse.is_manager}`);
    console.log(`  user.is_admin = ${sessionStatusResponse.is_admin}`);
    console.log(`  user.is_manager || user.is_admin = ${sessionStatusResponse.is_manager || sessionStatusResponse.is_admin}`);
    
    if (sessionStatusResponse.is_manager || sessionStatusResponse.is_admin) {
      console.log('\n✅ Menu SHOULD be visible (Approve Users link)');
    } else {
      console.log('\n❌ Menu will NOT be visible');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testSessionStatus();

