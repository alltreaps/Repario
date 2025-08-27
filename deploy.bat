@echo off
echo 🚀 Starting Repario deployment...

REM Generate new version for this deployment
echo 🔢 Generating new version...
node scripts\generate-version.js

REM Build frontend
echo 📦 Building frontend...
cd frontend
call npm run build
cd ..

REM Build backend
echo 📦 Building backend...
cd backend
call npm run build
cd ..

REM Create deployment package
echo 📋 Creating deployment package...
if not exist deploy mkdir deploy
if not exist deploy\backend mkdir deploy\backend
if not exist deploy\frontend mkdir deploy\frontend

REM Copy backend files
xcopy /E /I /Y backend\dist deploy\backend\dist
xcopy /E /I /Y backend\node_modules deploy\backend\node_modules
copy /Y backend\package.json deploy\backend\
copy /Y backend\ecosystem.config.production.js deploy\backend\
copy /Y backend\.env deploy\backend\.env

REM Copy frontend files
xcopy /E /I /Y frontend\dist deploy\frontend

REM Copy nginx and SSL setup files
copy /Y nginx.conf deploy\
copy /Y setup-ssl.sh deploy\

echo ✅ Deployment package created in .\deploy directory
echo 📁 Upload the .\deploy directory to your VPS
echo 🔧 Don't forget to update your .env file with production values!
echo.
echo Next steps:
echo 1. Update deploy\backend\.env with your production values
echo 2. Upload deploy folder to your VPS: scp -r deploy/ user@your-vps-ip:/var/www/repario/
echo 3. Follow the deployment guide steps on your VPS
pause
