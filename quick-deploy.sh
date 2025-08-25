#!/bin/bash

# Quick deployment script for Repario backend
# Run this directly on your production server

echo "🚀 Quick Repario Backend Deployment"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Stop existing services
print_status "Stopping existing services..."
systemctl stop repario-backend 2>/dev/null || print_warning "Backend service was not running"

# Create directories
print_status "Creating directories..."
mkdir -p /var/www/repario/backend
mkdir -p /var/www/repario/frontend

# Check if we have the current backend files
if [ -d "/var/www/repario/backend" ] && [ -f "/var/www/repario/backend/package.json" ]; then
    print_status "Found existing backend installation"
    cd /var/www/repario/backend
    
    # Install/update dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Build if TypeScript source exists
    if [ -f "src/index.ts" ]; then
        print_status "Building TypeScript..."
        npm run build
    fi
else
    print_error "Backend files not found in /var/www/repario/backend"
    print_warning "You need to upload your backend files first"
    exit 1
fi

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/repario-backend.service << EOF
[Unit]
Description=Repario Backend API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/repario/backend
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=repario-backend

[Install]
WantedBy=multi-user.target
EOF

# Set proper permissions
print_status "Setting permissions..."
chown -R www-data:www-data /var/www/repario/backend

# Reload and start service
print_status "Starting backend service..."
systemctl daemon-reload
systemctl enable repario-backend
systemctl start repario-backend

# Wait and check status
sleep 3
if systemctl is-active --quiet repario-backend; then
    print_status "Backend service started successfully!"
    
    # Test health endpoint
    if curl -f -s http://localhost:3000/health > /dev/null; then
        print_status "API health check passed!"
    else
        print_warning "API health check failed"
    fi
    
    # Show status
    systemctl status repario-backend --no-pager -l
else
    print_error "Failed to start backend service"
    echo "Logs:"
    journalctl -u repario-backend --no-pager -l -n 20
fi

print_status "Deployment completed!"
echo ""
echo "📚 Useful commands:"
echo "  View logs: journalctl -u repario-backend -f"
echo "  Restart:   systemctl restart repario-backend"
echo "  Status:    systemctl status repario-backend"
