#!/bin/bash
# Quick script to run database replication

echo "=========================================="
echo "Database Replication Runner"
echo "=========================================="
echo ""

# Check if dependencies are installed
if ! node -e "require('pg')" 2>/dev/null; then
    echo "Installing dependencies..."
    npm install pg
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production file not found!"
    echo ""
    echo "Please create .env.production with your production database config:"
    echo ""
    echo "  DB_HOST=your-production-host"
    echo "  DB_PORT=5432"
    echo "  DB_NAME=prompt_generator"
    echo "  DB_USER=your_user"
    echo "  DB_PASSWORD=your_password"
    echo "  DB_SSL=true"
    echo ""
    echo "Or run with command-line arguments:"
    echo "  node replicate-database.js --production-host HOST --production-db DB --production-user USER --production-password PASS"
    exit 1
fi

echo "Running database replication..."
echo "This will REPLACE all data in production with data from local database!"
echo ""

# Run the replication script
node replicate-database.js

