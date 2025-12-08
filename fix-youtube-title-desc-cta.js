/**
 * Fix YouTube Title & Descriptions Template to use call_to_action placeholder
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
    // Find all YouTube Title & Descriptions templates
    const result = await pool.query(
      "SELECT id, name, prompt_template FROM templates WHERE name = 'YouTube Title & Descriptions'"
    );
    
    if (result.rows.length === 0) {
      console.log('No YouTube Title & Descriptions templates found.');
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} template(s) to fix.\n`);
    
    for (const template of result.rows) {
      let updatedPrompt = template.prompt_template;
      
      // Replace hardcoded "click the subscribe button" with {{call_to_action}}
      // Check if it's already fixed
      if (updatedPrompt.includes('{{call_to_action}}')) {
        console.log(`Template ID ${template.id} already has {{call_to_action}} placeholder.`);
        continue;
      }
      
      // Replace various forms of the hardcoded text
      updatedPrompt = updatedPrompt.replace(
        /ask the viewer to click the subscribe button/gi,
        'ask the viewer {{call_to_action}}'
      );
      
      updatedPrompt = updatedPrompt.replace(
        /ask the viewer click the subscribe button/gi,
        'ask the viewer {{call_to_action}}'
      );
      
      updatedPrompt = updatedPrompt.replace(
        /The description should also ask the viewer to click the subscribe button/gi,
        'The description should also ask the viewer {{call_to_action}}'
      );
      
      if (updatedPrompt !== template.prompt_template) {
        await pool.query(
          'UPDATE templates SET prompt_template = $1 WHERE id = $2',
          [updatedPrompt, template.id]
        );
        console.log(`✓ Fixed template ID ${template.id}`);
        console.log(`  Changed: "ask the viewer to click the subscribe button"`);
        console.log(`  To: "ask the viewer {{call_to_action}}"`);
      } else {
        console.log(`⚠ Template ID ${template.id} - No changes made. Pattern not found.`);
      }
    }
    
    console.log('\n✅ All templates fixed!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

