/**
 * Fix All LinkedIn Templates
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

// Template fixes configuration
const templateFixes = {
  'LinkedIn Ad Generator': {
    oldPattern: /Generate (\d+) compelling LinkedIn ad headlines/gi,
    newText: 'Generate {{length}} compelling LinkedIn ad headlines',
    // Also need to update descriptions count
    oldPattern2: /generate (\d+) compelling LinkedIn ad descriptions/gi,
    newText2: 'generate {{length}} compelling LinkedIn ad descriptions'
  },
  'LinkedIn Bio Generator': {
    oldPattern: /(\d+) characters long/gi,
    newText: '{{length}} characters long'
  },
  'LinkedIn Comment Generator': {
    oldPattern: /create (\d+) (appreciative|appreciative) comments/gi,
    newText: 'create {{length}} {{comment_type}} comments'
  },
  'LinkedIn Hashtag Generator': {
    oldPattern: /generate (\d+) high performing hashtags/gi,
    newText: 'generate {{total}} high performing hashtags'
  },
  'LinkedIn Post Calendar': {
    oldPattern: /for (\d+) months/gi,
    newText: 'for {{total_months}} months',
    oldPattern2: /(\d+) LinkedIn posts scheduled each week/gi,
    newText2: '{{posts_per_week}} LinkedIn posts scheduled each week'
  },
  'LinkedIn Post Creator': {
    oldPattern: /between 390 - 400 words long/gi,
    newText: 'between {{post_length}} words long'
  },
  'LinkedIn Connection Message': {
    oldPattern: /between 290 to 300 characters/gi,
    newText: 'between {{length}} characters'
  }
};

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
      const fixConfig = templateFixes[templateName];
      
      if (!fixConfig) {
        console.log(`⚠️  No fix configuration for: ${templateName} (ID: ${template.id})`);
        skippedCount++;
        continue;
      }
      
      let updatedPrompt = template.prompt_template;
      let needsUpdate = false;
      
      // Apply fixes based on template type
      if (templateName === 'LinkedIn Ad Generator') {
        // Replace headline count
        if (fixConfig.oldPattern.test(updatedPrompt)) {
          updatedPrompt = updatedPrompt.replace(fixConfig.oldPattern, fixConfig.newText);
          needsUpdate = true;
        }
        // Replace description count
        if (fixConfig.oldPattern2 && fixConfig.oldPattern2.test(updatedPrompt)) {
          updatedPrompt = updatedPrompt.replace(fixConfig.oldPattern2, fixConfig.newText2);
          needsUpdate = true;
        }
      } else if (templateName === 'LinkedIn Post Calendar') {
        // Replace months
        if (fixConfig.oldPattern.test(updatedPrompt)) {
          updatedPrompt = updatedPrompt.replace(fixConfig.oldPattern, fixConfig.newText);
          needsUpdate = true;
        }
        // Replace posts per week
        if (fixConfig.oldPattern2 && fixConfig.oldPattern2.test(updatedPrompt)) {
          updatedPrompt = updatedPrompt.replace(fixConfig.oldPattern2, fixConfig.newText2);
          needsUpdate = true;
        }
      } else {
        // Single pattern replacement
        if (fixConfig.oldPattern.test(updatedPrompt)) {
          updatedPrompt = updatedPrompt.replace(fixConfig.oldPattern, fixConfig.newText);
          needsUpdate = true;
        }
      }
      
      // Check if we need to update
      if (!needsUpdate && updatedPrompt === template.prompt_template) {
        // Check if placeholders already exist
        const numberInputs = template.inputs.filter(inp => inp.type === 'number');
        const hasAllPlaceholders = numberInputs.every(inp => 
          updatedPrompt.includes(`{{${inp.name}}}`)
        );
        
        if (hasAllPlaceholders) {
          console.log(`✓ ${templateName} (ID: ${template.id}) - Already correct`);
          skippedCount++;
          continue;
        }
      }
      
      if (needsUpdate || updatedPrompt !== template.prompt_template) {
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
          
          // Show what changed
          const numberInputs = template.inputs.filter(inp => inp.type === 'number');
          if (numberInputs.length > 0) {
            console.log(`  Now using placeholders: ${numberInputs.map(inp => `{{${inp.name}}}`).join(', ')}`);
          }
          
          fixedCount++;
        } else {
          console.log(`✗ Failed to update`);
        }
      } else {
        console.log(`✓ ${templateName} (ID: ${template.id}) - No changes needed`);
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

