/**
 * Fix YouTube Ads Generator Template
 * Updates all YouTube Ads Generator templates to use {{headlines_length}} and {{description_length}} placeholders
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

// Different prompts for Paste Description vs Paste URL
const promptPasteDescription = `Please ignore all previous instructions. Please respond only in the english language. You are a copywriter with expertise in YouTube Ads creation. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate {{total_headlines}} compelling YouTube headlines and {{total_headlines}} compelling descriptions for a video. The headlines should be between {{headlines_length}} long. The descriptions should be between {{description_length}} long. Do not use single quotes, double quotes or any other enclosing characters. The video is about "{{video_description}}".`;

const promptPasteURL = `Please ignore all previous instructions. Please respond only in the english language. You are a copywriter with expertise in YouTube Ad creation. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate {{total_headlines}} compelling YouTube headlines and {{total_headlines}} compelling descriptions for a video. The headlines should be between {{headlines_length}} long. The descriptions should be between {{description_length}} long. Do not use single quotes, double quotes or any other enclosing characters. The video is from the URL: "{{youtube_video_url}}".`;

const inputsPasteDescription = [
  { name: "total_headlines", type: "number", label: "Total Headlines", placeholder: "10", required: true, default: "10" },
  { name: "headlines_length", type: "text", label: "Headlines Length", placeholder: "90 to 100 characters", required: true, default: "90 to 100 characters" },
  { name: "description_length", type: "text", label: "Description Length", placeholder: "30 to 35 characters", required: true, default: "30 to 35 characters" },
  { name: "video_description", type: "textarea", label: "Video Description", placeholder: "Enter video description", required: true }
];

const inputsPasteURL = [
  { name: "total_headlines", type: "number", label: "Total Headlines", placeholder: "10", required: true, default: "10" },
  { name: "headlines_length", type: "text", label: "Headlines Length", placeholder: "90 to 100 characters", required: true, default: "90 to 100 characters" },
  { name: "description_length", type: "text", label: "Description Length", placeholder: "30 to 35 characters", required: true, default: "30 to 35 characters" },
  { name: "youtube_video_url", type: "text", label: "YouTube Video URL", placeholder: "Enter YouTube URL", required: true }
];

async function fixYouTubeAdsTemplate() {
  try {
    console.log('Fixing YouTube Ads Generator Templates...\n');
    
    // Get all YouTube Ads Generator templates
    const current = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name LIKE 'YouTube Ads Generator%' ORDER BY name, id DESC"
    );
    
    if (current.rows.length === 0) {
      console.error('❌ YouTube Ads Generator templates not found!');
      process.exit(1);
    }
    
    console.log(`Found ${current.rows.length} template(s) to update:\n`);
    
    // Update all templates
    for (const template of current.rows) {
      console.log(`Updating ${template.name} (ID: ${template.id})...`);
      
      const isPasteURL = template.name.includes('Paste URL');
      const newPrompt = isPasteURL ? promptPasteURL : promptPasteDescription;
      const newInputs = isPasteURL ? inputsPasteURL : inputsPasteDescription;
      
      // Check if it needs updating
      const hasHeadlinesLength = template.prompt_template.includes('{{headlines_length}}');
      const hasDescriptionLength = template.prompt_template.includes('{{description_length}}');
      const hasHardcodedLengths = template.prompt_template.includes('90 to 100 characters') || template.prompt_template.includes('30 to 35 characters');
      
      if (hasHeadlinesLength && hasDescriptionLength && !hasHardcodedLengths) {
        console.log(`  Template ID ${template.id} already uses placeholders - updating for consistency`);
      } else {
        console.log(`  Template ID ${template.id} has hardcoded lengths - fixing to use placeholders`);
        if (hasHardcodedLengths) {
          console.log(`    Found hardcoded "90 to 100 characters" or "30 to 35 characters"`);
        }
        if (!hasHeadlinesLength) {
          console.log(`    Missing {{headlines_length}} placeholder`);
        }
        if (!hasDescriptionLength) {
          console.log(`    Missing {{description_length}} placeholder`);
        }
      }
      
      // For Paste URL templates, also check for youtube_video_url placeholder
      if (isPasteURL) {
        const hasVideoUrl = template.prompt_template.includes('{{youtube_video_url}}');
        if (!hasVideoUrl) {
          console.log(`    Missing {{youtube_video_url}} placeholder`);
        }
      }
      
      const result = await pool.query(
        `UPDATE templates 
         SET prompt_template = $1, 
             inputs = $2::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, name, prompt_template, inputs`,
        [newPrompt, JSON.stringify(newInputs), template.id]
      );
      
      if (result.rows.length > 0) {
        console.log(`✓ Template ID ${template.id} updated successfully`);
        console.log(`  Prompt now uses: {{headlines_length}} and {{description_length}} placeholders`);
        if (isPasteURL) {
          console.log(`  Also uses: {{youtube_video_url}} placeholder`);
        }
        console.log(`  Inputs configured with defaults\n`);
      } else {
        console.log(`✗ Failed to update template ID ${template.id}\n`);
      }
    }
    
    console.log('========================================');
    console.log('✓ All YouTube Ads Generator Templates Updated!');
    console.log('========================================\n');
    
    console.log('✅ All templates now use:');
    console.log('   - {{total_headlines}} for "Total Headlines"');
    console.log('   - {{headlines_length}} for "Headlines Length" (default: "90 to 100 characters")');
    console.log('   - {{description_length}} for "Description Length" (default: "30 to 35 characters")');
    console.log('   - Paste URL templates also use: {{youtube_video_url}}');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixYouTubeAdsTemplate();

