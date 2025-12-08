/**
 * Fix Facebook Group Post Template in Database
 * Updates all Facebook Group Post templates to use {{total_posts}} placeholder
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

const newPromptTemplate = `Please ignore all previous instructions. Please respond only in the english language. You are an expert Facebook marketer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Give me a list of {{total_posts}} interesting and engaging questions to post on my Facebook Group about "{{topic}}".`;

const newInputs = [
  { name: "topic", type: "text", label: "Topic", placeholder: "Enter your topic", required: true },
  { name: "total_posts", type: "number", label: "Total Posts", placeholder: "5", required: true, default: "5" }
];

async function fixFacebookTemplate() {
  try {
    console.log('Fixing Facebook Group Post Template...\n');
    
    // Get all Facebook Group Post templates
    const current = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Facebook Group Post' ORDER BY id DESC"
    );
    
    if (current.rows.length === 0) {
      console.error('❌ Facebook Group Post template not found!');
      process.exit(1);
    }
    
    console.log(`Found ${current.rows.length} template(s) to update:\n`);
    
    // Update all templates
    for (const template of current.rows) {
      console.log(`Updating template ID ${template.id}...`);
      
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
        console.log(`  Prompt now uses: {{total_posts}} placeholder`);
        console.log(`  Inputs configured with default: 5\n`);
      } else {
        console.log(`✗ Failed to update template ID ${template.id}\n`);
      }
    }
    
    console.log('========================================');
    console.log('✓ All Facebook Group Post Templates Updated!');
    console.log('========================================\n');
    
    console.log('✅ All templates now use:');
    console.log('   - {{topic}} for "Topic"');
    console.log('   - {{total_posts}} for "Total Posts" (default: 5)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixFacebookTemplate();

