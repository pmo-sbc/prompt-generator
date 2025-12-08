/**
 * Replicate Templates Script
 * Copies all templates from local database to production database
 */

const { Pool } = require('pg');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, use environment variables directly
}

// Get local database config
function getLocalConfig() {
  try {
    const config = require('./src/config');
    return {
      host: config.db.host || process.env.DB_HOST || 'localhost',
      port: parseInt(config.db.port || process.env.DB_PORT || '5432', 10),
      database: config.db.database || process.env.DB_NAME || 'prompt_generator',
      user: config.db.user || process.env.DB_USER || 'postgres',
      password: config.db.password || process.env.DB_PASSWORD || ''
    };
  } catch (e) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'prompt_generator',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };
  }
}

// Get production database config
function getProductionConfig() {
  // Priority: command line args > .env.production > environment variables
  const args = process.argv.slice(2);
  let prodHost = process.env.PROD_DB_HOST;
  let prodPort = process.env.PROD_DB_PORT;
  let prodDatabase = process.env.PROD_DB_NAME;
  let prodUser = process.env.PROD_DB_USER;
  let prodPassword = process.env.PROD_DB_PASSWORD;

  // Try to load .env.production if it exists
  try {
    const fs = require('fs');
    if (fs.existsSync('.env.production')) {
      const envProd = fs.readFileSync('.env.production', 'utf8');
      envProd.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (key === 'DB_HOST') prodHost = prodHost || value;
          if (key === 'DB_PORT') prodPort = prodPort || value;
          if (key === 'DB_NAME') prodDatabase = prodDatabase || value;
          if (key === 'DB_USER') prodUser = prodUser || value;
          if (key === 'DB_PASSWORD') prodPassword = prodPassword || value;
        }
      });
    }
  } catch (e) {
    // Ignore
  }

  // Parse command line arguments
  args.forEach(arg => {
    if (arg.startsWith('--production-host=')) prodHost = arg.split('=')[1];
    if (arg.startsWith('--production-port=')) prodPort = arg.split('=')[1];
    if (arg.startsWith('--production-database=')) prodDatabase = arg.split('=')[1];
    if (arg.startsWith('--production-user=')) prodUser = arg.split('=')[1];
    if (arg.startsWith('--production-password=')) prodPassword = arg.split('=')[1];
  });

  return {
    host: prodHost || process.env.PROD_DB_HOST || 'localhost',
    port: parseInt(prodPort || process.env.PROD_DB_PORT || '5432', 10),
    database: prodDatabase || process.env.PROD_DB_NAME || 'prompt_generator',
    user: prodUser || process.env.PROD_DB_USER || 'postgres',
    password: prodPassword || process.env.PROD_DB_PASSWORD || ''
  };
}

