#!/bin/bash

# Repario Backend Deployment Script
# This script deploys the backend to production with proper configuration

set -e  # Exit on any error

echo "🚀 Starting Repario Backend Deployment..."

# Configuration
BACKEND_DIR="/var/www/repario/backend"
SERVICE_NAME="repario-backend"
NODE_USER="www-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Stop existing backend service if running
print_status "Stopping existing backend service..."
systemctl stop $SERVICE_NAME 2>/dev/null || print_warning "Service was not running"

# Create backend directory if it doesn't exist
print_status "Creating backend directory..."
mkdir -p $BACKEND_DIR
chown $NODE_USER:$NODE_USER $BACKEND_DIR

# Copy backend files
print_status "Copying backend files..."
cp -r ./backend/* $BACKEND_DIR/
chown -R $NODE_USER:$NODE_USER $BACKEND_DIR

# Install dependencies
print_status "Installing Node.js dependencies..."
cd $BACKEND_DIR
sudo -u $NODE_USER npm install --production

# Build TypeScript
print_status "Building TypeScript..."
sudo -u $NODE_USER npm run build

# Create systemd service file
print_status "Creating systemd service..."
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Repario Backend API Server
After=network.target

[Service]
Type=simple
User=$NODE_USER
WorkingDirectory=$BACKEND_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
print_status "Configuring systemd service..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME

# Start the service
print_status "Starting backend service..."
systemctl start $SERVICE_NAME

# Check service status
sleep 3
if systemctl is-active --quiet $SERVICE_NAME; then
    print_status "Backend service is running successfully!"
    
    # Show service status
    echo ""
    echo "📊 Service Status:"
    systemctl status $SERVICE_NAME --no-pager -l
    
    # Test API endpoint
    echo ""
    echo "🔍 Testing API endpoint..."
    if curl -f -s http://localhost:3000/health > /dev/null; then
        print_status "API health check passed!"
    else
        print_warning "API health check failed - check logs"
    fi
    
else
    print_error "Failed to start backend service!"
    echo ""
    echo "📋 Service logs:"
    journalctl -u $SERVICE_NAME --no-pager -l
    exit 1
fi

# Show useful commands
echo ""
echo "📚 Useful commands:"
echo "  View logs: journalctl -u $SERVICE_NAME -f"
echo "  Restart:   systemctl restart $SERVICE_NAME"
echo "  Stop:      systemctl stop $SERVICE_NAME"
echo "  Status:    systemctl status $SERVICE_NAME"

print_status "Backend deployment completed successfully! 🎉"
