#!/bin/bash

# VPS Cleanup Script for Repario App
# This script removes all previous installations and configurations

echo "🧹 Starting VPS cleanup for fresh Repario deployment..."

# Stop and remove PM2 processes
echo "⏹️ Stopping PM2 processes..."
pm2 stop all
pm2 delete all
pm2 kill

# Stop nginx
echo "⏹️ Stopping nginx..."
sudo systemctl stop nginx

# Remove application files
echo "🗑️ Removing application files..."
sudo rm -rf /var/www/repario
sudo rm -rf /var/www/html/repario*

# Remove nginx configuration
echo "🗑️ Removing nginx configuration..."
sudo rm -f /etc/nginx/sites-available/repario.app
sudo rm -f /etc/nginx/sites-available/repario*
sudo rm -f /etc/nginx/sites-enabled/repario.app
sudo rm -f /etc/nginx/sites-enabled/repario*

# Remove SSL certificates (optional - uncomment if you want to remove them)
# echo "🗑️ Removing SSL certificates..."
# sudo certbot delete --cert-name repario.app

# Clean up logs
echo "🗑️ Cleaning up logs..."
sudo rm -f /var/log/nginx/repario*
pm2 flush

# Remove any leftover processes on port 3000
echo "🔍 Checking for processes on port 3000..."
sudo lsof -ti:3000 | xargs -r sudo kill -9

# Clean up any node processes
echo "🔍 Cleaning up node processes..."
sudo pkill -f "node.*repario"
sudo pkill -f "node.*3000"

# Reset nginx to default
echo "🔄 Resetting nginx to default..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Test nginx
sudo nginx -t

echo "✅ VPS cleanup complete!"
echo "🚀 Your VPS is now ready for fresh Repario deployment"
echo ""
echo "Next steps:"
echo "1. Upload your deploy folder: scp -r deploy/ user@your-vps-ip:/var/www/repario/"
echo "2. Follow the deployment guide to install fresh"
