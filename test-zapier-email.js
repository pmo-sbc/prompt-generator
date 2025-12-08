/**
 * Test Zapier Email Integration
 * Tests sending emails through Zapier webhook
 */

require('dotenv').config();
const axios = require('axios');

const destinationEmail = process.argv[2];

console.log('\n📧 Zapier Email Integration Test\n');
console.log('=========================================\n');

// Check configuration
console.log('📋 Configuration Check:\n');
console.log(`   ZAPIER_WEBHOOK_URL: ${process.env.ZAPIER_WEBHOOK_URL ? '✅ Configured' : '❌ Not set'}`);
console.log(`   ZAPIER_SECRET: ${process.env.ZAPIER_SECRET ? '✅ Set (optional)' : '⚠️  Not set (optional)'}`);
console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}`);
console.log(`   BASE_URL: ${process.env.BASE_URL || 'Not set'}\n`);

if (!process.env.ZAPIER_WEBHOOK_URL) {
  console.log('❌ ERROR: ZAPIER_WEBHOOK_URL is not configured!\n');
  console.log('Please add to your .env file:');
  console.log('   ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR/WEBHOOK/URL\n');
  console.log('See ZAPIER-SETUP-GUIDE.md for instructions.\n');
  process.exit(1);
}

const recipient = destinationEmail || process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || 'test@example.com';

if (destinationEmail) {
  console.log(`📧 Test email will be sent to: ${recipient}\n`);
} else {
  console.log(`📧 Test email will be sent to: ${recipient} (extracted from EMAIL_FROM)\n`);
  console.log('💡 Tip: Specify recipient: node test-zapier-email.js user@example.com\n');
}

console.log('=========================================\n');
console.log('🚀 Sending test email via Zapier...\n');

async function testZapierEmail() {
  try {
    const payload = {
      to_email: recipient,
      from_email: process.env.EMAIL_FROM || 'Test <test@example.com>',
      subject: 'Test Email - Zapier Integration',
      html_body: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px; }
            h2 { color: #667eea; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .info { background: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            ul { padding-left: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>✅ Zapier Email Integration Test</h2>

            <div class="success">
              <strong>Success!</strong> If you're reading this, your Zapier email integration is working correctly.
            </div>

            <p>This test email was sent through your Zapier webhook to verify the integration is configured properly.</p>

            <div class="info">
              <strong>Test Details:</strong>
              <ul>
                <li><strong>Sent via:</strong> Zapier Webhook</li>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>From:</strong> ${process.env.EMAIL_FROM || 'Test <test@example.com>'}</li>
                <li><strong>To:</strong> ${recipient}</li>
              </ul>
            </div>

            <p><strong>What This Means:</strong></p>
            <ul>
              <li>✅ Your webhook URL is correct</li>
              <li>✅ Zapier is receiving the data</li>
              <li>✅ Your Zap is properly configured</li>
              <li>✅ Emails are being sent successfully</li>
            </ul>

            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Verify this email arrived in your inbox</li>
              <li>Check that the formatting looks correct</li>
              <li>Test with other email addresses if needed</li>
              <li>Deploy to production!</li>
            </ol>

            <div class="footer">
              <p>This is an automated test email from AI Prompt Templates</p>
              <p>Sent via Zapier Webhook Integration</p>
            </div>
          </div>
        </body>
        </html>
      `,
      timestamp: new Date().toISOString()
    };

    // Add secret if configured
    if (process.env.ZAPIER_SECRET) {
      payload.secret = process.env.ZAPIER_SECRET;
      console.log('🔐 Including secret key for authentication\n');
    }

    console.log('📤 Payload being sent:');
    console.log(`   To: ${payload.to_email}`);
    console.log(`   From: ${payload.from_email}`);
    console.log(`   Subject: ${payload.subject}`);
    console.log(`   Timestamp: ${payload.timestamp}`);
    console.log(`   HTML Body: ${payload.html_body.length} characters\n`);

    console.log('🌐 Sending to webhook:', process.env.ZAPIER_WEBHOOK_URL.substring(0, 50) + '...\n');

    const response = await axios.post(process.env.ZAPIER_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });

    console.log('✅ Webhook request successful!\n');
    console.log('📬 Response Details:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}\n`);

    console.log('=========================================\n');
    console.log('🎉 Test completed successfully!\n');
    console.log('💡 Next Steps:\n');
    console.log('   1. Check your inbox at:', recipient);
    console.log('   2. Verify the email looks correct');
    console.log('   3. Check spam folder if not in inbox');
    console.log('   4. If successful, replace emailService.js with emailService-zapier.js\n');
    console.log('📝 To test another email:');
    console.log(`   node test-zapier-email.js another@example.com\n`);
    console.log('=========================================\n');

  } catch (error) {
    console.log('❌ Test failed!\n');
    console.log('Error Details:');
    console.log(`   Type: ${error.code || 'Unknown'}`);
    console.log(`   Message: ${error.message}`);

    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }

    console.log('\n💡 Troubleshooting:\n');

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('   ❌ Cannot reach Zapier webhook URL');
      console.log('   • Check that ZAPIER_WEBHOOK_URL is correct');
      console.log('   • Verify your internet connection');
      console.log('   • Make sure Zap is turned ON in Zapier\n');
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('   ❌ Authentication failed');
      console.log('   • Check ZAPIER_SECRET is correct');
      console.log('   • Verify webhook URL is complete and correct\n');
    } else if (error.response?.status === 404) {
      console.log('   ❌ Webhook not found');
      console.log('   • Double-check ZAPIER_WEBHOOK_URL in .env');
      console.log('   • Make sure you copied the full URL from Zapier\n');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('   ❌ Request timed out');
      console.log('   • Zapier might be slow or down');
      console.log('   • Try again in a few seconds\n');
    } else {
      console.log('   • Check ZAPIER_WEBHOOK_URL is correct');
      console.log('   • Verify Zap is turned ON');
      console.log('   • Check Zapier dashboard for errors');
      console.log('   • Review ZAPIER-SETUP-GUIDE.md\n');
    }

    console.log('=========================================\n');
    process.exit(1);
  }
}

testZapierEmail();
