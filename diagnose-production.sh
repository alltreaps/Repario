#!/bin/bash

# Repario Production Diagnostic Script
# This script helps diagnose issues with the production deployment

echo "🔍 Repario Production Diagnostics"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if backend service is running
print_section "Backend Service Status"
if systemctl is-active --quiet repario-backend; then
    print_status "Backend service is running"
    systemctl status repario-backend --no-pager -l
else
    print_error "Backend service is not running"
    echo "Recent logs:"
    journalctl -u repario-backend --no-pager -l --since "1 hour ago"
fi

# Check if backend is responding on port 3000
print_section "Backend API Health Check"
if curl -f -s http://localhost:3000/health > /dev/null; then
    print_status "Backend API is responding on port 3000"
    echo "Health response:"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
else
    print_error "Backend API is not responding on port 3000"
fi

# Check nginx configuration
print_section "Nginx Configuration"
if nginx -t 2>/dev/null; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    nginx -t
fi

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
fi

# Test API through nginx proxy
print_section "API Proxy Test"
if curl -f -s -H "Host: repario.app" http://localhost/api/health > /dev/null; then
    print_status "API proxy through nginx is working"
else
    print_error "API proxy through nginx is not working"
fi

# Check SSL certificates
print_section "SSL Certificate Status"
if [ -f "/etc/ssl/certs/repario.app.crt" ]; then
    print_status "SSL certificate exists"
    openssl x509 -in /etc/ssl/certs/repario.app.crt -noout -dates
else
    print_warning "SSL certificate not found at /etc/ssl/certs/repario.app.crt"
fi

# Check disk space
print_section "System Resources"
echo "Disk usage:"
df -h /var/www/repario
echo ""
echo "Memory usage:"
free -h
echo ""
echo "CPU load:"
uptime

# Check recent nginx logs
print_section "Recent Nginx Logs"
echo "Access logs (last 10 lines):"
tail -n 10 /var/log/nginx/repario.app.access.log 2>/dev/null || print_warning "Access log not found"
echo ""
echo "Error logs (last 10 lines):"
tail -n 10 /var/log/nginx/repario.app.error.log 2>/dev/null || print_warning "Error log not found"

# Check backend logs
print_section "Recent Backend Logs"
echo "Backend service logs (last 20 lines):"
journalctl -u repario-backend --no-pager -l -n 20

# Test external connectivity
print_section "External Connectivity Test"
echo "Testing external access to repario.app..."
if curl -f -s -I https://repario.app > /dev/null; then
    print_status "External HTTPS access is working"
else
    print_error "External HTTPS access is not working"
fi

# Check environment variables
print_section "Environment Configuration"
echo "Backend environment file:"
if [ -f "/var/www/repario/backend/.env" ]; then
    print_status ".env file exists"
    echo "Environment variables (sensitive values hidden):"
    grep -v "SECRET\|KEY\|PASSWORD" /var/www/repario/backend/.env || echo "No non-sensitive variables found"
else
    print_error ".env file not found"
fi

echo ""
echo "🏁 Diagnostics completed!"
echo ""
echo "💡 Common fixes:"
echo "  - If backend service is not running: sudo systemctl start repario-backend"
echo "  - If nginx has errors: sudo nginx -t && sudo systemctl reload nginx"
echo "  - If SSL issues: Check certificate paths and permissions"
echo "  - If API not responding: Check backend logs with 'journalctl -u repario-backend -f'"
