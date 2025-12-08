/**
 * Disable all domains except Marketing and Social Media
 */

const Database = require('better-sqlite3');
const db = new Database('prompts.db');

console.log('Disabling all domains except Marketing and Social Media...\n');

// First, let's see what categories we have
const categoriesResult = db.prepare("SELECT DISTINCT category FROM templates ORDER BY category").all();
console.log('Current categories in database:');
categoriesResult.forEach(row => console.log(`  - ${row.category}`));
console.log('');

// Disable all templates that are NOT Marketing or Social Media
const result = db.prepare(`
  UPDATE templates
  SET is_active = 0
  WHERE category NOT IN ('Marketing', 'Social Media')
`).run();

console.log(`✓ Disabled ${result.changes} templates from other domains\n`);

// Show what's active now
const activeCategories = db.prepare("SELECT DISTINCT category FROM templates WHERE is_active = 1 ORDER BY category").all();
console.log('Active categories after update:');
activeCategories.forEach(row => {
  const count = db.prepare("SELECT COUNT(*) as count FROM templates WHERE category = ? AND is_active = 1").get(row.category);
  console.log(`  - ${row.category} (${count.count} templates)`);
});

db.close();
console.log('\n✅ Done! Only Marketing and Social Media domains are now active.');
