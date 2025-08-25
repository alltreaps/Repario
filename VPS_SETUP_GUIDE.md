# 🚀 VPS Setup Guide for Repario.app

This is a **step-by-step guide** to set up your VPS from scratch for deploying Repario app.

## Prerequisites
- Fresh Ubuntu/Debian VPS
- Domain `repario.app` pointing to your VPS IP address
- SSH access to your VPS

---

## STEP 1: Initial VPS Setup

### 1.1 Connect to your VPS
```bash
ssh root@your-vps-ip
# or
ssh user@your-vps-ip
```

### 1.2 Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install essential packages
```bash
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

---

## STEP 2: Install Node.js

### 2.1 Install Node.js 18.x (LTS)
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.2 Install PM2 globally
```bash
sudo npm install -g pm2
```

---

## STEP 3: Install and Configure Nginx

### 3.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 3.2 Start and enable Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.3 Check Nginx status
```bash
sudo systemctl status nginx
```

### 3.4 Configure firewall (if UFW is enabled)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw --force enable
```

---

## STEP 4: Create Application Directory

### 4.1 Create directory structure
```bash
sudo mkdir -p /var/www/repario/backend
sudo mkdir -p /var/www/repario/frontend
```

### 4.2 Set ownership
```bash
sudo chown -R $USER:$USER /var/www/repario
```

---

## STEP 5: Configure Nginx for Repario

### 5.1 Remove default nginx site
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

### 5.2 Create Repario nginx configuration
```bash
sudo nano /etc/nginx/sites-available/repario.app
```

**Copy and paste this configuration:**

```nginx
server {
    listen 80;
    server_name repario.app www.repario.app;
    
    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;
    
    # Temporary HTTP configuration for initial setup
    root /var/www/repario/frontend;
    index index.html;

    # Handle frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers for API
        add_header 'Access-Control-Allow-Origin' 'http://repario.app' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'http://repario.app';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Logs
    access_log /var/log/nginx/repario.app.access.log;
    error_log /var/log/nginx/repario.app.error.log;
}
```

### 5.3 Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/repario.app /etc/nginx/sites-enabled/
```

### 5.4 Test nginx configuration
```bash
sudo nginx -t
```

### 5.5 Reload nginx
```bash
sudo systemctl reload nginx
```

---

## STEP 6: Install SSL Certificates (Let's Encrypt)

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Get SSL certificate
```bash
sudo certbot --nginx -d repario.app -d www.repario.app
```

**Follow the prompts:**
- Enter your email address
- Agree to terms of service
- Choose whether to share email with EFF (optional)
- Certbot will automatically configure SSL in your nginx config

### 6.3 Test SSL renewal
```bash
sudo certbot renew --dry-run
```

---

## STEP 7: Verify Setup

### 7.1 Check nginx status
```bash
sudo systemctl status nginx
```

### 7.2 Check if ports are listening
```bash
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### 7.3 Test domain access
```bash
curl -I http://repario.app
curl -I https://repario.app
```

---

## STEP 8: Prepare for Application Deployment

### 8.1 Create PM2 ecosystem directory
```bash
mkdir -p /var/www/repario/backend/logs
```

### 8.2 Test PM2
```bash
pm2 list
```

---

## ✅ VPS Setup Complete!

Your VPS is now ready for Repario deployment with:
- ✅ Node.js 18.x installed
- ✅ PM2 for process management
- ✅ Nginx configured and running
- ✅ SSL certificates installed
- ✅ Directory structure created
- ✅ Firewall configured

## Next Steps:
1. Build your application locally: `.\deploy.bat`
2. Upload to VPS: `scp -r deploy/ user@your-vps-ip:/var/www/repario/`
3. Deploy the application (follow deployment guide)

## Troubleshooting Commands:

```bash
# Check nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/repario.app.error.log

# Restart services
sudo systemctl restart nginx
sudo systemctl restart pm2

# Check firewall
sudo ufw status

# Check SSL certificate
sudo certbot certificates
```
