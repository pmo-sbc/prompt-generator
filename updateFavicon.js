/**
 * Update all HTML files to use 3rd Rock Ads logo as favicon
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const htmlFiles = [
  'index.html',
  'about.html',
  'templates.html',
  'login.html',
  'signup.html',
  'forgot-password.html',
  'reset-password.html',
  'verify-email.html',
  'dashboard.html',
  'profile.html',
  'projects.html',
  'admin-users.html',
  'admin-templates.html',
  'admin-analytics.html'
];

const faviconTag = '<link rel="icon" type="image/jpeg" href="/images/3rd-logo.jpeg">';

console.log('Updating favicon in all HTML files...\n');

let updatedCount = 0;
let addedCount = 0;

htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if there's already a favicon link
  const faviconRegex = /<link[^>]*rel=["']icon["'][^>]*>/i;

  if (faviconRegex.test(content)) {
    // Replace existing favicon
    content = content.replace(faviconRegex, faviconTag);
    console.log(`✓ Updated: ${file}`);
    updatedCount++;
  } else {
    // Add favicon after the <head> tag
    content = content.replace('</head>', `    ${faviconTag}\n</head>`);
    console.log(`✓ Added: ${file}`);
    addedCount++;
  }

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Summary:`);
console.log(`  Updated: ${updatedCount} files`);
console.log(`  Added: ${addedCount} files`);
console.log(`  Total: ${updatedCount + addedCount} files`);
console.log(`${'='.repeat(50)}`);
console.log('\n✅ All HTML files now use 3rd Rock Ads logo as favicon!');
