/**
 * Fix Instagram Hashtag Generator Template in Database
 * Updates all Instagram Hashtag Generator templates to use {{total}} placeholder
 */

require('dotenv').config();
const { Pool } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

const newPromptTemplate = `Please ignore all previous instructions. Please respond only in the english language. You are an Instagram influencer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total}} high performing Instagram hashtags for the following text: "{{instagram_post}}".`;

const newInputs = [
  { name: "instagram_post", type: "textarea", label: "Instagram Post", placeholder: "Enter Instagram post text", required: true },
  { name: "total", type: "number", label: "Total", placeholder: "10", required: true, default: "10" }
];

async function fixInstagramHashtagTemplate() {
  try {
    console.log('Fixing Instagram Hashtag Generator Template...\n');
    
    // Get all Instagram Hashtag Generator templates
    const current = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Instagram Hashtag Generator' ORDER BY id DESC"
    );
    
    if (current.rows.length === 0) {
      console.error('❌ Instagram Hashtag Generator template not found!');
      process.exit(1);
    }
    
    console.log(`Found ${current.rows.length} template(s) to update:\n`);
    
    // Update all templates
    for (const template of current.rows) {
      console.log(`Updating template ID ${template.id}...`);
      
      // Check if it needs updating
      if (template.prompt_template.includes('{{total}}')) {
        console.log(`  Template ID ${template.id} already uses {{total}} placeholder - updating for consistency`);
      } else {
        console.log(`  Template ID ${template.id} has hardcoded number - fixing to use {{total}}`);
      }
      
      const result = await pool.query(
        `UPDATE templates 
         SET prompt_template = $1, 
             inputs = $2::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, name, prompt_template, inputs`,
        [newPromptTemplate, JSON.stringify(newInputs), template.id]
      );
      
      if (result.rows.length > 0) {
        console.log(`✓ Template ID ${template.id} updated successfully`);
        console.log(`  Prompt now uses: {{total}} placeholder`);
        console.log(`  Inputs configured with default: 10\n`);
      } else {
        console.log(`✗ Failed to update template ID ${template.id}\n`);
      }
    }
    
    console.log('========================================');
    console.log('✓ All Instagram Hashtag Generator Templates Updated!');
    console.log('========================================\n');
    
    console.log('✅ All templates now use:');
    console.log('   - {{instagram_post}} for "Instagram Post"');
    console.log('   - {{total}} for "Total" (default: 10)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixInstagramHashtagTemplate();

