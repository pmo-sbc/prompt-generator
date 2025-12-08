/**
 * Fix Twitter Convert Article to Twitter Thread (Paste URL) Template
 * Updates templates to use {{webpage_url}} placeholder instead of {{input_1.content}}
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

const newPromptTemplate = `Please ignore all previous instructions. Please respond only in the english language. You are a professional copywriter and would like to convert your article into an engaging Twitter thread. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Add emojis to the thread when appropriate. The character count for each thread should be between 270 to 280 characters. Please turn the following article into a Twitter thread from the URL: "{{webpage_url}}".`;

const newInputs = [
  { name: "webpage_url", type: "text", label: "Webpage URL", placeholder: "Enter URL", required: true }
];

async function fixTwitterThreadURLTemplate() {
  try {
    console.log('Fixing Twitter Convert Article to Twitter Thread (Paste URL) Template...\n');
    
    // Get all "Paste URL" templates
    const current = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Convert Article to Twitter Thread (Paste URL)' ORDER BY id DESC"
    );
    
    if (current.rows.length === 0) {
      console.error('❌ Twitter Convert Article to Twitter Thread (Paste URL) template not found!');
      process.exit(1);
    }
    
    console.log(`Found ${current.rows.length} template(s) to update:\n`);
    
    // Update all templates
    for (const template of current.rows) {
      console.log(`Updating template ID ${template.id}...`);
      
      // Check if it needs updating
      const usesInput1Content = template.prompt_template.includes('{{input_1.content}}');
      const usesWebpageUrl = template.prompt_template.includes('{{webpage_url}}');
      
      if (usesWebpageUrl && !usesInput1Content) {
        console.log(`  Template ID ${template.id} already uses {{webpage_url}} - updating for consistency`);
      } else if (usesInput1Content) {
        console.log(`  Template ID ${template.id} uses {{input_1.content}} - fixing to use {{webpage_url}}`);
      }
      
      // Replace {{input_1.content}} with {{webpage_url}}
      let updatedPrompt = template.prompt_template.replace(/{{input_1\.content}}/g, '{{webpage_url}}');
      
      // Also update the prompt to mention it's from a URL
      if (!updatedPrompt.includes('from the URL')) {
        updatedPrompt = updatedPrompt.replace(
          /Please turn the following article into a Twitter thread:\s*"{{webpage_url}}"/gi,
          'Please turn the following article into a Twitter thread from the URL: "{{webpage_url}}"'
        );
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
        console.log(`  Prompt now uses: {{webpage_url}} placeholder`);
        console.log(`  Replaced: {{input_1.content}} with {{webpage_url}}\n`);
      } else {
        console.log(`✗ Failed to update template ID ${template.id}\n`);
      }
    }
    
    console.log('========================================');
    console.log('✓ All Twitter Thread (Paste URL) Templates Updated!');
    console.log('========================================\n');
    
    console.log('✅ All templates now use:');
    console.log('   - {{webpage_url}} for "Webpage URL"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTwitterThreadURLTemplate();

