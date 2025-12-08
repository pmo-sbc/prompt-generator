#!/bin/bash
# Quick script to start the production service

cd /var/www/prompt-generator

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Start the application
pm2 start server.js --name "prompt-generator"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo ""
echo "✓ Application started!"
echo ""
echo "Useful commands:"
echo "  pm2 status                 - Check status"
echo "  pm2 logs prompt-generator  - View logs"
echo "  pm2 restart prompt-generator - Restart"
echo "  pm2 stop prompt-generator  - Stop"

