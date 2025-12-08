/**
 * Fix VSL Template in Database
 * Updates the prompt template to use proper placeholders: {{sell}}, {{where}}, {{words}}, {{cta}}
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

const newPromptTemplate = `Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells {{sell}} in {{where}}. First write "User Persona creation for {{sell}} in {{where}}" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market {{where}}. Now create a subheading called "Video Sales Letter (VSL) for above persona". Below this generate a complete youtube video script in second person of around {{words}} words using this persona. In the relevant segment ask the viewer {{cta}}. Do not self reference. Do not explain what you are doing.`;

const newInputs = [
  { name: "sell", type: "input", label: "What do you sell?" },
  { name: "where", type: "input", label: "Where do you sell?" },
  { name: "words", type: "number", label: "Total Words", value: "1200" },
  { name: "cta", type: "input", label: "Call to Action", value: "to click the subscribe button" }
];

async function fixVSLTemplate() {
  try {
    console.log('Fixing VSL Template...\n');
    
    // Get current template
    const current = await pool.query(
      "SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Create Video Sales Letter (VSL)' ORDER BY id DESC LIMIT 1"
    );
    
    if (current.rows.length === 0) {
      console.error('❌ VSL template not found!');
      process.exit(1);
    }
    
    console.log('Current template ID:', current.rows[0].id);
    console.log('\nCurrent prompt template (first 200 chars):');
    console.log(current.rows[0].prompt_template.substring(0, 200) + '...');
    console.log('\nCurrent inputs:');
    console.log(JSON.stringify(current.rows[0].inputs, null, 2));
    
    // Update template
    const result = await pool.query(
      `UPDATE templates 
       SET prompt_template = $1, 
           inputs = $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE name = 'Create Video Sales Letter (VSL)'
       RETURNING id, name, prompt_template, inputs`,
      [newPromptTemplate, JSON.stringify(newInputs)]
    );
    
    if (result.rows.length === 0) {
      console.error('❌ Failed to update template!');
      process.exit(1);
    }
    
    console.log('\n========================================');
    console.log('✓ VSL Template Updated Successfully!');
    console.log('========================================\n');
    
    console.log('Updated prompt template (first 200 chars):');
    console.log(result.rows[0].prompt_template.substring(0, 200) + '...');
    console.log('\nUpdated inputs:');
    console.log(JSON.stringify(result.rows[0].inputs, null, 2));
    
    console.log('\n✅ Template now uses proper placeholders:');
    console.log('   - {{sell}} for "What do you sell?"');
    console.log('   - {{where}} for "Where do you sell?"');
    console.log('   - {{words}} for "Total Words"');
    console.log('   - {{cta}} for "Call to Action"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixVSLTemplate();

