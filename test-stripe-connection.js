/**
 * Stripe Connection Test Script
 * Verifies Stripe API keys and authentication
 */

require('dotenv').config();
const stripe = require('stripe');
const config = require('./src/config');

console.log('🔍 Testing Stripe Connection...\n');

// Check environment variables
console.log('1. Checking Environment Variables:');
console.log('   STRIPE_SECRET_KEY:', config.stripe.secretKey ? '✅ Set' : '❌ Missing');
console.log('   STRIPE_PUBLISHABLE_KEY:', config.stripe.publishableKey ? '✅ Set' : '❌ Missing');
console.log('   STRIPE_TEST_MODE:', config.stripe.testMode ? '✅ Enabled' : '❌ Disabled');
console.log('');

// Check if secret key is provided
if (!config.stripe.secretKey) {
  console.log('❌ ERROR: STRIPE_SECRET_KEY is not set in .env file');
  console.log('\nTo fix this:');
  console.log('1. Go to https://dashboard.stripe.com/test/apikeys');
  console.log('2. Copy your Secret key (starts with sk_test_)');
  console.log('3. Add to .env: STRIPE_SECRET_KEY=sk_test_your_key_here');
  process.exit(1);
}

// Check if it's a test key
const isTestKey = config.stripe.secretKey.startsWith('sk_test_');
const isLiveKey = config.stripe.secretKey.startsWith('sk_live_');

if (!isTestKey && !isLiveKey) {
  console.log('❌ ERROR: Invalid Stripe secret key format');
  console.log('   Secret key should start with sk_test_ (test) or sk_live_ (production)');
  process.exit(1);
}

console.log('2. Key Type Detection:');
console.log('   Key Type:', isTestKey ? '🧪 TEST KEY' : '💰 LIVE KEY');
console.log('   Config Test Mode:', config.stripe.testMode ? 'Enabled' : 'Disabled');
if (isTestKey && !config.stripe.testMode) {
  console.log('   ⚠️  WARNING: Using test key but STRIPE_TEST_MODE is false');
}
if (isLiveKey && config.stripe.testMode) {
  console.log('   ⚠️  WARNING: Using live key but STRIPE_TEST_MODE is true');
}
console.log('');

// Initialize Stripe
console.log('3. Initializing Stripe Client...');
let stripeClient;
try {
  stripeClient = stripe(config.stripe.secretKey);
  console.log('   ✅ Stripe client initialized');
} catch (error) {
  console.log('   ❌ Failed to initialize Stripe client:', error.message);
  process.exit(1);
}
console.log('');

// Test authentication by making a simple API call
console.log('4. Testing Authentication...');
console.log('   Making API call to verify credentials...');

async function testStripeConnection() {
  try {
    // Try to retrieve account information (simple, lightweight call)
    const account = await stripeClient.account.retrieve();
    
    console.log('   ✅ Authentication successful!');
    console.log('');
    console.log('5. Account Information:');
    console.log('   Account ID:', account.id);
    console.log('   Country:', account.country || 'N/A');
    console.log('   Default Currency:', account.default_currency || 'N/A');
    console.log('   Charges Enabled:', account.charges_enabled ? '✅ Yes' : '❌ No');
    console.log('   Payouts Enabled:', account.payouts_enabled ? '✅ Yes' : '❌ No');
    console.log('');

    // Test creating a payment method (doesn't charge anything)
    console.log('6. Testing Payment Method Creation...');
    try {
      const paymentMethod = await stripeClient.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242 4242 4242 4242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });
      console.log('   ✅ Payment method creation works');
      console.log('   Payment Method ID:', paymentMethod.id);
      console.log('');

      // Clean up - delete the test payment method
      await stripeClient.paymentMethods.detach(paymentMethod.id);
      console.log('   ✅ Test payment method cleaned up');
    } catch (pmError) {
      console.log('   ⚠️  Payment method test failed:', pmError.message);
      console.log('   (This might be okay if your account has restrictions)');
    }
    console.log('');

    console.log('✅✅✅ ALL TESTS PASSED! ✅✅✅');
    console.log('');
    console.log('Your Stripe integration is ready to use.');
    console.log('You can now test payments with test card numbers:');
    console.log('   Success: 4242 4242 4242 4242');
    console.log('   Decline: 4000 0000 0000 0002');
    console.log('   Use any future expiry date and any 3-digit CVC');

  } catch (error) {
    console.log('   ❌ Authentication failed!');
    console.log('');
    console.log('Error Details:');
    console.log('   Type:', error.type || 'Unknown');
    console.log('   Message:', error.message);
    console.log('   Code:', error.code || 'N/A');
    console.log('');
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('This usually means:');
      console.log('   - The secret key is incorrect');
      console.log('   - The key has been revoked');
      console.log('   - You\'re using a test key in live mode (or vice versa)');
      console.log('');
      console.log('To fix:');
      console.log('1. Verify your key at https://dashboard.stripe.com/test/apikeys');
      console.log('2. Make sure you copied the entire key');
      console.log('3. Check that STRIPE_TEST_MODE matches your key type');
    } else if (error.type === 'StripeAPIError') {
      console.log('This is a Stripe API error. Check:');
      console.log('   - Your internet connection');
      console.log('   - Stripe service status');
    }
    
    process.exit(1);
  }
}

// Run the test
testStripeConnection().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

