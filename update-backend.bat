@echo off
echo 🔄 Updating backend with CORS fix...

REM Create temporary update directory
if not exist backend-update mkdir backend-update

REM Copy only the compiled dist folder
xcopy /E /I /Y backend\dist backend-update\dist

echo ✅ Backend update package created in .\backend-update directory
echo 📁 Upload the .\backend-update\dist folder to your VPS
echo.
echo Next steps on VPS:
echo 1. Stop PM2: pm2 stop repario-backend
echo 2. Upload: Replace /var/www/repario/backend/dist/ with the new dist folder
echo 3. Restart PM2: pm2 restart repario-backend
echo 4. Test: curl http://localhost:3000/api/layouts
pause
