# Repario App VPS Deployment Guide

This guide will walk you through deploying your Repario app to your VPS with the domain `repario.app`.

## Prerequisites

- VPS with Ubuntu/Debian (recommended)
- Domain `repario.app` pointing to your VPS IP
- SSH access to your VPS
- Node.js 18+ installed on VPS
- PM2 installed globally (`npm install -g pm2`)
- Nginx installed

## Step 1: Prepare Local Build

1. **Build the application locally:**
   ```bash
   # In your project root
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Update your backend .env file** in the `deploy` folder with your production values:
   ```env
   # Server Configuration
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=production

   # Frontend URL for CORS
   FRONTEND_URL=https://repario.app

   # API URL (optional, for /config endpoint)
   API_URL=https://repario.app

   # JWT Configuration
   JWT_SECRET=your-actual-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-actual-super-secret-refresh-key

   # Supabase Configuration
   SUPABASE_URL=https://dntblbqgplwegjnbyjey.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-actual-supabase-service-role-key
   ```

## Step 2: Upload to VPS

1. **Upload the deploy folder to your VPS:**
   ```bash
   # From your local machine
   scp -r deploy/ user@your-vps-ip:/var/www/repario/
   ```

2. **SSH into your VPS:**
   ```bash
   ssh user@your-vps-ip
   ```

## Step 3: Setup Application on VPS

1. **Create application directory and set permissions:**
   ```bash
   sudo mkdir -p /var/www/repario
   sudo chown -R $USER:$USER /var/www/repario
   ```

2. **Move files to correct locations:**
   ```bash
   # Backend files
   sudo cp -r /var/www/repario/deploy/* /var/www/repario/backend/
   
   # Frontend files
   sudo mkdir -p /var/www/repario/frontend
   sudo cp -r /var/www/repario/deploy/frontend/* /var/www/repario/frontend/
   ```

3. **Install backend dependencies (if not copied):**
   ```bash
   cd /var/www/repario/backend
   npm install --production
   ```

4. **Create logs directory:**
   ```bash
   mkdir -p /var/www/repario/backend/logs
   ```

## Step 4: Setup PM2 for Backend

1. **Start the backend with PM2:**
   ```bash
   cd /var/www/repario/backend
   pm2 start ecosystem.config.production.js
   ```

2. **Save PM2 configuration:**
   ```bash
   pm2 save
   pm2 startup
   # Follow the instructions shown by the startup command
   ```

## Step 5: Setup Nginx

1. **Copy nginx configuration:**
   ```bash
   sudo cp /path/to/your/nginx.conf /etc/nginx/sites-available/repario.app
   ```

2. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/repario.app /etc/nginx/sites-enabled/
   ```

3. **Remove default nginx site (if exists):**
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

4. **Test nginx configuration:**
   ```bash
   sudo nginx -t
   ```

## Step 6: Setup SSL Certificates

1. **Make SSL setup script executable and run it:**
   ```bash
   chmod +x setup-ssl.sh
   sudo ./setup-ssl.sh
   ```

   Or manually:
   ```bash
   # Install certbot
   sudo apt update
   sudo apt install -y certbot python3-certbot-nginx

   # Get certificate
   sudo certbot --nginx -d repario.app -d www.repario.app
   ```

## Step 7: Final Steps

1. **Restart services:**
   ```bash
   sudo systemctl restart nginx
   pm2 restart all
   ```

2. **Check status:**
   ```bash
   # Check nginx status
   sudo systemctl status nginx
   
   # Check PM2 status
   pm2 status
   
   # Check logs
   pm2 logs repario-backend
   ```

3. **Test your application:**
   - Visit `https://repario.app`
   - Check that API endpoints work
   - Test authentication flow

## Troubleshooting

### Backend Issues
```bash
# Check backend logs
pm2 logs repario-backend

# Restart backend
pm2 restart repario-backend
```

### Nginx Issues
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/repario.app.error.log

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew
```

### Firewall Setup
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh
sudo ufw enable
```

## Environment Variables Checklist

Make sure these are set in your backend `.env` file:
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- [ ] `JWT_SECRET` - Strong random secret for JWT tokens
- [ ] `JWT_REFRESH_SECRET` - Strong random secret for refresh tokens
- [ ] `FRONTEND_URL=https://repario.app`
- [ ] `NODE_ENV=production`

## Post-Deployment

1. **Monitor your application:**
   ```bash
   pm2 monit
   ```

2. **Setup log rotation:**
   ```bash
   pm2 install pm2-logrotate
   ```

3. **Regular backups:**
   - Database (Supabase handles this)
   - Application files
   - SSL certificates

Your Repario app should now be live at `https://repario.app`! 🚀