async function replicateTemplates() {
  const localConfig = getLocalConfig();
  const prodConfig = getProductionConfig();
  
  const isDryRun = process.argv.includes('--dry-run');
  const skipBackup = process.argv.includes('--skip-backup');

  console.log('=== Template Replication Script ===\n');
  console.log('Local Database:');
  console.log(`  Host: ${localConfig.host}`);
  console.log(`  Database: ${localConfig.database}`);
  console.log(`  User: ${localConfig.user}\n`);
  
  console.log('Production Database:');
  console.log(`  Host: ${prodConfig.host}`);
  console.log(`  Database: ${prodConfig.database}`);
  console.log(`  User: ${prodConfig.user}\n`);

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const localPool = new Pool(localConfig);
  const prodPool = new Pool(prodConfig);

  try {
    // Test connections
    console.log('Testing database connections...');
    await localPool.query('SELECT 1');
    console.log('✓ Local database connected');
    
    await prodPool.query('SELECT 1');
    console.log('✓ Production database connected\n');

    // Fetch all templates from local database
    console.log('Fetching templates from local database...');
    const localTemplates = await localPool.query(
      'SELECT * FROM templates ORDER BY id'
    );
    
    console.log(`✓ Found ${localTemplates.rows.length} templates in local database\n`);

    if (localTemplates.rows.length === 0) {
      console.log('No templates found in local database. Exiting.');
      process.exit(0);
    }

    // Fetch existing templates from production
    console.log('Fetching existing templates from production database...');
    const prodTemplates = await prodPool.query(
      'SELECT id, name FROM templates ORDER BY id'
    );
    
    const prodTemplateMap = new Map();
    prodTemplates.rows.forEach(t => {
      prodTemplateMap.set(t.id, t.name);
    });
    
    console.log(`✓ Found ${prodTemplates.rows.length} existing templates in production\n`);

    // Create backup table if not skipping
    if (!skipBackup && !isDryRun) {
      console.log('Creating backup of production templates...');
      try {
        await prodPool.query(`
          CREATE TABLE IF NOT EXISTS templates_backup_${Date.now()} AS 
          SELECT * FROM templates
        `);
        console.log('✓ Backup created\n');
      } catch (e) {
        console.log('⚠️  Could not create backup:', e.message);
      }
    }

    // Process each template
    let updated = 0;
    let inserted = 0;
    let skipped = 0;
    const errors = [];

    console.log('Replicating templates...\n');

    for (const template of localTemplates.rows) {
      try {
        const exists = prodTemplateMap.has(template.id);
        const action = exists ? 'UPDATE' : 'INSERT';

        if (isDryRun) {
          console.log(`[DRY RUN] Would ${action} template: ${template.name} (ID: ${template.id})`);
          if (action === 'UPDATE') updated++;
          else inserted++;
          continue;
        }

        // Ensure inputs is a valid JSONB
        let inputs = template.inputs;
        if (typeof inputs === 'string') {
          try {
            inputs = JSON.parse(inputs);
          } catch (e) {
            console.warn(`⚠️  Warning: Invalid JSON in inputs for template ${template.id}, using empty object`);
            inputs = [];
          }
        }
        if (!inputs) inputs = [];

        if (exists) {
          // Update existing template
          await prodPool.query(`
            UPDATE templates 
            SET 
              name = $1,
              category = $2,
              subcategory = $3,
              description = $4,
              prompt_template = $5,
              inputs = $6::jsonb,
              is_premium = $7,
              is_active = $8,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
          `, [
            template.name,
            template.category,
            template.subcategory,
            template.description,
            template.prompt_template,
            JSON.stringify(inputs),
            template.is_premium,
            template.is_active,
            template.id
          ]);
          
          console.log(`✓ Updated: ${template.name} (ID: ${template.id})`);
          updated++;
        } else {
          // Insert new template
          // First, check if we need to adjust the sequence
          const maxIdResult = await prodPool.query('SELECT MAX(id) as max_id FROM templates');
          const maxId = maxIdResult.rows[0].max_id || 0;
          
          if (template.id > maxId) {
            // Reset sequence to be higher than the max ID
            await prodPool.query(`SELECT setval('templates_id_seq', $1, true)`, [template.id]);
          }

          await prodPool.query(`
            INSERT INTO templates (
              id, name, category, subcategory, description, 
              prompt_template, inputs, is_premium, is_active, 
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
          `, [
            template.id,
            template.name,
            template.category,
            template.subcategory,
            template.description,
            template.prompt_template,
            JSON.stringify(inputs),
            template.is_premium,
            template.is_active,
            template.created_at || new Date(),
            template.updated_at || new Date()
          ]);
          
          console.log(`✓ Inserted: ${template.name} (ID: ${template.id})`);
          inserted++;
        }
      } catch (error) {
        const errorMsg = `Error processing template ${template.id} (${template.name}): ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        errors.push({ template: template.name, id: template.id, error: error.message });
        skipped++;
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total templates processed: ${localTemplates.rows.length}`);
    console.log(`  ✓ Updated: ${updated}`);
    console.log(`  ✓ Inserted: ${inserted}`);
    console.log(`  ✗ Errors/Skipped: ${skipped}`);

    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(e => {
        console.log(`  Template ID ${e.id} (${e.template}): ${e.error}`);
      });
    }

    // Verify replication
    if (!isDryRun) {
      console.log('\nVerifying replication...');
      const verifyResult = await prodPool.query('SELECT COUNT(*) as count FROM templates');
      console.log(`✓ Production database now has ${verifyResult.rows[0].count} templates`);
    }

    console.log('\n✅ Template replication completed!');

  } catch (error) {
    console.error('\n❌ Error during replication:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await localPool.end();
    await prodPool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node replicate-templates.js [options]

Options:
  --dry-run              Show what would be done without making changes
  --skip-backup          Skip creating backup table
  --production-host=HOST Production database host
  --production-port=PORT Production database port
  --production-database=DB Production database name
  --production-user=USER Production database user
  --production-password=PASS Production database password
  --help, -h             Show this help message

Environment Variables (fallback):
  PROD_DB_HOST, PROD_DB_PORT, PROD_DB_NAME, PROD_DB_USER, PROD_DB_PASSWORD
  Or use .env.production file

Examples:
  node replicate-templates.js --dry-run
  node replicate-templates.js --production-host=prod-server.com
  `);
  process.exit(0);
}

// Run replication
replicateTemplates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

