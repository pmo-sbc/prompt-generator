/**
 * Check templates that need manual fixes
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

const templateIds = [136, 95, 135, 94, 134, 93, 139, 98, 195, 154, 113, 196, 155, 114, 156, 115];

(async () => {
  try {
    for (const id of templateIds) {
      const result = await pool.query(
        'SELECT id, name, prompt_template, inputs FROM templates WHERE id = $1',
        [id]
      );
      
      if (result.rows.length > 0) {
        const template = result.rows[0];
        console.log(`\n${'='.repeat(80)}`);
        console.log(`${template.name} (ID: ${template.id})`);
        console.log('='.repeat(80));
        console.log('\nPrompt (first 300 chars):');
        console.log(template.prompt_template.substring(0, 300) + '...');
        console.log('\nNumber inputs:');
        template.inputs.filter(inp => inp.type === 'number').forEach(inp => {
          console.log(`  - ${inp.name} (${inp.label}): Default = ${inp.default}`);
        });
        console.log('\nLooking for patterns...');
        
        // Search for the number in the prompt
        const numberInputs = template.inputs.filter(inp => inp.type === 'number');
        numberInputs.forEach(inp => {
          const defaultVal = inp.default;
          if (defaultVal && template.prompt_template.includes(defaultVal)) {
            const index = template.prompt_template.indexOf(defaultVal);
            const context = template.prompt_template.substring(Math.max(0, index - 50), Math.min(template.prompt_template.length, index + 100));
            console.log(`  Found "${defaultVal}" in context: ...${context}...`);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();

