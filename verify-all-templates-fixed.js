/**
 * Verify All Templates Are Actually Fixed
 * Checks if number input fields have placeholders (not just if hardcoded numbers exist)
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
      `SELECT id, name, prompt_template, inputs 
       FROM templates 
       WHERE category = 'Social Media' 
       ORDER BY subcategory, name, id DESC`
    );
    
    let issues = [];
    let correct = 0;
    
    result.rows.forEach((template) => {
      const placeholders = template.prompt_template.match(/\{\{([^}]+)\}\}/g) || [];
      const placeholderNames = placeholders.map(p => p.replace(/\{\{|\}\}/g, '').trim());
      
      const numberInputs = template.inputs.filter(inp => inp.type === 'number');
      
      if (numberInputs.length > 0) {
        const missingPlaceholders = numberInputs.filter(inp => !placeholderNames.includes(inp.name));
        
        if (missingPlaceholders.length > 0) {
          issues.push({
            id: template.id,
            name: template.name,
            missing: missingPlaceholders.map(inp => `${inp.name} (${inp.label})`)
          });
        } else {
          correct++;
        }
      } else {
        correct++;
      }
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('VERIFICATION SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    
    if (issues.length === 0) {
      console.log('✅ ALL TEMPLATES CORRECT!');
      console.log(`   All ${result.rows.length} templates have proper placeholders for number inputs.\n`);
    } else {
      console.log(`❌ Found ${issues.length} template(s) with missing placeholders:\n`);
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.name} (ID: ${issue.id})`);
        console.log(`   Missing: ${issue.missing.join(', ')}\n`);
      });
    }
    
    console.log(`✓ Correct: ${correct} template(s)`);
    console.log(`✗ Issues: ${issues.length} template(s)`);
    console.log(`  Total: ${result.rows.length} template(s)\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();

