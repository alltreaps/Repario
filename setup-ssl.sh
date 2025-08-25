#!/bin/bash

# SSL Setup Script for Repario.app
# This script sets up Let's Encrypt SSL certificates

echo "🔒 Setting up SSL certificates for repario.app..."

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Stop nginx temporarily
echo "⏸️ Stopping nginx..."
sudo systemctl stop nginx

# Get SSL certificate
echo "🔐 Obtaining SSL certificate..."
sudo certbot certonly --standalone -d repario.app -d www.repario.app

# Update nginx config with correct certificate paths
echo "📝 Updating nginx configuration..."
sudo sed -i 's|/etc/ssl/certs/repario.app.crt|/etc/letsencrypt/live/repario.app/fullchain.pem|g' /etc/nginx/sites-available/repario.app
sudo sed -i 's|/etc/ssl/private/repario.app.key|/etc/letsencrypt/live/repario.app/privkey.pem|g' /etc/nginx/sites-available/repario.app

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Start nginx
echo "▶️ Starting nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Setup auto-renewal
echo "🔄 Setting up auto-renewal..."
sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

echo "✅ SSL setup complete!"
echo "🌐 Your site should now be accessible at https://repario.app"
