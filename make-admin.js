const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prompts.db');
const db = new Database(dbPath);

try {
  // First, show all users with diego in username
  console.log('\n=== Finding users with "diego" in username ===');
  const users = db.prepare('SELECT id, username, email, is_admin FROM users WHERE username LIKE ?').all('%diego%');

  if (users.length === 0) {
    console.log('No users found with "diego" in username');
    db.close();
    process.exit(0);
  }

  console.log('Found users:');
  users.forEach(row => {
    console.log(`  ID: ${row.id}, Username: ${row.username}, Email: ${row.email}, Is Admin: ${row.is_admin}`);
  });

  // Update all diego users to be admin
  console.log('\n=== Making all diego users admin ===');
  const result = db.prepare('UPDATE users SET is_admin = 1 WHERE username LIKE ?').run('%diego%');

  console.log(`Updated ${result.changes} user(s) to admin status`);

  // Show updated users
  console.log('\n=== Updated users ===');
  const updatedUsers = db.prepare('SELECT id, username, email, is_admin FROM users WHERE username LIKE ?').all('%diego%');

  updatedUsers.forEach(row => {
    console.log(`  ID: ${row.id}, Username: ${row.username}, Email: ${row.email}, Is Admin: ${row.is_admin}`);
  });

  console.log('\n✅ Done!');
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
