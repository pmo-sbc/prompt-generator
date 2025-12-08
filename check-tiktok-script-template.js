/**
 * Check TikTok Script Writer Template
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
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%tiktok%script%writer%' OR name = 'TikTok Script Writer' ORDER BY id DESC"
    );
    
    if (result.rows.length === 0) {
      console.log('No TikTok Script Writer template found.\n');
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} TikTok Script Writer template(s):\n`);
    
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
      
      // Check number inputs
      const numberInputs = template.inputs.filter(inp => inp.type === 'number');
      if (numberInputs.length > 0) {
        console.log('\nNumber inputs:');
        numberInputs.forEach(inp => {
          const hasPlaceholder = placeholderNames.includes(inp.name);
          const status = hasPlaceholder ? '✓' : '✗ MISSING';
          console.log(`  ${status} ${inp.name} (${inp.label}) - Default: ${inp.default || 'none'}`);
        });
      }
      
      // Check for hardcoded length values
      const lengthPatterns = [
        /\b\d+\s+seconds?\b/gi,
        /\b\d+\s+minutes?\b/gi,
        /\bless than \d+/gi,
        /\bmore than \d+/gi,
        /\b\d+\s+words?\b/gi
      ];
      
      console.log('\nHardcoded length values found:');
      let foundHardcoded = false;
      lengthPatterns.forEach(pattern => {
        const matches = template.prompt_template.match(pattern);
        if (matches) {
          matches.forEach(match => {
            console.log(`  - "${match}"`);
            foundHardcoded = true;
          });
        }
      });
      if (!foundHardcoded) {
        console.log('  (none found)');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
})();

