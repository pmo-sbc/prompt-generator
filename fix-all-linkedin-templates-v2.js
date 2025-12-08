/**
 * Fix All LinkedIn Templates - Comprehensive Version
 * Updates all LinkedIn templates to include number field placeholders
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

async function fixLinkedInTemplates() {
  try {
    console.log('Fixing All LinkedIn Templates...\n');
    
    // Get all LinkedIn templates
    const result = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%linkedin%' ORDER BY name, id DESC"
    );
    
    if (result.rows.length === 0) {
      console.error('❌ No LinkedIn templates found!');
      process.exit(1);
    }
    
    console.log(`Found ${result.rows.length} LinkedIn template(s)\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const template of result.rows) {
      const templateName = template.name;
      let updatedPrompt = template.prompt_template;
      let needsUpdate = false;
      
      // Check number inputs
      const numberInputs = template.inputs.filter(inp => inp.type === 'number');
      const textInputs = template.inputs.filter(inp => inp.type === 'text');
      
      // Apply fixes based on template name
      if (templateName === 'LinkedIn Ad Generator') {
        // Fix: Replace "10" with {{length}} for headlines
        if (updatedPrompt.includes('Generate 10 compelling LinkedIn ad headlines')) {
          updatedPrompt = updatedPrompt.replace(/Generate 10 compelling LinkedIn ad headlines/gi, 'Generate {{length}} compelling LinkedIn ad headlines');
          needsUpdate = true;
        }
        // Fix: Replace "10" with {{length}} for descriptions
        if (updatedPrompt.includes('generate 10 compelling LinkedIn ad descriptions')) {
          updatedPrompt = updatedPrompt.replace(/generate 10 compelling LinkedIn ad descriptions/gi, 'generate {{length}} compelling LinkedIn ad descriptions');
          needsUpdate = true;
        }
      } else if (templateName === 'LinkedIn Bio Generator') {
        // Fix: Replace "300 characters long" with {{length}} characters long
        if (updatedPrompt.includes('300 characters long')) {
          updatedPrompt = updatedPrompt.replace(/300 characters long/gi, '{{length}} characters long');
          needsUpdate = true;
        }
      } else if (templateName === 'LinkedIn Comment Generator') {
        // Fix: Replace "3 appreciative comments" with {{length}} {{comment_type}} comments
        if (updatedPrompt.includes('create 3 appreciative comments')) {
          updatedPrompt = updatedPrompt.replace(/create 3 appreciative comments/gi, 'create {{length}} {{comment_type}} comments');
          needsUpdate = true;
        }
      } else if (templateName === 'LinkedIn Hashtag Generator') {
        // Fix: Replace "10 high performing hashtags" with {{total}} high performing hashtags
        if (updatedPrompt.includes('generate 10 high performing hashtags')) {
          updatedPrompt = updatedPrompt.replace(/generate 10 high performing hashtags/gi, 'generate {{total}} high performing hashtags');
          needsUpdate = true;
        }
      } else if (templateName === 'LinkedIn Post Calendar') {
        // Fix: Replace "3 months" with {{total_months}} months
        if (updatedPrompt.includes('for 3 months')) {
          updatedPrompt = updatedPrompt.replace(/for 3 months/gi, 'for {{total_months}} months');
          needsUpdate = true;
        }
        // Fix: Replace "3 LinkedIn posts scheduled each week" with {{posts_per_week}} LinkedIn posts scheduled each week
        if (updatedPrompt.includes('3 LinkedIn posts scheduled each week')) {
          updatedPrompt = updatedPrompt.replace(/3 LinkedIn posts scheduled each week/gi, '{{posts_per_week}} LinkedIn posts scheduled each week');
          needsUpdate = true;
        }
      } else if (templateName === 'LinkedIn Post Creator') {
        // Fix: Replace "390 - 400 words long" with {{post_length}} words long
        if (updatedPrompt.includes('between 390 - 400 words long')) {
          updatedPrompt = updatedPrompt.replace(/between 390 - 400 words long/gi, 'between {{post_length}} words long');
          needsUpdate = true;
        }
      } else if (templateName === 'LinkedIn Connection Message') {
        // Fix: Replace "290 to 300 characters" with {{length}} characters
        if (updatedPrompt.includes('between 290 to 300 characters')) {
          updatedPrompt = updatedPrompt.replace(/between 290 to 300 characters/gi, 'between {{length}} characters');
          needsUpdate = true;
        }
      }
      
      // Check if all number inputs have placeholders
      const hasAllPlaceholders = numberInputs.every(inp => 
        updatedPrompt.includes(`{{${inp.name}}}`)
      );
      
      // Check text inputs that should be placeholders (like comment_type, post_length)
      const textInputsWithDefaults = textInputs.filter(inp => inp.default && inp.name !== 'length');
      const hasAllTextPlaceholders = textInputsWithDefaults.every(inp =>
        updatedPrompt.includes(`{{${inp.name}}}`)
      );
      
      if (hasAllPlaceholders && hasAllTextPlaceholders && !needsUpdate) {
        console.log(`✓ ${templateName} (ID: ${template.id}) - Already correct`);
        skippedCount++;
        continue;
      }
      
      if (needsUpdate) {
        console.log(`\nUpdating ${templateName} (ID: ${template.id})...`);
        
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
          
          // Show what placeholders are now used
          const allInputs = [...numberInputs, ...textInputsWithDefaults];
          if (allInputs.length > 0) {
            const usedPlaceholders = allInputs
              .filter(inp => updatedPrompt.includes(`{{${inp.name}}}`))
              .map(inp => `{{${inp.name}}}`);
            if (usedPlaceholders.length > 0) {
              console.log(`  Now using placeholders: ${usedPlaceholders.join(', ')}`);
            }
          }
          
          fixedCount++;
        } else {
          console.log(`✗ Failed to update`);
        }
      } else {
        console.log(`⚠️  ${templateName} (ID: ${template.id}) - Needs manual fix`);
        skippedCount++;
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    console.log(`✓ Fixed: ${fixedCount} template(s)`);
    console.log(`✓ Skipped (already correct): ${skippedCount} template(s)`);
    console.log(`✓ Total processed: ${result.rows.length} template(s)\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixLinkedInTemplates();

