/**
 * Fix Remaining Social Media Templates
 * Handles templates that need more specific pattern matching
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

// Specific fixes for templates that need exact pattern matching
const specificFixes = {
  // Pinterest - Generate Pin Descriptions
  136: { pattern: /generate 3 pin descriptions/gi, replacement: 'generate {{total_desc}} pin descriptions' },
  95: { pattern: /generate 3 pin descriptions/gi, replacement: 'generate {{total_desc}} pin descriptions' },
  
  // Pinterest - Generate Pin Titles
  135: { pattern: /generate 10 pin titles/gi, replacement: 'generate {{total_titles}} pin titles' },
  94: { pattern: /generate 10 pin titles/gi, replacement: 'generate {{total_titles}} pin titles' },
  
  // Pinterest - Keywords
  134: { pattern: /generate 50 keywords/gi, replacement: 'generate {{total_keywords}} keywords' },
  93: { pattern: /generate 50 keywords/gi, replacement: 'generate {{total_keywords}} keywords' },
  
  // TikTok Video Ideas
  139: { pattern: /generate 10 video ideas/gi, replacement: 'generate {{total_ideas}} video ideas' },
  98: { pattern: /generate 10 video ideas/gi, replacement: 'generate {{total_ideas}} video ideas' },
  
  // YouTube Ads Generator - need to check actual patterns
  // YouTube Tags Generator
  156: { pattern: /generate 10 tags/gi, replacement: 'generate {{total_tags}} tags' },
  115: { pattern: /generate 10 tags/gi, replacement: 'generate {{total_tags}} tags' },
};

async function fixRemainingTemplates() {
  try {
    console.log('Fixing Remaining Social Media Templates...\n');
    
    const templateIds = Object.keys(specificFixes).map(Number);
    const result = await pool.query(
      `SELECT id, name, prompt_template, inputs 
       FROM templates 
       WHERE id = ANY($1::int[])
       ORDER BY id`,
      [templateIds]
    );
    
    let fixedCount = 0;
    
    for (const template of result.rows) {
      const fix = specificFixes[template.id];
      if (!fix) continue;
      
      let updatedPrompt = template.prompt_template;
      
      // Apply specific fix
      if (fix.pattern.test(updatedPrompt)) {
        updatedPrompt = updatedPrompt.replace(fix.pattern, fix.replacement);
        
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
          fixedCount++;
        }
      } else {
        console.log(`\n⚠️  ${template.name} (ID: ${template.id}) - Pattern not found, checking manually...`);
        
        // Try generic replacement based on input field
        const numberInputs = template.inputs.filter(inp => inp.type === 'number');
        numberInputs.forEach(inp => {
          const defaultVal = inp.default;
          if (defaultVal) {
            // Look for the default value in various contexts
            const patterns = [
              new RegExp(`\\b${defaultVal}\\s+(pin\\s+descriptions?|descriptions?)`, 'gi'),
              new RegExp(`\\b${defaultVal}\\s+(pin\\s+titles?|titles?)`, 'gi'),
              new RegExp(`\\b${defaultVal}\\s+keywords?`, 'gi'),
              new RegExp(`\\b${defaultVal}\\s+(video\\s+)?ideas?`, 'gi'),
              new RegExp(`\\b${defaultVal}\\s+tags?`, 'gi'),
            ];
            
            patterns.forEach((pattern, idx) => {
              if (pattern.test(updatedPrompt)) {
                const replacement = pattern.source.includes('descriptions') ? `{{${inp.name}}} pin descriptions` :
                                   pattern.source.includes('titles') ? `{{${inp.name}}} pin titles` :
                                   pattern.source.includes('keywords') ? `{{${inp.name}}} keywords` :
                                   pattern.source.includes('ideas') ? `{{${inp.name}}} video ideas` :
                                   `{{${inp.name}}} tags`;
                
                updatedPrompt = updatedPrompt.replace(pattern, replacement);
                console.log(`  Applied fix for ${inp.name}`);
              }
            });
          }
        });
        
        if (updatedPrompt !== template.prompt_template) {
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
            fixedCount++;
          }
        }
      }
    }
    
    // Handle YouTube Ads Generator separately - need to check exact pattern
    const youtubeAdsIds = [195, 154, 113, 196, 155, 114];
    const youtubeAds = await pool.query(
      `SELECT id, name, prompt_template, inputs 
       FROM templates 
       WHERE id = ANY($1::int[])
       ORDER BY id`,
      [youtubeAdsIds]
    );
    
    for (const template of youtubeAds.rows) {
      let updatedPrompt = template.prompt_template;
      const numberInputs = template.inputs.filter(inp => inp.type === 'number');
      
      // YouTube Ads Generator typically has "Generate 10 compelling YouTube ad headlines"
      const headlinePattern = /Generate\s+(\d+)\s+compelling\s+YouTube\s+ad\s+headlines/gi;
      if (headlinePattern.test(updatedPrompt)) {
        updatedPrompt = updatedPrompt.replace(headlinePattern, 'Generate {{total_headlines}} compelling YouTube ad headlines');
        
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
          fixedCount++;
        }
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

