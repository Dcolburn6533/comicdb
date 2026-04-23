#!/bin/bash
# Build and populate deploy-upload/ for Pair Networks (vps3712)
# Usage: bash deploy.sh
# Then upload the contents of deploy-upload/ to ~/public_html/marketplacecomics.com/ via SFTP/SCP

set -e

DEPLOY_DIR="$(dirname "$0")/deploy-upload"

echo "==> Installing dependencies..."
npm ci

echo "==> Building Next.js app..."
npm run build

echo "==> Clearing previous deploy-upload contents..."
rm -rf "$DEPLOY_DIR/.next"
rm -rf "$DEPLOY_DIR/node_modules"
rm -f  "$DEPLOY_DIR/server.js"
rm -f  "$DEPLOY_DIR/.env.local"
rm -f  "$DEPLOY_DIR/package.json"

echo "==> Copying standalone server..."
cp .next/standalone/server.js "$DEPLOY_DIR/server.js"

echo "==> Copying built app files..."
cp -r .next/standalone/.next "$DEPLOY_DIR/.next"

echo "==> Copying static assets into build..."
cp -r .next/static "$DEPLOY_DIR/.next/static"

echo "==> Copying public folder..."
cp -r public "$DEPLOY_DIR/public"

echo "==> Copying standalone node_modules..."
cp -r .next/standalone/node_modules "$DEPLOY_DIR/node_modules"

echo "==> Copying .env.local..."
if [ -f .env.local ]; then
  cp .env.local "$DEPLOY_DIR/.env.local"
else
  echo "    WARNING: .env.local not found — remember to add it to the server manually."
fi

echo "==> Copying package.json..."
cp package.json "$DEPLOY_DIR/package.json"

echo ""
echo "Done! deploy-upload/ is ready."
echo ""
echo "Upload deploy-upload/ contents to the server, then restart:"
echo "  pkill -f 'node server.js' || true"
echo "  nohup node server.js > ~/app.log 2>&1 &"
