#!/bin/bash
# Setup script to add SQLite WAL files to local git exclude on production server

cd /var/www/website-with-auth-secured || exit 1

# Create .git/info/exclude if it doesn't exist
mkdir -p .git/info
touch .git/info/exclude

# Check if patterns already exist
if ! grep -q "\.db-shm" .git/info/exclude 2>/dev/null; then
    echo "" >> .git/info/exclude
    echo "# SQLite WAL files (local production ignore)" >> .git/info/exclude
    echo "prompts.db-shm" >> .git/info/exclude
    echo "prompts.db-wal" >> .git/info/exclude
    echo "*.db-shm" >> .git/info/exclude
    echo "*.db-wal" >> .git/info/exclude
    echo ""
    echo "✅ Added SQLite WAL files to local git exclude"
    echo "These files will now be ignored by git on this server only"
else
    echo "✅ SQLite WAL files already in local git exclude"
fi

echo ""
echo "You can now use 'git pull origin main' without issues!"
echo ""
echo "Note: This only affects THIS repository clone (production server)"
echo "      The files are still ignored globally via .gitignore"

