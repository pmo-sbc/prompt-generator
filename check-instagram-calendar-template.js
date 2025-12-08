/**
 * Check Instagram Post Calendar Template in Database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

(async () => {
  try {
    const result = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%instagram%' AND name ILIKE '%calendar%' ORDER BY id DESC"
    );
    
    if (result.rows.length === 0) {
      console.log('No Instagram Calendar template found. Searching all templates...\n');
      const allResult = await pool.query(
        "SELECT id, name FROM templates WHERE name ILIKE '%calendar%' ORDER BY id DESC LIMIT 10"
      );
      console.log('Templates with "calendar" in name:');
      allResult.rows.forEach(t => console.log(`  - ${t.name} (ID: ${t.id})`));
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} Instagram Calendar template(s):\n`);
    
    result.rows.forEach((template, index) => {
      console.log(`\n=== Template ${index + 1} (ID: ${template.id}) ===`);
      console.log(`Name: ${template.name}`);
      console.log('\nPrompt Template:');
      console.log(template.prompt_template);
      console.log('\nInputs:');
      console.log(JSON.stringify(template.inputs, null, 2));
      
      // Check for placeholders
      const placeholders = template.prompt_template.match(/\{\{([^}]+)\}\}/g);
      if (placeholders) {
        console.log('\nPlaceholders found in prompt:');
        placeholders.forEach(p => console.log(`  - ${p}`));
      } else {
        console.log('\n✗ No placeholders found in prompt');
      }
      
      // Check for hardcoded values
      if (template.prompt_template.includes('3 months') || template.prompt_template.includes('3 Instagram posts')) {
        console.log('\n✗ Has hardcoded values (3 months, 3 posts)');
      }
      
      // Check inputs
      if (template.inputs) {
        console.log('\nInput fields:');
        template.inputs.forEach((inp, idx) => {
          console.log(`  ${idx + 1}. ${inp.name} (${inp.type}) - Label: ${inp.label}`);
          if (inp.default) console.log(`     Default: ${inp.default}`);
        });
        
        // Check if inputs match placeholders
        const inputNames = template.inputs.map(inp => inp.name);
        if (placeholders) {
          placeholders.forEach(p => {
            const placeholderName = p.replace(/\{\{|\}\}/g, '').trim();
            if (!inputNames.includes(placeholderName)) {
              console.log(`\n⚠️  Placeholder ${p} has no matching input field!`);
            }
          });
        }
        
        inputNames.forEach(name => {
          if (!placeholders || !placeholders.some(p => p.includes(name))) {
            console.log(`\n⚠️  Input field "${name}" has no matching placeholder in prompt!`);
          }
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
})();

