/**
 * Fix All Social Media Templates
 * Updates all social media templates to include number field placeholders
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

async function fixTemplate(templateId, templateName, prompt, inputs) {
  let updatedPrompt = prompt;
  let needsUpdate = false;
  
  // Get number inputs
  const numberInputs = inputs.filter(inp => inp.type === 'number');
  
  // Apply fixes based on template name patterns
  const fixes = [
    // Facebook Post Ideas - "Generate 5 ideas" -> "Generate {{total_posts}} ideas"
    {
      pattern: /Generate\s+(\d+)\s+ideas\s+for\s+Facebook\s+posts/gi,
      replacement: (match, num) => match.replace(num, '{{total_posts}}'),
      name: 'Facebook Post Ideas',
      field: 'total_posts'
    },
    
    // Facebook Post Calendar - "3 months" and "5 threads"
    {
      pattern: /for\s+(\d+)\s+months/gi,
      replacement: (match, num) => match.replace(num, '{{total_months}}'),
      name: 'Facebook Post Calendar',
      field: 'total_months'
    },
    {
      pattern: /(\d+)\s+(Facebook\s+posts?|threads?)\s+(scheduled\s+)?each\s+week/gi,
      replacement: (match, num) => match.replace(num, '{{threads_per_week}}'),
      name: 'Facebook Post Calendar',
      field: 'threads_per_week'
    },
    
    // Pinterest - Generate Pin Descriptions
    {
      pattern: /generate\s+(\d+)\s+(pin\s+)?descriptions?/gi,
      replacement: (match, num) => match.replace(num, '{{total_desc}}'),
      name: 'Generate Pin Descriptions',
      field: 'total_desc'
    },
    
    // Pinterest - Generate Pin Titles
    {
      pattern: /generate\s+(\d+)\s+(pin\s+)?titles?/gi,
      replacement: (match, num) => match.replace(num, '{{total_titles}}'),
      name: 'Generate Pin Titles',
      field: 'total_titles'
    },
    
    // Pinterest - Keywords
    {
      pattern: /generate\s+(\d+)\s+keywords?/gi,
      replacement: (match, num) => match.replace(num, '{{total_keywords}}'),
      name: 'Keywords For Pinterest',
      field: 'total_keywords'
    },
    
    // Pinterest - Hashtag Generator
    {
      pattern: /generate\s+(\d+)\s+popular\s+hashtags?/gi,
      replacement: (match, num) => match.replace(num, '{{total_hashtags}}'),
      name: 'Pinterest Hashtag Generator',
      field: 'total_hashtags'
    },
    
    // Pinterest Calendar
    {
      pattern: /for\s+(\d+)\s+months/gi,
      replacement: (match, num) => match.replace(num, '{{total_months}}'),
      name: 'Pinterest Pin Calendar',
      field: 'total_months'
    },
    {
      pattern: /(\d+)\s+(pins?|threads?)\s+(scheduled\s+)?each\s+week/gi,
      replacement: (match, num) => match.replace(num, '{{threads_per_week}}'),
      name: 'Pinterest Pin Calendar',
      field: 'threads_per_week'
    },
    
    // TikTok Hashtag Generator
    {
      pattern: /generate\s+(\d+)\s+trending\s+hashtags?/gi,
      replacement: (match, num) => match.replace(num, '{{total_hashtags}}'),
      name: 'TikTok Hashtag Generator',
      field: 'total_hashtags'
    },
    
    // TikTok Video Ideas
    {
      pattern: /generate\s+(\d+)\s+(video\s+)?ideas?/gi,
      replacement: (match, num) => match.replace(num, '{{total_ideas}}'),
      name: 'TikTok Video Ideas',
      field: 'total_ideas'
    },
    
    // TikTok Calendar
    {
      pattern: /for\s+(\d+)\s+months/gi,
      replacement: (match, num) => match.replace(num, '{{total_months}}'),
      name: 'TikTok Post Calendar',
      field: 'total_months'
    },
    {
      pattern: /(\d+)\s+(TikTok\s+posts?|threads?)\s+(scheduled\s+)?each\s+week/gi,
      replacement: (match, num) => match.replace(num, '{{threads_per_week}}'),
      name: 'TikTok Post Calendar',
      field: 'threads_per_week'
    },
    
    // Twitter Hashtag Generator
    {
      pattern: /generate\s+(\d+)\s+high\s+performing\s+hashtags?/gi,
      replacement: (match, num) => match.replace(num, '{{total_hashtags}}'),
      name: 'Twitter Hashtag Generator',
      field: 'total_hashtags'
    },
    
    // Twitter Calendar
    {
      pattern: /for\s+(\d+)\s+months/gi,
      replacement: (match, num) => match.replace(num, '{{total_months}}'),
      name: 'Twitter Thread Calendar',
      field: 'total_months'
    },
    {
      pattern: /(\d+)\s+(Twitter\s+threads?|posts?)\s+(scheduled\s+)?each\s+week/gi,
      replacement: (match, num) => match.replace(num, '{{threads_per_week}}'),
      name: 'Twitter Thread Calendar',
      field: 'threads_per_week'
    },
    
    // YouTube Ads Generator
    {
      pattern: /generate\s+(\d+)\s+compelling\s+(YouTube\s+)?ad\s+headlines?/gi,
      replacement: (match, num) => match.replace(num, '{{total_headlines}}'),
      name: 'YouTube Ads Generator',
      field: 'total_headlines'
    },
    
    // YouTube Tags Generator
    {
      pattern: /generate\s+(\d+)\s+(YouTube\s+)?tags?/gi,
      replacement: (match, num) => match.replace(num, '{{total_tags}}'),
      name: 'YouTube Tags Generator',
      field: 'total_tags'
    },
    
    // YouTube Video Calendar
    {
      pattern: /for\s+(\d+)\s+months/gi,
      replacement: (match, num) => match.replace(num, '{{total_months}}'),
      name: 'YouTube Video Calendar',
      field: 'total_months'
    },
    {
      pattern: /(\d+)\s+(YouTube\s+)?videos?\s+(scheduled\s+)?each\s+week/gi,
      replacement: (match, num) => match.replace(num, '{{videos_per_week}}'),
      name: 'YouTube Video Calendar',
      field: 'videos_per_week'
    }
  ];
  
  // Apply applicable fixes
  for (const fix of fixes) {
    if (templateName.includes(fix.name) || templateName === fix.name) {
      if (fix.pattern.test(updatedPrompt)) {
        updatedPrompt = updatedPrompt.replace(fix.pattern, fix.replacement);
        needsUpdate = true;
      }
    }
  }
  
  // Also check for generic patterns if specific fixes didn't work
  numberInputs.forEach(inp => {
    if (!updatedPrompt.includes(`{{${inp.name}}}`)) {
      // Try to find hardcoded numbers that match the default value
      const defaultVal = inp.default || '';
      if (defaultVal && updatedPrompt.includes(defaultVal)) {
        // Replace first occurrence of the default value with placeholder
        // But be careful - only if it's in context that makes sense
        const contextPattern = new RegExp(`\\b${defaultVal}\\b(\\s+(posts?|ideas?|hashtags?|tags?|titles?|descriptions?|keywords?|months?|weeks?|threads?|videos?|headlines?))`, 'gi');
        if (contextPattern.test(updatedPrompt)) {
          updatedPrompt = updatedPrompt.replace(contextPattern, `{{${inp.name}}}$1`);
          needsUpdate = true;
        }
      }
    }
  });
  
  return { updatedPrompt, needsUpdate };
}

async function fixAllSocialMediaTemplates() {
  try {
    console.log('Fixing All Social Media Templates...\n');
    
    // Get all social media templates
    const result = await pool.query(
      `SELECT id, name, prompt_template, inputs 
       FROM templates 
       WHERE category = 'Social Media' 
       ORDER BY subcategory, name, id DESC`
    );
    
    if (result.rows.length === 0) {
      console.error('❌ No social media templates found!');
      process.exit(1);
    }
    
    console.log(`Found ${result.rows.length} social media template(s)\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const template of result.rows) {
      const templateName = template.name;
      const numberInputs = template.inputs.filter(inp => inp.type === 'number');
      
      // Check if already correct
      const placeholders = template.prompt_template.match(/\{\{([^}]+)\}\}/g) || [];
      const placeholderNames = placeholders.map(p => p.replace(/\{\{|\}\}/g, '').trim());
      const hasAllPlaceholders = numberInputs.every(inp => placeholderNames.includes(inp.name));
      
      if (hasAllPlaceholders && numberInputs.length > 0) {
        console.log(`✓ ${templateName} (ID: ${template.id}) - Already correct`);
        skippedCount++;
        continue;
      }
      
      if (numberInputs.length === 0) {
        skippedCount++;
        continue;
      }
      
      // Try to fix
      const { updatedPrompt, needsUpdate } = await fixTemplate(
        template.id,
        templateName,
        template.prompt_template,
        template.inputs
      );
      
      if (needsUpdate && updatedPrompt !== template.prompt_template) {
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
          const usedPlaceholders = numberInputs
            .filter(inp => updatedPrompt.includes(`{{${inp.name}}}`))
            .map(inp => `{{${inp.name}}}`);
          if (usedPlaceholders.length > 0) {
            console.log(`  Now using: ${usedPlaceholders.join(', ')}`);
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
    console.log(`✓ Skipped: ${skippedCount} template(s)`);
    console.log(`✓ Total processed: ${result.rows.length} template(s)\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAllSocialMediaTemplates();

