#!/usr/bin/env bash
set -e

VPS_USER=root
VPS_PASS=WassupGOD12
VPS_HOST=167.86.71.114
ROOT=/var/www/repario

# 1) Build frontend & backend
npm --prefix ./frontend run build
npm --prefix ./backend run build

# 2) Upload FRONTEND build
sshpass -p "$VPS_PASS" rsync -avz --delete \
  --exclude 'assets/' \
  ./frontend/dist/  ${VPS_USER}@${VPS_HOST}:${ROOT}/frontend/

# 3) Upload FRONTEND assets
sshpass -p "$VPS_PASS" rsync -avz ./frontend/dist/assets/ \
  ${VPS_USER}@${VPS_HOST}:${ROOT}/frontend/assets/

# 4) Upload BACKEND build
sshpass -p "$VPS_PASS" rsync -avz --delete \
  ./backend/dist/   ${VPS_USER}@${VPS_HOST}:${ROOT}/backend/dist/

# 5) Restart backend service with PM2 (change name if different)
sshpass -p "$VPS_PASS" ssh ${VPS_USER}@${VPS_HOST} "pm2 reload repario-backend || pm2 restart repario-backend"

echo "✅ Deployed & backend restarted successfully!"
