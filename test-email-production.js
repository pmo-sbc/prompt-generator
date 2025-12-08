/**
 * Email Testing and Diagnostic Script
 * Use this to test and troubleshoot email configuration on production
 *
 * Usage:
 *   node test-email-production.js                    # Send to SMTP_USER (self)
 *   node test-email-production.js user@example.com   # Send to specific email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// Get destination email from command line argument or use SMTP_USER as default
const destinationEmail = process.argv[2];

console.log('\n🔍 Email Configuration Diagnostics\n');
console.log('=====================================\n');

if (destinationEmail) {
  console.log(`📧 Test email will be sent to: ${destinationEmail}\n`);
} else {
  console.log('📧 Test email will be sent to SMTP_USER (self-test)\n');
  console.log('💡 Tip: You can specify a recipient: node test-email-production.js user@example.com\n');
}

// Display current environment variables (masked)
console.log('📋 Environment Variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'not set'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'not set'}`);
console.log(`   SMTP_SECURE: ${process.env.SMTP_SECURE || 'not set'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '***' + process.env.SMTP_USER.slice(-10) : 'not set'}`);
console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '***[HIDDEN]' : 'not set'}`);
console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'not set'}`);
console.log(`   BASE_URL: ${process.env.BASE_URL || 'not set'}`);
console.log(`   SMTP_TLS_REJECT_UNAUTHORIZED: ${process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'not set'}\n`);

// Check if required variables are set
const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log('❌ Missing required environment variables:');
  missing.forEach(key => console.log(`   - ${key}`));
  console.log('\n⚠️  Email will NOT work without these variables!\n');
  process.exit(1);
}

console.log('✅ All required environment variables are set\n');

// Create transporter
console.log('🔧 Creating email transporter...\n');

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
  console.log('⚠️  TLS certificate validation is DISABLED');
}

console.log('📧 Transporter Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Secure: ${config.secure} ${config.secure ? '(SSL/TLS)' : '(STARTTLS)'}`);
console.log(`   User: ${config.auth.user}`);
console.log(`   TLS Reject Unauthorized: ${config.tls ? config.tls.rejectUnauthorized : 'true (default)'}\n`);

const transporter = nodemailer.createTransport(config);

// Test connection
console.log('🔌 Testing SMTP connection...\n');

transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ SMTP Connection Failed!\n');
    console.log('Error details:');
    console.log(`   Code: ${error.code || 'N/A'}`);
    console.log(`   Message: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   - Check if SMTP_HOST is correct and reachable');
      console.log('   - Verify SMTP_PORT is correct (usually 465 for SSL, 587 for STARTTLS)');
      console.log('   - Check firewall rules on the server');
    } else if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   - Verify SMTP_USER and SMTP_PASSWORD are correct');
      console.log('   - Check if the email account exists');
      console.log('   - Some providers require "App Passwords" instead of regular passwords');
      console.log('   - Check if the email account is locked or suspended');
    } else if (error.code === 'ESOCKET') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   - Check SSL/TLS settings (SMTP_SECURE)');
      console.log('   - Try setting SMTP_TLS_REJECT_UNAUTHORIZED=false in .env');
      console.log('   - Verify the SMTP server supports the configured security protocol');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   - Server might be blocking outbound SMTP connections');
      console.log('   - Check firewall rules');
      console.log('   - Verify SMTP server is not down');
    }

    console.log('\n');
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!\n');
    console.log('📤 Sending test email...\n');

    // Determine recipient
    const recipientEmail = destinationEmail || config.auth.user;

    // Validate email format if custom destination provided
    if (destinationEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(destinationEmail)) {
        console.log('❌ Invalid email format!\n');
        console.log(`   "${destinationEmail}" is not a valid email address.\n`);
        console.log('Usage: node test-email-production.js user@example.com\n');
        process.exit(1);
      }
    }

    // Send test email
    const testEmail = {
      from: process.env.EMAIL_FROM || `Test <${config.auth.user}>`,
      to: recipientEmail,
      subject: 'Test Email - AI Prompt Templates',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #667eea;">✅ Email Configuration Test Successful!</h2>
          <p>This is a test email from your AI Prompt Templates application.</p>
          <p><strong>Server Details:</strong></p>
          <ul>
            <li>Host: ${config.host}</li>
            <li>Port: ${config.port}</li>
            <li>Secure: ${config.secure}</li>
            <li>Time: ${new Date().toISOString()}</li>
          </ul>
          <p>If you received this email, your email configuration is working correctly! 🎉</p>
        </div>
      `
    };

    transporter.sendMail(testEmail, (error, info) => {
      if (error) {
        console.log('❌ Failed to send test email!\n');
        console.log('Error:', error.message);
        console.log('\n💡 The SMTP connection works, but sending failed. This could be:');
        console.log('   - Invalid FROM address');
        console.log('   - Email account doesn\'t have sending permissions');
        console.log('   - Rate limiting from the email provider');
        console.log('\n');
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!\n');
        console.log('📬 Email Details:');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        console.log(`   To: ${testEmail.to}`);
        console.log(`   From: ${testEmail.from}`);
        console.log('\n🎉 Your email configuration is working perfectly!');

        if (destinationEmail) {
          console.log(`\n📝 Check the inbox at: ${destinationEmail}`);
          console.log('   (Email may take a few moments to arrive)');
        } else {
          console.log('\n📝 Check your inbox at:', testEmail.to);
          console.log('   (This is a self-test email)');
        }

        console.log('\n💡 Next steps:');
        console.log('   - If email arrived: Configuration is correct! ✅');
        console.log('   - If not in inbox: Check spam/junk folder');
        console.log('   - To test with another email: node test-email-production.js other@example.com');
        console.log('\n');
        process.exit(0);
      }
    });
  }
});
