/**
 * Check Instagram Hashtag Generator Template in Database
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
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%hashtag%' AND name ILIKE '%instagram%' ORDER BY id DESC"
    );
    
    if (result.rows.length === 0) {
      // Try different search
      const result2 = await pool.query(
        "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%hashtag%' OR name ILIKE '%Instagram%' ORDER BY id DESC LIMIT 10"
      );
      console.log(`Found ${result2.rows.length} hashtag/Instagram template(s):\n`);
      result2.rows.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name} (ID: ${template.id})`);
      });
      result.rows = result2.rows.filter(t => t.name.toLowerCase().includes('hashtag') && t.name.toLowerCase().includes('instagram'));
    }
    
    if (result.rows.length === 0) {
      console.log('No Instagram Hashtag template found. Searching all templates...\n');
      const allResult = await pool.query(
        "SELECT id, name FROM templates WHERE name ILIKE '%hashtag%' ORDER BY id DESC LIMIT 10"
      );
      console.log('Templates with "hashtag" in name:');
      allResult.rows.forEach(t => console.log(`  - ${t.name} (ID: ${t.id})`));
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} Instagram Hashtag template(s):\n`);
    
    result.rows.forEach((template, index) => {
      console.log(`\n=== Template ${index + 1} (ID: ${template.id}) ===`);
      console.log(`Name: ${template.name}`);
      console.log('\nPrompt Template:');
      console.log(template.prompt_template);
      console.log('\nInputs:');
      console.log(JSON.stringify(template.inputs, null, 2));
      
      // Check if it uses {{total}} or similar placeholder
      if (template.prompt_template.includes('{{total}}')) {
        console.log('\n✓ Uses {{total}} placeholder correctly');
      } else if (template.prompt_template.match(/\{\{.*total.*\}\}/i)) {
        console.log('\n✓ Uses a total-related placeholder');
        const match = template.prompt_template.match(/\{\{(.*total.*)\}\}/i);
        if (match) console.log(`  Placeholder: {{${match[1]}}}`);
      } else if (template.prompt_template.match(/\d+\s+hashtag/i) || template.prompt_template.match(/hashtag.*\d+/i)) {
        console.log('\n✗ Has hardcoded number instead of {{total}} placeholder');
        const match = template.prompt_template.match(/(\d+)\s*hashtag|hashtag.*?(\d+)/i);
        if (match) console.log(`  Hardcoded number found: ${match[1] || match[2]}`);
      } else {
        console.log('\n⚠️  Check prompt template manually for total/hashtag count');
      }
      
      // Check inputs for total field
      const hasTotalInput = template.inputs && template.inputs.some(inp => 
        inp.name && inp.name.toLowerCase().includes('total')
      );
      if (hasTotalInput) {
        console.log('\n✓ Has a "total" input field');
        const totalInput = template.inputs.find(inp => inp.name && inp.name.toLowerCase().includes('total'));
        console.log(`  Input name: ${totalInput.name}, Label: ${totalInput.label}`);
      } else {
        console.log('\n✗ No "total" input field found');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
})();

