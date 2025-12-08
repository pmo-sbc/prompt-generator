/**
 * Automated SQLite Database Backup Script
 *
 * This script creates timestamped backups of the SQLite database
 * and automatically rotates old backups to save disk space.
 *
 * Usage:
 *   node backup-database.js
 *
 * For automated backups, set up a cron job (see README for instructions)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DB_PATH = path.join(__dirname, 'database.sqlite');
const BACKUP_DIR = path.join(__dirname, 'backups');
const RETENTION_DAYS = 7; // Keep backups for 7 days

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✓ Created backup directory: ${BACKUP_DIR}`);
}

/**
 * Create a timestamped backup of the database
 */
function createBackup() {
  try {
    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
      console.error('✗ Error: Database file not found at', DB_PATH);
      process.exit(1);
    }

    // Get database size
    const stats = fs.statSync(DB_PATH);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Create timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFilename = `database-backup-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    console.log('Starting database backup...');
    console.log(`Source: ${DB_PATH} (${fileSizeMB} MB)`);
    console.log(`Destination: ${backupPath}`);

    // Copy the database file
    fs.copyFileSync(DB_PATH, backupPath);

    // Verify backup was created
    if (fs.existsSync(backupPath)) {
      const backupStats = fs.statSync(backupPath);
      const backupSizeMB = (backupStats.size / (1024 * 1024)).toFixed(2);

      console.log(`✓ Backup created successfully: ${backupFilename}`);
      console.log(`  Size: ${backupSizeMB} MB`);

      return backupPath;
    } else {
      throw new Error('Backup file was not created');
    }
  } catch (error) {
    console.error('✗ Backup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Clean up old backups beyond retention period
 */
function rotateBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backupFiles = files.filter(file => file.startsWith('database-backup-') && file.endsWith('.sqlite'));

    if (backupFiles.length === 0) {
      console.log('No backup files to rotate');
      return;
    }

    console.log(`\nFound ${backupFiles.length} backup file(s)`);

    // Get current time
    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    let totalSizeDeleted = 0;

    backupFiles.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;

      // Delete files older than retention period
      if (fileAge > retentionMs) {
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        fs.unlinkSync(filePath);
        deletedCount++;
        totalSizeDeleted += stats.size;
        console.log(`✓ Deleted old backup: ${file} (${fileSizeMB} MB)`);
      }
    });

    if (deletedCount > 0) {
      const totalDeletedMB = (totalSizeDeleted / (1024 * 1024)).toFixed(2);
      console.log(`\n✓ Rotation complete: ${deletedCount} old backup(s) deleted (${totalDeletedMB} MB freed)`);
    } else {
      console.log('✓ No old backups to delete');
    }

    // Show remaining backups
    const remainingFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('database-backup-') && file.endsWith('.sqlite'));

    if (remainingFiles.length > 0) {
      console.log(`\nCurrent backups (${remainingFiles.length}):`);
      remainingFiles
        .sort()
        .reverse()
        .forEach(file => {
          const filePath = path.join(BACKUP_DIR, file);
          const stats = fs.statSync(filePath);
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          const date = new Date(stats.mtime).toLocaleString();
          console.log(`  - ${file} (${fileSizeMB} MB, created ${date})`);
        });
    }
  } catch (error) {
    console.error('✗ Rotation failed:', error.message);
  }
}

/**
 * Main backup process
 */
function main() {
  console.log('=== SQLite Database Backup ===');
  console.log(`Retention policy: ${RETENTION_DAYS} days\n`);

  // Create backup
  const backupPath = createBackup();

  // Rotate old backups
  rotateBackups();

  console.log('\n=== Backup Complete ===');
}

// Run the backup
main();
