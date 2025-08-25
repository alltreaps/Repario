#!/bin/bash

echo "🔄 Restarting Repario Backend"
echo "============================="

# Navigate to backend directory
cd /var/www/repario/backend

echo "1. Stopping any existing PM2 processes..."
pm2 stop repario-backend 2>/dev/null || echo "No existing PM2 process found"
pm2 delete repario-backend 2>/dev/null || echo "No existing PM2 process to delete"

echo ""
echo "2. Killing any Node.js processes on port 3000..."
pkill -f "node.*3000" || echo "No Node.js processes found on port 3000"

echo ""
echo "3. Checking if .env file exists..."
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual database credentials!"
fi

echo ""
echo "4. Installing/updating dependencies..."
npm install

echo ""
echo "5. Starting backend with PM2..."
pm2 start ecosystem.config.production.js

echo ""
echo "6. Checking PM2 status..."
pm2 list

echo ""
echo "7. Showing recent logs..."
pm2 logs repario-backend --lines 10

echo ""
echo "8. Testing backend connection..."
sleep 3
curl -f http://localhost:3000/api/health && echo "✅ Backend is responding!" || echo "❌ Backend still not responding"

echo ""
echo "9. Restarting nginx..."
systemctl restart nginx

echo ""
echo "✅ Backend restart complete!"
echo "Check the logs above for any errors."
