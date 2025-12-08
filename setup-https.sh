#!/bin/bash
# Setup Nginx and HTTPS with Let's Encrypt

echo "=========================================="
echo "Setting up HTTPS with Let's Encrypt"
echo "=========================================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo: sudo bash setup-https.sh"
    exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "Domain name is required!"
    exit 1
fi

echo ""
echo "Setting up for domain: $DOMAIN"
echo ""

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt update
    apt install -y nginx
else
    echo "✓ Nginx is already installed"
fi

# Create Nginx configuration
echo "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/prompt-generator << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Temporary HTTP config (will be updated by Certbot)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable the site
if [ ! -L /etc/nginx/sites-enabled/prompt-generator ]; then
    ln -s /etc/nginx/sites-available/prompt-generator /etc/nginx/sites-enabled/
    echo "✓ Nginx site enabled"
fi

# Remove default site if exists
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    echo "✓ Removed default Nginx site"
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Start/restart Nginx
systemctl restart nginx
systemctl enable nginx
echo "✓ Nginx started and enabled"

# Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
else
    echo "✓ Certbot is already installed"
fi

# Configure firewall
echo "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    echo "✓ Firewall configured"
fi

# Get SSL certificate
echo ""
echo "=========================================="
echo "Getting SSL certificate from Let's Encrypt"
echo "=========================================="
echo ""
echo "This will obtain and install SSL certificate for:"
echo "  - $DOMAIN"
echo "  - www.$DOMAIN"
echo ""
read -p "Press Enter to continue (make sure DNS points to this server)..."

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --redirect --email admin@$DOMAIN

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ HTTPS setup complete!"
    echo "=========================================="
    echo ""
    echo "Your site is now available at:"
    echo "  https://$DOMAIN"
    echo ""
    echo "Certificate will auto-renew. To test renewal:"
    echo "  sudo certbot renew --dry-run"
    echo ""
else
    echo ""
    echo "❌ SSL certificate installation failed!"
    echo "Make sure:"
    echo "  1. DNS A record points to this server's IP"
    echo "  2. Port 80 is accessible from the internet"
    echo "  3. No firewall is blocking HTTP/HTTPS"
    exit 1
fi

