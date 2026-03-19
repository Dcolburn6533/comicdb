#!/bin/bash
# Deploy script for pair.com
# Usage: bash deploy.sh
# Prerequisites: Node.js and PM2 installed on the server (npm install -g pm2)

set -e

echo "==> Installing dependencies..."
npm ci

echo "==> Building Next.js app..."
npm run build

echo "==> Copying static assets into standalone output..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Copying .env.local into standalone output..."
if [ -f .env.local ]; then
  cp .env.local .next/standalone/.env.local
fi

echo "==> Starting / restarting with PM2..."
pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js

echo "==> Saving PM2 process list so it survives reboots..."
pm2 save

echo ""
echo "Done! App is running. Check status with: pm2 status"
