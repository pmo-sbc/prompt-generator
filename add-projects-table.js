/**
 * Migration Script: Add Projects Table
 * Adds a projects table for organizing prompts into projects
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const db = new Database(dbPath);

console.log('Adding projects table...\n');

try {
  // Create projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3498db',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
  `);

  console.log('✓ Projects table created');

  // Add project_id column to saved_prompts if it doesn't exist
  const savedPromptsInfo = db.prepare("PRAGMA table_info(saved_prompts)").all();
  const hasProjectId = savedPromptsInfo.some(col => col.name === 'project_id');

  if (!hasProjectId) {
    db.exec(`
      ALTER TABLE saved_prompts ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_saved_prompts_project_id ON saved_prompts(project_id);
    `);
    console.log('✓ Added project_id column to saved_prompts');
  } else {
    console.log('✓ project_id column already exists in saved_prompts');
  }

  // Verify tables
  const projects = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='projects'").get();
  console.log(`\n✓ Projects table exists: ${projects.count === 1 ? 'Yes' : 'No'}`);

  db.close();
  console.log('\n✓ Migration completed successfully!');

} catch (error) {
  console.error('❌ Error during migration:', error.message);
  db.close();
  process.exit(1);
}
