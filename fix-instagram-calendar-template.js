/**
 * Fix Instagram Post Calendar Template in Database
 * Updates all Instagram Post Calendar templates to use {{total_months}} and {{articles_per_week}} placeholders
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

const newPromptTemplate = `Please ignore all previous instructions. Please respond only in the english language. You are an Instagrammer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Please create an Instagram Calendar for {{total_months}} months based on your interests "{{topic}}". There should be {{articles_per_week}} Instagram posts scheduled each week of the month. Every Instagram post should have a catchy description. Include emojis and the Instagram hashtags in the description. Try to use unique emojis in the description. The description should have a hook and entice the readers. The table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, Post Idea, description, caption without hashtags, hashtags. Please organize each Instagram post in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`;

const newInputs = [
  { name: "topic", type: "text", label: "Topic", placeholder: "Enter topic", required: true },
  { name: "articles_per_week", type: "number", label: "Articles per week", placeholder: "3", required: true, default: "3" },
  { name: "total_months", type: "number", label: "Total months", placeholder: "3", required: true, default: "3" }
];

async function fixInstagramCalendarTemplate() {
  try {
    console.log('Fixing Instagram Post Calendar Template...\n');
    
    // Get all Instagram Post Calendar templates
    const current = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Instagram Post Calendar' ORDER BY id DESC"
    );
    
    if (current.rows.length === 0) {
      console.error('❌ Instagram Post Calendar template not found!');
      process.exit(1);
    }
    
    console.log(`Found ${current.rows.length} template(s) to update:\n`);
    
    // Update all templates
    for (const template of current.rows) {
      console.log(`Updating template ID ${template.id}...`);
      
      // Check if it needs updating
      const hasTotalMonths = template.prompt_template.includes('{{total_months}}');
      const hasArticlesPerWeek = template.prompt_template.includes('{{articles_per_week}}');
      const hasHardcoded3 = template.prompt_template.includes('3 months') || template.prompt_template.includes('3 Instagram posts');
      
      if (hasTotalMonths && hasArticlesPerWeek && !hasHardcoded3) {
        console.log(`  Template ID ${template.id} already uses correct placeholders - updating for consistency`);
      } else {
        console.log(`  Template ID ${template.id} has hardcoded values - fixing to use placeholders`);
        if (hasHardcoded3) {
          console.log(`    Found hardcoded "3 months" or "3 posts"`);
        }
        if (!hasTotalMonths) {
          console.log(`    Missing {{total_months}} placeholder`);
        }
        if (!hasArticlesPerWeek) {
          console.log(`    Missing {{articles_per_week}} placeholder`);
        }
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
        console.log(`  Prompt now uses: {{total_months}} and {{articles_per_week}} placeholders`);
        console.log(`  Inputs configured with defaults: 3 months, 3 articles per week\n`);
      } else {
        console.log(`✗ Failed to update template ID ${template.id}\n`);
      }
    }
    
    console.log('========================================');
    console.log('✓ All Instagram Post Calendar Templates Updated!');
    console.log('========================================\n');
    
    console.log('✅ All templates now use:');
    console.log('   - {{topic}} for "Topic"');
    console.log('   - {{total_months}} for "Total months" (default: 3)');
    console.log('   - {{articles_per_week}} for "Articles per week" (default: 3)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixInstagramCalendarTemplate();

