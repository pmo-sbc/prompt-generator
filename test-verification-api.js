/**
 * Test the verification API endpoint directly
 * Usage: node test-verification-api.js <token>
 */

require('dotenv').config();
const http = require('http');

const token = process.argv[2];

if (!token) {
  console.error('Usage: node test-verification-api.js <token>');
  process.exit(1);
}

const postData = JSON.stringify({ token });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/verify-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing verification API endpoint...\n');
console.log(`Token (first 8 chars): ${token.substring(0, 8)}...`);
console.log(`Token length: ${token.length}`);
console.log(`Token is hex: ${/^[a-f0-9]+$/i.test(token)}\n`);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    if (res.statusCode === 200) {
      console.log('\n✅ Verification successful!');
    } else {
      console.log('\n❌ Verification failed!');
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:');
  console.error(error);
});

req.write(postData);
req.end();

