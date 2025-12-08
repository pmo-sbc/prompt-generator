/**
 * Check YouTube Title & Descriptions Template
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
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%youtube%title%description%' OR name = 'YouTube Title & Descriptions' ORDER BY id DESC"
    );
    
    if (result.rows.length === 0) {
      console.log('No YouTube Title & Descriptions template found.\n');
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} YouTube Title & Descriptions template(s):\n`);
    
    result.rows.forEach((template, index) => {
      console.log(`\n=== Template ${index + 1} (ID: ${template.id}) ===`);
      console.log(`Name: ${template.name}`);
      console.log('\nPrompt Template:');
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
        
        // Check for CTA-related inputs
        const ctaInputs = template.inputs.filter(inp => 
          inp.name.toLowerCase().includes('cta') ||
          inp.name.toLowerCase().includes('call') ||
          inp.label.toLowerCase().includes('cta') ||
          inp.label.toLowerCase().includes('call to action')
        );
        
        if (ctaInputs.length > 0) {
          console.log('\n⚠️  Call to Action inputs found:');
          ctaInputs.forEach(inp => {
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

