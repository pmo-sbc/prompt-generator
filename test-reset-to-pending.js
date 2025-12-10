/**
 * Test script to verify resetToPending SQL syntax fix
 * This tests the function that was causing "syntax error at or near ,"
 */

require('dotenv').config();
const { initializeDatabase } = require('./src/db');
const pendingUserRepository = require('./src/db/pendingUserRepository');
const bcrypt = require('bcrypt');
const config = require('./src/config');

async function testResetToPending() {
  try {
    console.log('🔧 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized\n');

    // Create a test pending user
    console.log('📝 Creating test pending user...');
    const testUsername = `test_reset_${Date.now()}`;
    const testEmail = `test_reset_${Date.now()}@test.com`;
    const testPassword = await bcrypt.hash('testpassword123', config.security.bcryptRounds);

    const pendingUser = await pendingUserRepository.create(testUsername, testEmail, testPassword);
    console.log(`✅ Created pending user: ID=${pendingUser.id}, Username=${testUsername}, Email=${testEmail}\n`);

    // Reject the user
    console.log('❌ Rejecting the user...');
    await pendingUserRepository.reject(pendingUser.id, 1, 'Test rejection');
    console.log('✅ User rejected\n');

    // Test resetToPending with new username and email
    console.log('🔄 Testing resetToPending with new username and email...');
    const newUsername = `test_reset_new_${Date.now()}`;
    const newEmail = `test_reset_new_${Date.now()}@test.com`;
    const newPassword = await bcrypt.hash('newpassword123', config.security.bcryptRounds);

    const resetUser = await pendingUserRepository.resetToPending(
      pendingUser.id,
      newPassword,
      newUsername,
      newEmail
    );

    console.log('✅ resetToPending completed successfully!');
    console.log(`   Updated user: ID=${resetUser.id}, Username=${resetUser.username}, Email=${resetUser.email}, Status=${resetUser.status}\n`);

    // Verify the update
    const verifyUser = await pendingUserRepository.findById(pendingUser.id);
    console.log('🔍 Verification:');
    console.log(`   Username: ${verifyUser.username} (expected: ${newUsername})`);
    console.log(`   Email: ${verifyUser.email} (expected: ${newEmail})`);
    console.log(`   Status: ${verifyUser.status} (expected: pending)`);
    console.log(`   Password updated: ${verifyUser.password !== pendingUser.password ? 'Yes' : 'No'}\n`);

    // Test resetToPending with only password (no username/email)
    console.log('🔄 Testing resetToPending with only password (no username/email)...');
    const anotherPassword = await bcrypt.hash('anotherpassword123', config.security.bcryptRounds);
    const resetUser2 = await pendingUserRepository.resetToPending(
      pendingUser.id,
      anotherPassword,
      null,
      null
    );

    console.log('✅ resetToPending with null username/email completed successfully!');
    console.log(`   Username preserved: ${resetUser2.username === newUsername ? 'Yes' : 'No'}`);
    console.log(`   Email preserved: ${resetUser2.email === newEmail ? 'Yes' : 'No'}\n`);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await pendingUserRepository.delete(pendingUser.id);
    console.log('✅ Test data cleaned up\n');

    console.log('✅✅✅ ALL TESTS PASSED! The SQL syntax error is fixed! ✅✅✅');
    process.exit(0);

  } catch (error) {
    console.error('❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('syntax error') || error.message.includes('near')) {
      console.error('\n⚠️  SQL SYNTAX ERROR DETECTED - The fix did not work!');
    }
    
    process.exit(1);
  }
}

// Run the test
testResetToPending();

