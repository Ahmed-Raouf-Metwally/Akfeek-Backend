#!/bin/bash

# Quick CORS Fix for Production Server
# Run this on: akfeek-backend.developteam.site

echo "🔧 Fixing CORS on Production Server..."

# 1. Navigate to project directory
cd /path/to/Akfeek-Backend

# 2. Update .env file
echo "Updating .env..."
sed -i 's/CORS_ALLOWED_ORIGINS=.*/CORS_ALLOWED_ORIGINS="*"/' .env

# Verify the change
echo "Current CORS setting:"
grep CORS_ALLOWED_ORIGINS .env

# 3. Restart application
echo "Restarting application..."

# If using PM2:
pm2 restart akfeek-backend

# OR if using systemd:
# systemctl restart akfeek-backend

# OR if using npm directly:
# pkill -f "node src/server.js"
# npm run dev &

echo "✅ Done! Test CORS now:"
echo "curl -I https://akfeek-backend.developteam.site/api/vehicles/brands"
