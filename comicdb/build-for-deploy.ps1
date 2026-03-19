# Run this from the comicdb directory before FTP uploading
# Usage: powershell -ExecutionPolicy Bypass -File build-for-deploy.ps1

$ErrorActionPreference = "Stop"
$UploadDir = ".\deploy-upload"

Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
npm ci

Write-Host "==> Building Next.js app..." -ForegroundColor Cyan
npm run build

Write-Host "==> Assembling upload folder at $UploadDir ..." -ForegroundColor Cyan

# Start fresh
if (Test-Path $UploadDir) { Remove-Item -Recurse -Force $UploadDir }
New-Item -ItemType Directory -Path $UploadDir | Out-Null

# Copy standalone server output
Copy-Item -Recurse ".next\standalone\*" $UploadDir

# Static assets must live inside the standalone tree
Copy-Item -Recurse ".next\static" "$UploadDir\.next\static"

# Public folder (images, favicons, etc.)
if (Test-Path "public") {
    Copy-Item -Recurse "public" "$UploadDir\public"
}

# PM2 config
Copy-Item "ecosystem.config.js" $UploadDir

Write-Host ""
Write-Host "==> Done! Upload the contents of '$UploadDir' to ~/comicdb/ on pair.com" -ForegroundColor Green
Write-Host "    Then SSH in and run:" -ForegroundColor Green
Write-Host "      pm2 restart ecosystem.config.js --update-env" -ForegroundColor Yellow
Write-Host "    (or 'pm2 start ecosystem.config.js' on first deploy)" -ForegroundColor Yellow
