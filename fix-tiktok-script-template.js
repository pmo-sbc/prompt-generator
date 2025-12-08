/**
 * Fix TikTok Script Writer Template
 * Updates all TikTok Script Writer templates to use {{length}} placeholder
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

const newPromptTemplate = `Please ignore all previous instructions. Please respond only in the english language. You are a TikTok marketer and influencer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please write me a TikTok video script for the topic "{{topic}}". The target audience is "{{audience}}". The length of the video should be {{length}} long. The script needs to have a catchy title, follow the best practice of TikTok videos, and get as much traction from the target audience as possible.`;

const newInputs = [
  { name: "topic", type: "text", label: "Topic", placeholder: "Enter topic", required: true },
  { name: "audience", type: "text", label: "Audience", placeholder: "Enter target audience", required: true },
  { name: "length", type: "text", label: "Length", placeholder: "90 seconds", required: true, default: "90 seconds" }
];

async function fixTikTokScriptTemplate() {
  try {
    console.log('Fixing TikTok Script Writer Template...\n');
    
    // Get all TikTok Script Writer templates
    const current = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'TikTok Script Writer' ORDER BY id DESC"
    );
    
    if (current.rows.length === 0) {
      console.error('❌ TikTok Script Writer template not found!');
      process.exit(1);
    }
    
    console.log(`Found ${current.rows.length} template(s) to update:\n`);
    
    // Update all templates
    for (const template of current.rows) {
      console.log(`Updating template ID ${template.id}...`);
      
      // Check if it needs updating
      const hasLengthPlaceholder = template.prompt_template.includes('{{length}}');
      const hasHardcoded90 = template.prompt_template.includes('less than 90 seconds');
      
      if (hasLengthPlaceholder && !hasHardcoded90) {
        console.log(`  Template ID ${template.id} already uses {{length}} placeholder - updating for consistency`);
      } else {
        console.log(`  Template ID ${template.id} has hardcoded "90 seconds" - fixing to use {{length}}`);
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
        console.log(`  Prompt now uses: {{length}} placeholder`);
        console.log(`  Inputs configured with default: "90 seconds"\n`);
      } else {
        console.log(`✗ Failed to update template ID ${template.id}\n`);
      }
    }
    
    console.log('========================================');
    console.log('✓ All TikTok Script Writer Templates Updated!');
    console.log('========================================\n');
    
    console.log('✅ All templates now use:');
    console.log('   - {{topic}} for "Topic"');
    console.log('   - {{audience}} for "Audience"');
    console.log('   - {{length}} for "Length" (default: "90 seconds")');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTikTokScriptTemplate();

