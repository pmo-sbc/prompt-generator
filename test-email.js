/**
 * Email Configuration Test Script
 * Tests SMTP connection and sends a test email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfiguration() {
  console.log('=== Testing Email Configuration ===\n');

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    console.error('❌ SMTP configuration missing!');
    console.log('Please set SMTP_HOST and SMTP_PORT in your .env file');
    return;
  }

  console.log('📧 SMTP Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   Secure: ${process.env.SMTP_SECURE === 'true'}`);
  console.log(`   User: ${process.env.SMTP_USER || process.env.EMAIL_USER}`);
  console.log(`   From: ${process.env.EMAIL_FROM}\n`);

  // Create transporter
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD
    }
  };

  // Add TLS options if specified
  if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
    config.tls = {
      rejectUnauthorized: false
    };
  }

  const transporter = nodemailer.createTransport(config);

  // Test 1: Verify connection
  console.log('🔍 Test 1: Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('   Error details:', error);
    return;
  }

  // Test 2: Send test email
  console.log('📨 Test 2: Sending test email...');

  const testEmail = process.env.SMTP_USER || process.env.EMAIL_USER;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Test <${testEmail}>`,
      to: testEmail, // Send to yourself
      subject: 'Test Email - AI Prompt Templates',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              margin-top: 20px;
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #27ae60;
            }
            .logo {
              width: 60px;
              height: 60px;
              background: #27ae60;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
              color: white;
              margin-bottom: 10px;
            }
            h1 {
              color: #27ae60;
              margin: 10px 0;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .info-table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            .info-table td {
              padding: 8px;
              border-bottom: 1px solid #ddd;
            }
            .info-table td:first-child {
              font-weight: bold;
              width: 40%;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✓</div>
              <h1>Email Configuration Test Successful!</h1>
            </div>

            <div class="success-box">
              <strong>✅ Congratulations!</strong> Your SMTP configuration is working correctly.
            </div>

            <p>This is a test email to verify your SMTP server configuration for AI Prompt Templates.</p>

            <h3>Configuration Details:</h3>
            <table class="info-table">
              <tr>
                <td>SMTP Host:</td>
                <td>${process.env.SMTP_HOST}</td>
              </tr>
              <tr>
                <td>SMTP Port:</td>
                <td>${process.env.SMTP_PORT}</td>
              </tr>
              <tr>
                <td>Secure Connection:</td>
                <td>${process.env.SMTP_SECURE === 'true' ? 'Yes (SSL/TLS)' : 'No (STARTTLS)'}</td>
              </tr>
              <tr>
                <td>From Address:</td>
                <td>${process.env.EMAIL_FROM}</td>
              </tr>
              <tr>
                <td>Test Date:</td>
                <td>${new Date().toLocaleString()}</td>
              </tr>
            </table>

            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Email verification will now work for new user registrations</li>
              <li>Welcome emails will be sent automatically</li>
              <li>Password reset emails will be functional</li>
            </ul>

            <div class="footer">
              <p>This is an automated test email from AI Prompt Templates</p>
              <p>You can safely delete this email</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Recipient: ${testEmail}\n`);
    console.log('🎉 All tests passed! Your email configuration is working correctly.');
    console.log('   Check your inbox at:', testEmail);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('   Error details:', error);
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
