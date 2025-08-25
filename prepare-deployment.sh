#!/bin/bash

# Prepare deployment package for Repario
echo "📦 Preparing Repario deployment package..."

# Create deployment directory
mkdir -p deployment-package
cd deployment-package

# Copy backend files
echo "📁 Copying backend files..."
cp -r ../backend ./
cp -r ../frontend/dist ./frontend

# Copy deployment scripts
echo "📜 Copying deployment scripts..."
cp ../deploy-backend.sh ./
cp ../diagnose-production.sh ./
cp ../nginx.conf ./

# Copy environment files
cp ../backend/.env ./backend/.env.production

# Create a simple upload script
cat > upload-to-server.sh << 'EOF'
#!/bin/bash

# Upload deployment package to production server
# Usage: ./upload-to-server.sh [server-ip-or-domain] [username]

SERVER=${1:-"your-server-ip"}
USER=${2:-"root"}

echo "🚀 Uploading deployment package to $USER@$SERVER..."

# Upload the entire deployment package
scp -r ./* $USER@$SERVER:/tmp/repario-deployment/

echo "✅ Upload completed!"
echo ""
echo "Now SSH to your server and run:"
echo "  ssh $USER@$SERVER"
echo "  cd /tmp/repario-deployment"
echo "  sudo bash deploy-backend.sh"

EOF

chmod +x upload-to-server.sh
chmod +x deploy-backend.sh
chmod +x diagnose-production.sh

echo "✅ Deployment package prepared in ./deployment-package/"
echo ""
echo "📋 Next steps:"
echo "1. cd deployment-package"
echo "2. ./upload-to-server.sh [your-server-ip] [username]"
echo "3. SSH to your server and run the deployment script"
