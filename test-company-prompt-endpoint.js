/**
 * Test script to diagnose the /api/generate-company-prompt endpoint
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
    console.log('Testing company prompt generation for companyId: 5\n');
    
    // First, check if company exists
    console.log('1. Checking if company with ID 5 exists...');
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [5]
    );
    
    if (companyResult.rows.length === 0) {
      console.log('   ✗ Company with ID 5 not found in database');
      console.log('   Available companies:');
      const allCompanies = await pool.query('SELECT id, name, user_id FROM companies ORDER BY id');
      allCompanies.rows.forEach(c => {
        console.log(`      - ID: ${c.id}, Name: ${c.name}, User ID: ${c.user_id}`);
      });
      process.exit(1);
    }
    
    const company = companyResult.rows[0];
    console.log(`   ✓ Company found: ${company.name} (User ID: ${company.user_id})`);
    console.log(`      Legal Name: ${company.legal_name || 'N/A'}`);
    console.log(`      Marketing Name: ${company.marketing_name || 'N/A'}\n`);
    
    // Check if communities exist for this company
    console.log('2. Checking communities for company...');
    const communitiesResult = await pool.query(
      `SELECT c.* FROM communities c
       INNER JOIN companies co ON c.company_id = co.id
       WHERE c.company_id = $1 AND co.user_id = $2
       ORDER BY c.created_at DESC`,
      [5, company.user_id]
    );
    
    if (communitiesResult.rows.length === 0) {
      console.log('   ✗ No communities found for this company');
      console.log('   This would cause a 400 error, not 500');
      process.exit(1);
    }
    
    console.log(`   ✓ Found ${communitiesResult.rows.length} community/communities:`);
    communitiesResult.rows.forEach((c, idx) => {
      console.log(`      ${idx + 1}. ${c.name}`);
      console.log(`         ILEC: ${c.ilec}, CLEC: ${c.clec}`);
      
      // Check technologies
      let technologies = c.technologies;
      if (technologies && typeof technologies === 'string') {
        try {
          technologies = JSON.parse(technologies);
        } catch (e) {
          console.log(`         ⚠ Technologies field is not valid JSON`);
          technologies = [];
        }
      }
      
      if (technologies && Array.isArray(technologies) && technologies.length > 0) {
        console.log(`         Technologies: ${technologies.length} technology type(s)`);
        technologies.forEach((tech, techIdx) => {
          console.log(`            ${techIdx + 1}. ${tech.type || 'Unknown'}`);
          if (tech.packages && Array.isArray(tech.packages)) {
            console.log(`               Packages: ${tech.packages.length}`);
          }
        });
      } else {
        console.log(`         Technologies: None`);
      }
    });
    
    console.log('\n3. Testing prompt generation...');
    const { generateCompanyPrompt } = require('./src/utils/promptGenerator');
    
    try {
      // Parse technologies for each community
      const communities = communitiesResult.rows.map(c => {
        const community = { ...c };
        if (community.technologies && typeof community.technologies === 'string') {
          try {
            community.technologies = JSON.parse(community.technologies);
          } catch (e) {
            console.error(`   ⚠ Error parsing technologies for ${c.name}:`, e.message);
            community.technologies = [];
          }
        } else if (!community.technologies) {
          community.technologies = [];
        }
        return community;
      });
      
      const prompt = generateCompanyPrompt(company, communities);
      console.log('   ✓ Prompt generated successfully!');
      console.log(`   Prompt length: ${prompt.length} characters\n`);
      console.log('Generated prompt:');
      console.log('─'.repeat(80));
      console.log(prompt);
      console.log('─'.repeat(80));
      
    } catch (error) {
      console.error('   ✗ Error generating prompt:');
      console.error(`      ${error.message}`);
      console.error(`      Stack: ${error.stack}`);
      process.exit(1);
    }
    
    console.log('\n✅ All tests passed! The endpoint should work correctly.');
    console.log('\nIf you\'re still getting a 500 error in production, check:');
    console.log('  1. Server logs for the detailed error message');
    console.log('  2. That the user session has a valid userId');
    console.log('  3. That the database connection is working properly');
    console.log('  4. That all required database tables exist');
    
  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error(`   ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

