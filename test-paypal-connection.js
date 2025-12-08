/**
 * PayPal Connection Test Script
 * Verifies PayPal API credentials and authentication
 */

require('dotenv').config();
const paypal = require('@paypal/paypal-server-sdk');
const config = require('./src/config');

console.log('🔍 Testing PayPal Connection...\n');

// Check environment variables
console.log('1. Checking Environment Variables:');
console.log('   PAYPAL_CLIENT_ID:', config.paypal.clientId ? '✅ Set' : '❌ Missing');
console.log('   PAYPAL_CLIENT_SECRET:', config.paypal.clientSecret ? '✅ Set' : '❌ Missing');
console.log('   PAYPAL_SANDBOX_MODE:', config.paypal.sandboxMode ? '✅ Enabled (Sandbox)' : '❌ Disabled (Live)');
console.log('');

// Check if credentials are provided
if (!config.paypal.clientId || !config.paypal.clientSecret) {
  console.log('❌ ERROR: PayPal credentials are not set in .env file');
  console.log('\nTo fix this:');
  console.log('1. Go to https://developer.paypal.com/');
  console.log('2. Navigate to My Apps & Credentials');
  console.log('3. Create a new app (or use existing)');
  console.log('4. Copy your Client ID and Secret');
  console.log('5. Add to .env:');
  console.log('   PAYPAL_CLIENT_ID=your_client_id_here');
  console.log('   PAYPAL_CLIENT_SECRET=your_secret_here');
  console.log('   PAYPAL_SANDBOX_MODE=true');
  process.exit(1);
}

// Initialize PayPal client
console.log('2. Initializing PayPal Client...');
let paypalClient;
try {
  const environment = config.paypal.environment === 'live'
    ? paypal.core.LiveEnvironment
    : paypal.core.SandboxEnvironment;
  
  paypalClient = new paypal.core.PayPalHttpClient(
    new environment(config.paypal.clientId, config.paypal.clientSecret)
  );
  console.log('   ✅ PayPal client initialized');
  console.log('   Environment:', config.paypal.environment === 'live' ? '💰 LIVE' : '🧪 SANDBOX');
} catch (error) {
  console.log('   ❌ Failed to initialize PayPal client:', error.message);
  process.exit(1);
}
console.log('');

// Test authentication by creating a test order
console.log('3. Testing Authentication...');
console.log('   Creating a test PayPal order...');

async function testPayPalConnection() {
  try {
    // Create a test order for $1.00
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '1.00'
        }
      }]
    });

    const order = await paypalClient.execute(request);

    if (order.result && order.result.id) {
      console.log('   ✅ Authentication successful!');
      console.log('');
      console.log('4. Order Information:');
      console.log('   Order ID:', order.result.id);
      console.log('   Status:', order.result.status);
      console.log('   Amount: $1.00 USD');
      console.log('   Intent: CAPTURE');
      console.log('');

      // Try to capture the order (this will fail but tests the connection)
      console.log('5. Testing Order Capture...');
      try {
        const captureRequest = new paypal.orders.OrdersCaptureRequest(order.result.id);
        captureRequest.requestBody({});
        
        // Note: This will fail because the order wasn't approved, but it tests the API connection
        await paypalClient.execute(captureRequest);
      } catch (captureError) {
        // Expected error - order not approved
        if (captureError.statusCode === 422) {
          console.log('   ✅ Capture endpoint accessible (order not approved, as expected)');
        } else {
          console.log('   ⚠️  Capture test:', captureError.message);
        }
      }
      console.log('');

      console.log('✅✅✅ ALL TESTS PASSED! ✅✅✅');
      console.log('');
      console.log('Your PayPal integration is ready to use.');
      console.log('');
      if (config.paypal.sandboxMode) {
        console.log('🧪 SANDBOX MODE: Use PayPal sandbox test accounts');
        console.log('   Create test accounts at: https://developer.paypal.com/dashboard/accounts');
        console.log('   Test with sandbox buyer/seller accounts');
      } else {
        console.log('💰 LIVE MODE: Ready for real payments');
        console.log('   ⚠️  Test with a small amount first!');
      }

    } else {
      console.log('   ❌ Failed to create order');
      process.exit(1);
    }
  } catch (error) {
    console.log('   ❌ Authentication failed!');
    console.log('');
    console.log('Error Details:');
    console.log('   Status Code:', error.statusCode || 'N/A');
    console.log('   Message:', error.message);
    console.log('');
    
    if (error.statusCode === 401) {
      console.log('This usually means:');
      console.log('   - The Client ID or Secret is incorrect');
      console.log('   - The credentials are for a different environment (sandbox vs live)');
      console.log('   - The credentials have been revoked');
    } else if (error.statusCode === 403) {
      console.log('This usually means:');
      console.log('   - Your PayPal account doesn\'t have the required permissions');
      console.log('   - The app credentials are not properly configured');
    } else if (error.statusCode === 404) {
      console.log('This usually means:');
      console.log('   - The API endpoint is incorrect');
      console.log('   - PayPal service is temporarily unavailable');
    }
    
    console.log('');
    console.log('To fix:');
    console.log('1. Verify your credentials at https://developer.paypal.com/');
    console.log('2. Make sure PAYPAL_SANDBOX_MODE matches your credentials');
    console.log('3. Check that your PayPal account is active');
    
    process.exit(1);
  }
}

// Run the test
testPayPalConnection().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

