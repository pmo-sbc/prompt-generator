/**
 * Database Restore Script
 *
 * Restores the SQLite database from a backup file.
 * Creates a backup of the current database before restoring.
 *
 * Usage:
 *   node restore-database.js
 *   (Interactive: will show available backups to choose from)
 *
 * Or specify a backup file:
 *   node restore-database.js backups/database-backup-2025-10-20T10-30-00.sqlite
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const DB_PATH = path.join(__dirname, 'database.sqlite');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Get list of available backup files
 */
function getAvailableBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('✗ Error: Backup directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files
    .filter(file => file.startsWith('database-backup-') && file.endsWith('.sqlite'))
    .map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime
      };
    })
    .sort((a, b) => b.mtime - a.mtime); // Sort by date, newest first

  return backupFiles;
}

/**
 * Display available backups
 */
function displayBackups(backups) {
  console.log('\nAvailable backups:\n');

  backups.forEach((backup, index) => {
    const sizeMB = (backup.size / (1024 * 1024)).toFixed(2);
    const date = backup.mtime.toLocaleString();
    console.log(`  ${index + 1}. ${backup.filename}`);
    console.log(`     Size: ${sizeMB} MB | Created: ${date}\n`);
  });
}

/**
 * Create a safety backup of current database
 */
function createSafetyBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('No current database to backup');
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safetyBackupFilename = `database-before-restore-${timestamp}.sqlite`;
  const safetyBackupPath = path.join(BACKUP_DIR, safetyBackupFilename);

  fs.copyFileSync(DB_PATH, safetyBackupPath);
  console.log(`✓ Created safety backup: ${safetyBackupFilename}`);

  return safetyBackupPath;
}

/**
 * Restore database from backup
 */
function restoreDatabase(backupPath) {
  try {
    // Verify backup file exists
    if (!fs.existsSync(backupPath)) {
      console.error('✗ Error: Backup file not found:', backupPath);
      process.exit(1);
    }

    // Get backup file info
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n=== Starting Database Restore ===');
    console.log(`Backup file: ${path.basename(backupPath)}`);
    console.log(`Size: ${sizeMB} MB`);

    // Create safety backup of current database
    const safetyBackup = createSafetyBackup();

    // Restore the backup
    console.log('\nRestoring database...');
    fs.copyFileSync(backupPath, DB_PATH);

    // Verify restoration
    if (fs.existsSync(DB_PATH)) {
      const restoredStats = fs.statSync(DB_PATH);
      const restoredSizeMB = (restoredStats.size / (1024 * 1024)).toFixed(2);

      console.log(`✓ Database restored successfully`);
      console.log(`  Size: ${restoredSizeMB} MB`);

      if (safetyBackup) {
        console.log(`\n✓ Previous database backed up to: ${path.basename(safetyBackup)}`);
      }

      console.log('\n=== Restore Complete ===');
      console.log('Please restart your application to use the restored database.');
    } else {
      throw new Error('Database file was not created');
    }
  } catch (error) {
    console.error('✗ Restore failed:', error.message);
    process.exit(1);
  }
}

/**
 * Interactive restore process
 */
function interactiveRestore() {
  const backups = getAvailableBackups();

  if (backups.length === 0) {
    console.log('✗ No backup files found in', BACKUP_DIR);
    process.exit(1);
  }

  displayBackups(backups);

  rl.question('Enter the number of the backup to restore (or "q" to quit): ', (answer) => {
    if (answer.toLowerCase() === 'q') {
      console.log('Restore cancelled');
      rl.close();
      process.exit(0);
    }

    const choice = parseInt(answer);

    if (isNaN(choice) || choice < 1 || choice > backups.length) {
      console.error('✗ Invalid selection');
      rl.close();
      process.exit(1);
    }

    const selectedBackup = backups[choice - 1];

    console.log(`\nYou selected: ${selectedBackup.filename}`);

    rl.question('\n⚠️  This will replace your current database. Continue? (yes/no): ', (confirm) => {
      if (confirm.toLowerCase() !== 'yes') {
        console.log('Restore cancelled');
        rl.close();
        process.exit(0);
      }

      rl.close();
      restoreDatabase(selectedBackup.path);
    });
  });
}

/**
 * Main restore process
 */
function main() {
  console.log('=== SQLite Database Restore ===');

  // Check if backup file was specified as argument
  const backupArg = process.argv[2];

  if (backupArg) {
    // Direct restore with specified file
    const backupPath = path.isAbsolute(backupArg)
      ? backupArg
      : path.join(__dirname, backupArg);

    restoreDatabase(backupPath);
  } else {
    // Interactive restore
    interactiveRestore();
  }
}

// Run the restore
main();
