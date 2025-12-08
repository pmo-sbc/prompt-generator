/**
 * Check All Social Media Templates
 * Verifies that all number input fields have corresponding placeholders in prompts
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'prompt_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

(async () => {
  try {
    const socialMediaCategories = ['Facebook', 'Instagram', 'LinkedIn', 'Twitter', 'TikTok', 'Pinterest', 'YouTube'];
    const categoryFilter = socialMediaCategories.map(cat => `category = 'Social Media' AND subcategory = '${cat}'`).join(' OR ');
    
    const result = await pool.query(
      `SELECT id, name, prompt_template, inputs, subcategory 
       FROM templates 
       WHERE category = 'Social Media' 
       ORDER BY subcategory, name, id DESC`
    );
    
    if (result.rows.length === 0) {
      console.log('No social media templates found.\n');
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} Social Media template(s):\n`);
    console.log('='.repeat(80));
    
    let issuesFound = 0;
    const templatesToFix = [];
    const byCategory = {};
    
    result.rows.forEach((template) => {
      const category = template.subcategory || 'Unknown';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(template);
      
      // Extract placeholders from prompt
      const placeholders = template.prompt_template.match(/\{\{([^}]+)\}\}/g) || [];
      const placeholderNames = placeholders.map(p => p.replace(/\{\{|\}\}/g, '').trim());
      
      // Check inputs
      const numberInputs = template.inputs.filter(inp => inp.type === 'number');
      const allInputs = template.inputs || [];
      
      // Check for missing placeholders
      const missingPlaceholders = numberInputs.filter(inp => !placeholderNames.includes(inp.name));
      
      // Check for hardcoded numbers that might match number inputs
      const hardcodedNumbers = template.prompt_template.match(/\b\d+\s+(posts?|articles?|hashtags?|months?|weeks?|days?|items?|count|total|number|videos?|slides?|characters?|words?)\b/gi);
      
      if (missingPlaceholders.length > 0 || (hardcodedNumbers && numberInputs.length > 0)) {
        issuesFound++;
        templatesToFix.push({
          id: template.id,
          name: template.name,
          category: category,
          prompt_template: template.prompt_template,
          inputs: template.inputs,
          missingPlaceholders: missingPlaceholders.map(inp => ({
            name: inp.name,
            label: inp.label,
            default: inp.default
          })),
          hardcodedNumbers: hardcodedNumbers || []
        });
      }
    });
    
    // Display by category
    Object.keys(byCategory).sort().forEach(category => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`${category.toUpperCase()} (${byCategory[category].length} templates)`);
      console.log('='.repeat(80));
      
      byCategory[category].forEach((template, index) => {
        const placeholders = template.prompt_template.match(/\{\{([^}]+)\}\}/g) || [];
        const placeholderNames = placeholders.map(p => p.replace(/\{\{|\}\}/g, '').trim());
        
        const numberInputs = template.inputs.filter(inp => inp.type === 'number');
        const missingPlaceholders = numberInputs.filter(inp => !placeholderNames.includes(inp.name));
        
        const hasIssues = missingPlaceholders.length > 0;
        const icon = hasIssues ? '✗' : '✓';
        
        console.log(`\n${icon} ${index + 1}. ${template.name} (ID: ${template.id})`);
        
        if (numberInputs.length > 0) {
          console.log(`   Number inputs:`);
          numberInputs.forEach(inp => {
            const hasPlaceholder = placeholderNames.includes(inp.name);
            const status = hasPlaceholder ? '✓' : '✗ MISSING';
            console.log(`     ${status} ${inp.name} (${inp.label}) - Default: ${inp.default || 'none'}`);
          });
        } else {
          console.log(`   (No number inputs)`);
        }
        
        if (missingPlaceholders.length > 0) {
          console.log(`   ❌ Missing placeholders: ${missingPlaceholders.map(inp => inp.name).join(', ')}`);
        }
      });
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    
    if (issuesFound === 0) {
      console.log('✅ All social media templates are correctly configured!');
      console.log('   All number input fields have corresponding placeholders in prompts.\n');
    } else {
      console.log(`❌ Found ${issuesFound} template(s) with issues:\n`);
      
      const byCategoryIssues = {};
      templatesToFix.forEach(template => {
        if (!byCategoryIssues[template.category]) {
          byCategoryIssues[template.category] = [];
        }
        byCategoryIssues[template.category].push(template);
      });
      
      Object.keys(byCategoryIssues).sort().forEach(category => {
        console.log(`${category}:`);
        byCategoryIssues[category].forEach((template, idx) => {
          console.log(`  ${idx + 1}. ${template.name} (ID: ${template.id})`);
          if (template.missingPlaceholders.length > 0) {
            console.log(`     Missing: ${template.missingPlaceholders.map(p => `${p.name} (${p.label})`).join(', ')}`);
          }
        });
        console.log();
      });
      
      console.log(`\n⚠️  ${templatesToFix.length} template(s) need to be fixed!`);
    }
    
    // Return templates to fix for the fix script
    if (templatesToFix.length > 0) {
      console.log(`\nExporting issues to fix...`);
      return templatesToFix;
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
})();

