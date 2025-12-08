/**
 * Migration Script: Add Projects Support to Database
 * Run this once to add project_id column to saved_prompts table
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const db = new Database(dbPath);

console.log('🔄 Starting migration: Add projects support...\n');

try {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Check if saved_prompts table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_prompts'").get();

  if (!tables) {
    console.log('⚠️  saved_prompts table does not exist. Creating tables from scratch...');
    console.log('   Please run the server to initialize the database.');
    db.close();
    process.exit(1);
  }

  // Check if project_id column already exists in saved_prompts
  const savedPromptsColumns = db.prepare('PRAGMA table_info(saved_prompts)').all();
  const hasProjectId = savedPromptsColumns.some(col => col.name === 'project_id');

  if (hasProjectId) {
    console.log('✅ project_id column already exists in saved_prompts. No migration needed.');
    db.close();
    process.exit(0);
  }

  console.log('📝 Adding project_id column to saved_prompts table...');

  // Add project_id column
  db.prepare('ALTER TABLE saved_prompts ADD COLUMN project_id INTEGER').run();
  console.log('   ✅ project_id column added');

  // Note: We can't add foreign key constraint to existing table in SQLite
  // The foreign key will be enforced on new inserts/updates through application logic
  console.log('   ℹ️  Note: Foreign key constraint will be enforced by application logic');

  // Create index on project_id for performance
  console.log('📝 Creating index on project_id...');
  db.prepare('CREATE INDEX IF NOT EXISTS idx_saved_prompts_project_id ON saved_prompts(project_id)').run();
  console.log('   ✅ Index created');

  console.log('\n✅ Migration completed successfully!');
  console.log('\n📋 Updated saved_prompts Table Schema:');

  const updatedColumns = db.prepare('PRAGMA table_info(saved_prompts)').all();
  updatedColumns.forEach(col => {
    console.log(`   - ${col.name} | ${col.type} | ${col.notnull ? 'NOT NULL' : 'NULL'}`);
  });

  // Show indexes
  console.log('\n📋 Indexes on saved_prompts:');
  const indexes = db.prepare('PRAGMA index_list(saved_prompts)').all();
  indexes.forEach(idx => {
    console.log(`   - ${idx.name}`);
  });

  db.close();
  console.log('\n✅ Database migration successful. You can now start the server.');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  db.close();
  process.exit(1);
}
