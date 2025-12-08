/**
 * Generate SQL for YouTube Title & Descriptions CTA fix
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

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
      "SELECT id, prompt_template FROM templates WHERE name = 'YouTube Title & Descriptions' ORDER BY id"
    );
    
    let sqlContent = `-- Fix YouTube Title & Descriptions templates to use {{call_to_action}} placeholder\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n\n`;
    
    result.rows.forEach(template => {
      // Escape single quotes for SQL
      const escapedPrompt = template.prompt_template.replace(/'/g, "''");
      
      sqlContent += `-- Template ID ${template.id}: YouTube Title & Descriptions\n`;
      sqlContent += `UPDATE templates SET prompt_template = '${escapedPrompt}' WHERE id = ${template.id};\n\n`;
    });
    
    fs.writeFileSync('fix-youtube-title-desc-cta.sql', sqlContent);
    console.log('✅ SQL file generated: fix-youtube-title-desc-cta.sql');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

