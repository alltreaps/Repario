#!/bin/bash

echo "🔍 Repario Backend Diagnostics"
echo "================================"

# Check if PM2 is installed and running
echo "1. Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 is installed"
    pm2 list
    echo ""
    echo "PM2 logs for repario-backend:"
    pm2 logs repario-backend --lines 20
else
    echo "❌ PM2 is not installed or not in PATH"
fi

echo ""
echo "2. Checking if Node.js backend process is running..."
ps aux | grep node | grep -v grep

echo ""
echo "3. Checking what's listening on port 3000..."
netstat -tlnp | grep :3000 || ss -tlnp | grep :3000

echo ""
echo "4. Checking nginx status..."
systemctl status nginx

echo ""
echo "5. Checking nginx configuration test..."
nginx -t

echo ""
echo "6. Checking backend directory and files..."
ls -la /var/www/repario/backend/

echo ""
echo "7. Checking if .env file exists in backend..."
ls -la /var/www/repario/backend/.env

echo ""
echo "8. Testing direct backend connection (if running)..."
curl -v http://localhost:3000/api/health || echo "❌ Backend not responding on localhost:3000"

echo ""
echo "9. Recent system logs..."
journalctl -u nginx --lines 10
