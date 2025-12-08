/**
 * Fix Remaining Social Media Templates - Final Version
 * Uses exact patterns found in the prompts
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

async function fixRemainingTemplates() {
  try {
    console.log('Fixing Remaining Social Media Templates...\n');
    
    const templateIds = [136, 95, 135, 94, 134, 93, 139, 98, 195, 154, 113, 196, 155, 114, 156, 115];
    const result = await pool.query(
      `SELECT id, name, prompt_template, inputs 
       FROM templates 
       WHERE id = ANY($1::int[])
       ORDER BY id`,
      [templateIds]
    );
    
    let fixedCount = 0;
    
    for (const template of result.rows) {
      let updatedPrompt = template.prompt_template;
      const originalPrompt = updatedPrompt;
      
      // Apply specific fixes based on template name and patterns
      if (template.name.includes('Generate Pin Descriptions')) {
        // "write 3 Pinterest description" -> "write {{total_desc}} Pinterest description"
        updatedPrompt = updatedPrompt.replace(/write\s+3\s+Pinterest\s+description/gi, 'write {{total_desc}} Pinterest description');
      } else if (template.name.includes('Generate Pin Titles')) {
        // "provide me with 10 engaging Pinterest pin titles" -> "provide me with {{total_titles}} engaging Pinterest pin titles"
        updatedPrompt = updatedPrompt.replace(/provide\s+me\s+with\s+10\s+engaging\s+Pinterest\s+pin\s+titles/gi, 'provide me with {{total_titles}} engaging Pinterest pin titles');
      } else if (template.name.includes('Keywords For Pinterest')) {
        // "provide me with 50 high performing SEO keywords" -> "provide me with {{total_keywords}} high performing SEO keywords"
        updatedPrompt = updatedPrompt.replace(/provide\s+me\s+with\s+50\s+high\s+performing\s+SEO\s+keywords/gi, 'provide me with {{total_keywords}} high performing SEO keywords');
      } else if (template.name.includes('TikTok Video Ideas')) {
        // "generate 10 TikTok video ideas" -> "generate {{total_ideas}} TikTok video ideas"
        updatedPrompt = updatedPrompt.replace(/generate\s+10\s+TikTok\s+video\s+ideas/gi, 'generate {{total_ideas}} TikTok video ideas');
      } else if (template.name.includes('YouTube Ads Generator')) {
        // "Generate 10 compelling YouTube headlines and 10 compelling descriptions" 
        // -> "Generate {{total_headlines}} compelling YouTube headlines and {{total_headlines}} compelling descriptions"
        updatedPrompt = updatedPrompt.replace(/Generate\s+10\s+compelling\s+YouTube\s+headlines\s+and\s+10\s+compelling\s+descriptions/gi, 'Generate {{total_headlines}} compelling YouTube headlines and {{total_headlines}} compelling descriptions');
        // Also handle "Generate 10 compelling YouTube headlines" alone
        updatedPrompt = updatedPrompt.replace(/Generate\s+10\s+compelling\s+YouTube\s+headlines/gi, 'Generate {{total_headlines}} compelling YouTube headlines');
      } else if (template.name.includes('YouTube Tags Generator')) {
        // "generate 10 comma separated keyword" -> "generate {{total_tags}} comma separated keyword"
        updatedPrompt = updatedPrompt.replace(/generate\s+10\s+comma\s+separated\s+keyword/gi, 'generate {{total_tags}} comma separated keyword');
      }
      
      if (updatedPrompt !== originalPrompt) {
        console.log(`\nUpdating ${template.name} (ID: ${template.id})...`);
        
        const updateResult = await pool.query(
          `UPDATE templates 
           SET prompt_template = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING id, name`,
          [updatedPrompt, template.id]
        );
        
        if (updateResult.rows.length > 0) {
          console.log(`✓ Updated successfully`);
          
          // Show what changed
          const numberInputs = template.inputs.filter(inp => inp.type === 'number');
          const usedPlaceholders = numberInputs
            .filter(inp => updatedPrompt.includes(`{{${inp.name}}}`))
            .map(inp => `{{${inp.name}}}`);
          if (usedPlaceholders.length > 0) {
            console.log(`  Now using: ${usedPlaceholders.join(', ')}`);
          }
          
          fixedCount++;
        }
      } else {
        console.log(`⚠️  ${template.name} (ID: ${template.id}) - No changes made, pattern not found`);
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    console.log(`✓ Fixed: ${fixedCount} template(s)\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixRemainingTemplates();

