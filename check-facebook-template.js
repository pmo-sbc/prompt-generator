/**
 * Check Facebook Group Post Template in Database
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
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Facebook Group Post' ORDER BY id DESC"
    );
    
    console.log(`Found ${result.rows.length} Facebook Group Post template(s):\n`);
    
    result.rows.forEach((template, index) => {
      console.log(`\n=== Template ${index + 1} (ID: ${template.id}) ===`);
      console.log('Prompt Template:');
      console.log(template.prompt_template);
      console.log('\nInputs:');
      console.log(JSON.stringify(template.inputs, null, 2));
      
      // Check if it uses {{total_posts}} placeholder
      if (template.prompt_template.includes('{{total_posts}}')) {
        console.log('\n✓ Uses {{total_posts}} placeholder correctly');
      } else if (template.prompt_template.includes('list of 5')) {
        console.log('\n✗ Has hardcoded "5" instead of {{total_posts}} placeholder');
      } else {
        console.log('\n⚠️  Check prompt template manually');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();

