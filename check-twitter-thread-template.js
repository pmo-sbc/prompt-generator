/**
 * Check Twitter Convert Article to Twitter Thread Template
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
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%convert article%twitter thread%' OR name ILIKE '%twitter thread%article%' ORDER BY id DESC"
    );
    
    if (result.rows.length === 0) {
      console.log('No Twitter Thread template found.\n');
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} Twitter Thread template(s):\n`);
    
    result.rows.forEach((template, index) => {
      console.log(`\n=== Template ${index + 1} (ID: ${template.id}) ===`);
      console.log(`Name: ${template.name}`);
      console.log('\nPrompt Template (first 500 chars):');
      console.log(template.prompt_template.substring(0, 500) + '...');
      console.log('\nFull Prompt:');
      console.log(template.prompt_template);
      console.log('\nInputs:');
      console.log(JSON.stringify(template.inputs, null, 2));
      
      // Check for placeholders
      const placeholders = template.prompt_template.match(/\{\{([^}]+)\}\}/g) || [];
      const placeholderNames = placeholders.map(p => p.replace(/\{\{|\}\}/g, '').trim());
      
      console.log('\nPlaceholders found in prompt:');
      if (placeholderNames.length > 0) {
        placeholderNames.forEach(p => console.log(`  - {{${p}}}`));
      } else {
        console.log('  (none found)');
      }
      
      // Check inputs
      if (template.inputs && template.inputs.length > 0) {
        console.log('\nInput fields:');
        template.inputs.forEach((inp, idx) => {
          const hasPlaceholder = placeholderNames.includes(inp.name);
          const status = hasPlaceholder ? '✓' : '✗ MISSING';
          const icon = hasPlaceholder ? '✓' : '✗';
          console.log(`  ${icon} ${idx + 1}. ${inp.name} (${inp.type}) - Label: ${inp.label}${hasPlaceholder ? '' : ' ⚠️ NO PLACEHOLDER!'}`);
          if (inp.default) console.log(`     Default: ${inp.default}`);
          if (inp.placeholder) console.log(`     Placeholder: ${inp.placeholder}`);
        });
        
        // Check for URL-related inputs
        const urlInputs = template.inputs.filter(inp => 
          inp.name.toLowerCase().includes('url') || 
          inp.name.toLowerCase().includes('webpage') ||
          inp.name.toLowerCase().includes('link') ||
          inp.label.toLowerCase().includes('url') ||
          inp.label.toLowerCase().includes('webpage') ||
          inp.label.toLowerCase().includes('link')
        );
        
        if (urlInputs.length > 0) {
          console.log('\n⚠️  URL/Webpage inputs found:');
          urlInputs.forEach(inp => {
            const hasPlaceholder = placeholderNames.includes(inp.name);
            console.log(`  ${hasPlaceholder ? '✓' : '✗'} ${inp.name} - ${hasPlaceholder ? 'Has placeholder' : 'MISSING PLACEHOLDER!'}`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
})();

