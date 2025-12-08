#!/usr/bin/env node

/**
 * Setup Script for AI Prompt Templates
 * Helps configure the application for first-time use
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🚀 AI Prompt Templates - Setup Wizard\n');
console.log('This script will help you configure your application for first-time use.\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
    console.log('⚠️  Warning: .env file already exists!');
    rl.question('Do you want to overwrite it? (yes/no): ', (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
            runSetup();
        } else {
            console.log('Setup cancelled. Existing .env file preserved.');
            rl.close();
        }
    });
} else {
    runSetup();
}

function runSetup() {
    console.log('\n📝 Configuration\n');

    rl.question('Enter port number (default: 3000): ', (port) => {
        port = port.trim() || '3000';

        rl.question('Enter environment (development/production, default: development): ', (env) => {
            env = env.trim() || 'development';

            // Generate secure session secret
            const sessionSecret = crypto.randomBytes(32).toString('hex');

            // Create .env content
            const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=${env}

# Session Secret (REQUIRED - Auto-generated)
# Keep this secret and never commit to version control!
SESSION_SECRET=${sessionSecret}

# Database (SQLite file will be created automatically)
# No configuration needed for SQLite

# Security Notes:
# 1. This SESSION_SECRET was auto-generated and is cryptographically secure
# 2. In production, always use HTTPS (secure cookies enabled automatically)
# 3. Never commit the .env file to version control
# 4. Rotate SESSION_SECRET periodically for enhanced security
`;

            // Write .env file
            fs.writeFileSync(envPath, envContent);

            console.log('\n✅ Configuration complete!\n');
            console.log('📄 Created .env file with the following settings:');
            console.log(`   - PORT: ${port}`);
            console.log(`   - NODE_ENV: ${env}`);
            console.log(`   - SESSION_SECRET: ${sessionSecret.substring(0, 10)}... (auto-generated)\n`);

            console.log('🔒 Security Notes:');
            console.log('   - Your SESSION_SECRET is cryptographically secure');
            console.log('   - Keep the .env file private and never commit it to Git');
            console.log('   - The .gitignore file is configured to exclude .env\n');

            console.log('📚 Next Steps:');
            console.log('   1. Run: npm install');
            console.log('   2. Run: npm start');
            console.log('   3. Visit: http://localhost:' + port + '\n');

            if (env === 'production') {
                console.log('⚠️  Production Mode Notes:');
                console.log('   - Ensure you have HTTPS/SSL configured');
                console.log('   - Secure cookies will be enabled automatically');
                console.log('   - Review SECURITY.md for production checklist\n');
            }

            rl.close();
        });
    });
}

rl.on('close', () => {
    process.exit(0);
});
