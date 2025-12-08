/**
 * Check VSL Template in Database
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
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Create Video Sales Letter (VSL)' ORDER BY id DESC LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      console.log('Template not found');
      process.exit(1);
    }
    
    const template = result.rows[0];
    console.log('Template ID:', template.id);
    console.log('\n=== PROMPT TEMPLATE ===');
    console.log(template.prompt_template);
    console.log('\n=== INPUTS ===');
    console.log(JSON.stringify(template.inputs, null, 2));
    
    // Check for CTA placeholder
    if (template.prompt_template.includes('{{cta}}')) {
      console.log('\n✓ CTA placeholder {{cta}} found in prompt');
    } else {
      console.log('\n✗ CTA placeholder {{cta}} NOT found in prompt');
    }
    
    // Check what text comes after "ask the viewer"
    const askViewerMatch = template.prompt_template.match(/ask the viewer\s+(.+?)(?:\.|$)/i);
    if (askViewerMatch) {
      console.log('\nText after "ask the viewer":', askViewerMatch[1]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();

