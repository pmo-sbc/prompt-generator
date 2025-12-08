#!/bin/bash

# Ubuntu 22.04 Server Setup Script for AI Prompt Templates
# This script automates the initial server setup steps
# Run with: bash ubuntu-setup.sh

set -e  # Exit on error

echo "=========================================="
echo "Ubuntu 22.04 Server Setup Script"
echo "AI Prompt Templates Application"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run this script as root. Run as a regular user with sudo privileges.${NC}"
   exit 1
fi

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Update system
echo "Step 1: Updating system packages..."
sudo apt update
sudo apt upgrade -y
print_status "System packages updated"

# Step 2: Install essential tools
echo ""
echo "Step 2: Installing essential tools..."
sudo apt install -y curl wget git build-essential
print_status "Essential tools installed"

# Step 3: Install Node.js
echo ""
echo "Step 3: Installing Node.js 20.x LTS..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_warning "Node.js is already installed: $NODE_VERSION"
    read -p "Do you want to reinstall? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Skipping Node.js installation"
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
        print_status "Node.js installed: $(node --version)"
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    print_status "Node.js installed: $(node --version)"
fi

# Step 4: Install PostgreSQL
echo ""
echo "Step 4: Installing PostgreSQL..."
if command -v psql &> /dev/null; then
    print_warning "PostgreSQL is already installed"
    read -p "Do you want to reinstall? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Skipping PostgreSQL installation"
    else
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        print_status "PostgreSQL installed and started"
    fi
else
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_status "PostgreSQL installed and started"
fi

# Step 5: Install PM2
echo ""
echo "Step 5: Installing PM2..."
if command -v pm2 &> /dev/null; then
    print_warning "PM2 is already installed"
else
    sudo npm install -g pm2
    print_status "PM2 installed"
fi

# Step 6: Install Nginx (optional)
echo ""
read -p "Do you want to install Nginx? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v nginx &> /dev/null; then
        print_warning "Nginx is already installed"
    else
        sudo apt install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
        print_status "Nginx installed and started"
    fi
fi

# Step 7: Setup database
echo ""
echo "Step 7: Database setup..."
echo "You need to manually create the database and user."
echo ""
echo "Run the following commands:"
echo "  sudo -u postgres psql"
echo ""
echo "Then in PostgreSQL prompt, run:"
echo "  CREATE DATABASE prompt_generator;"
echo "  CREATE USER prompt_user WITH PASSWORD 'your_secure_password_here';"
echo "  GRANT ALL PRIVILEGES ON DATABASE prompt_generator TO prompt_user;"
echo "  ALTER DATABASE prompt_generator OWNER TO prompt_user;"
echo "  \\q"
echo ""
read -p "Have you created the database and user? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please create the database and user before proceeding"
    print_warning "You can run this script again after creating the database"
    exit 0
fi

# Step 8: Create application directory
echo ""
echo "Step 8: Creating application directory..."
APP_DIR="/var/www/prompt-generator"
if [ -d "$APP_DIR" ]; then
    print_warning "Application directory already exists: $APP_DIR"
else
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    print_status "Application directory created: $APP_DIR"
fi

# Step 9: Generate session secret
echo ""
echo "Step 9: Generating session secret..."
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo ""
echo "=========================================="
echo "IMPORTANT: Save this session secret!"
echo "=========================================="
echo "SESSION_SECRET=$SESSION_SECRET"
echo "=========================================="
echo ""
read -p "Press Enter to continue..."

# Step 10: Setup firewall
echo ""
echo "Step 10: Configuring firewall..."
if command -v ufw &> /dev/null; then
    read -p "Do you want to configure UFW firewall? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Allowing SSH..."
        sudo ufw allow OpenSSH
        echo "Allowing HTTP/HTTPS..."
        sudo ufw allow 'Nginx Full'
        echo "Enabling firewall..."
        sudo ufw --force enable
        print_status "Firewall configured"
    fi
else
    print_warning "UFW is not installed. Install with: sudo apt install ufw"
fi

# Summary
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Transfer your application files to: $APP_DIR"
echo "2. Create .env file with the following variables:"
echo "   - NODE_ENV=production"
echo "   - PORT=3000"
echo "   - SESSION_SECRET=(use the secret generated above)"
echo "   - DB_HOST=localhost"
echo "   - DB_PORT=5432"
echo "   - DB_NAME=prompt_generator"
echo "   - DB_USER=prompt_user"
echo "   - DB_PASSWORD=(your database password)"
echo "   - BASE_URL=(your domain or IP)"
echo ""
echo "3. Install dependencies:"
echo "   cd $APP_DIR"
echo "   npm install --production"
echo ""
echo "4. Start application with PM2:"
echo "   pm2 start server.js --name prompt-generator"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. Configure Nginx (if installed):"
echo "   sudo nano /etc/nginx/sites-available/prompt-generator"
echo ""
echo "See UBUNTU_DEPLOYMENT_GUIDE.md for detailed instructions."
echo "=========================================="

