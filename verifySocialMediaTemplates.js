const Database = require('better-sqlite3');
const db = new Database('prompts.db');

console.log('Verifying Social Media templates in database...\n');

// Get count of Social Media templates
const countResult = db.prepare("SELECT COUNT(*) as count FROM templates WHERE category = 'Social Media'").get();
console.log(`Total Social Media templates: ${countResult.count}\n`);

// Get templates by subcategory
const subcategories = ['Facebook', 'Instagram', 'LinkedIn', 'Pinterest', 'TikTok', 'Twitter', 'YouTube'];

subcategories.forEach(subcategory => {
  const templates = db.prepare("SELECT name FROM templates WHERE category = 'Social Media' AND subcategory = ? ORDER BY name").all(subcategory);
  console.log(`${subcategory} (${templates.length} templates):`);
  templates.forEach(t => console.log(`  - ${t.name}`));
  console.log('');
});

db.close();
console.log('Verification complete!');
