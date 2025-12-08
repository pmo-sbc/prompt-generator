/**
 * Check All LinkedIn Templates in Database
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
    const result = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name ILIKE '%linkedin%' ORDER BY name, id DESC"
    );
    
    if (result.rows.length === 0) {
      console.log('No LinkedIn templates found.\n');
      process.exit(0);
    }
    
    console.log(`Found ${result.rows.length} LinkedIn template(s):\n`);
    console.log('='.repeat(80));
    
    let issuesFound = 0;
    const templatesToFix = [];
    
    result.rows.forEach((template, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Template ${index + 1}: ${template.name} (ID: ${template.id})`);
      console.log(`${'='.repeat(80)}\n`);
      
      // Extract placeholders from prompt
      const placeholders = template.prompt_template.match(/\{\{([^}]+)\}\}/g) || [];
      const placeholderNames = placeholders.map(p => p.replace(/\{\{|\}\}/g, '').trim());
      
      console.log('Placeholders in prompt:');
      if (placeholderNames.length > 0) {
        placeholderNames.forEach(p => console.log(`  - {{${p}}}`));
      } else {
        console.log('  (none found)');
      }
      
      console.log('\nInput fields:');
      const numberInputs = [];
      template.inputs.forEach((inp, idx) => {
        const isNumber = inp.type === 'number';
        const hasPlaceholder = placeholderNames.includes(inp.name);
        const icon = hasPlaceholder ? '✓' : '✗';
        const status = hasPlaceholder ? '' : ' ⚠️ MISSING PLACEHOLDER!';
        
        console.log(`  ${icon} ${idx + 1}. ${inp.name} (${inp.type}) - Label: ${inp.label}${status}`);
        if (inp.default) console.log(`     Default: ${inp.default}`);
        
        if (isNumber) {
          numberInputs.push(inp);
          if (!hasPlaceholder) {
            console.log(`     ❌ Number field "${inp.name}" not used in prompt!`);
            issuesFound++;
          }
        }
      });
      
      // Check for hardcoded numbers that might match number inputs
      const hardcodedNumbers = template.prompt_template.match(/\b\d+\s+(posts?|articles?|hashtags?|months?|weeks?|days?|items?|count|total|number)\b/gi);
      if (hardcodedNumbers && numberInputs.length > 0) {
        console.log('\n⚠️  Hardcoded numbers found that might match input fields:');
        hardcodedNumbers.forEach(num => console.log(`     - "${num.trim()}"`));
        issuesFound++;
      }
      
      // Collect templates that need fixing
      const missingPlaceholders = numberInputs.filter(inp => !placeholderNames.includes(inp.name));
      if (missingPlaceholders.length > 0 || (hardcodedNumbers && numberInputs.length > 0)) {
        templatesToFix.push({
          id: template.id,
          name: template.name,
          prompt_template: template.prompt_template,
          inputs: template.inputs,
          missingPlaceholders: missingPlaceholders.map(inp => inp.name),
          hardcodedNumbers: hardcodedNumbers || []
        });
      }
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    
    if (issuesFound === 0) {
      console.log('✅ All LinkedIn templates are correctly configured!');
      console.log('   All number input fields have corresponding placeholders in prompts.\n');
    } else {
      console.log(`❌ Found ${issuesFound} issue(s) in ${templatesToFix.length} template(s):\n`);
      templatesToFix.forEach((template, idx) => {
        console.log(`${idx + 1}. ${template.name} (ID: ${template.id})`);
        if (template.missingPlaceholders.length > 0) {
          console.log(`   Missing placeholders: ${template.missingPlaceholders.join(', ')}`);
        }
        if (template.hardcodedNumbers.length > 0) {
          console.log(`   Hardcoded numbers: ${template.hardcodedNumbers.slice(0, 3).join(', ')}${template.hardcodedNumbers.length > 3 ? '...' : ''}`);
        }
        console.log();
      });
      
      console.log('\n⚠️  These templates need to be fixed!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
})();

