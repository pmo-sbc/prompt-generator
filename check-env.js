/**
 * Environment Variables Diagnostic Script
 */

require('dotenv').config();

console.log('=== Environment Variables Check ===\n');

console.log('SMTP Configuration:');
console.log('  SMTP_HOST:', process.env.SMTP_HOST || '(not set)');
console.log('  SMTP_PORT:', process.env.SMTP_PORT || '(not set)');
console.log('  SMTP_SECURE:', process.env.SMTP_SECURE || '(not set)');
console.log('  SMTP_USER:', process.env.SMTP_USER || '(not set)');
console.log('  SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***SET***' : '(not set)');
console.log('  SMTP_TLS_REJECT_UNAUTHORIZED:', process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '(not set)');
console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '(not set)');
console.log('  BASE_URL:', process.env.BASE_URL || '(not set)');

console.log('\nAlternate Email Service Config:');
console.log('  EMAIL_SERVICE:', process.env.EMAIL_SERVICE || '(not set)');
console.log('  EMAIL_USER:', process.env.EMAIL_USER || '(not set)');
console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : '(not set)');

console.log('\n=== Diagnosis ===');

if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
  console.log('✅ SMTP configuration detected');
  console.log('   Server should use:', process.env.SMTP_HOST + ':' + process.env.SMTP_PORT);
} else if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER) {
  console.log('✅ Email service configuration detected');
  console.log('   Service:', process.env.EMAIL_SERVICE);
} else {
  console.log('❌ No email configuration found!');
  console.log('   Emails will be logged to console only');
}
