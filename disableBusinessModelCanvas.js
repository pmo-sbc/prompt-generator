/**
 * Disable Business Model Canvas template
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const db = new Database(dbPath);

console.log('Disabling Business Model Canvas template...\n');

// Disable Business Model Canvas template
const result = db.prepare(`
  UPDATE templates
  SET is_active = 0
  WHERE name LIKE '%Business Model Canvas%'
`).run();

console.log(`✓ Disabled ${result.changes} template(s)`);

// Verify
const templates = db.prepare(`
  SELECT id, name, category, subcategory, is_active
  FROM templates
  WHERE name LIKE '%Business Model Canvas%'
`).all();

console.log('\nCurrent status:');
templates.forEach(t => {
  console.log(`  ID ${t.id}: ${t.name} - ${t.is_active ? 'Active' : 'Disabled'}`);
});

db.close();
console.log('\n✅ Done!');
