# Heroku Deployment Script for Colyseus Server (PowerShell)
# Usage: .\deploy-heroku.ps1 [app-name]

param(
    [string]$AppName = "your-game-server"
)

Write-Host "🚀 Deploying Colyseus server to Heroku..." -ForegroundColor Green
Write-Host "App name: $AppName" -ForegroundColor Yellow

# Check if Heroku CLI is installed
try {
    heroku --version | Out-Null
} catch {
    Write-Host "❌ Heroku CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
    exit 1
}

# Login check
Write-Host "🔐 Checking Heroku authentication..." -ForegroundColor Blue
try {
    heroku auth:whoami | Out-Null
} catch {
    Write-Host "Please login to Heroku first:" -ForegroundColor Yellow
    heroku login
}

# Initialize git if needed
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing git repository..." -ForegroundColor Blue
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
}

# Create Heroku app if it doesn't exist
Write-Host "🏗️  Creating/checking Heroku app..." -ForegroundColor Blue
try {
    heroku apps:info $AppName | Out-Null
    Write-Host "Using existing Heroku app: $AppName" -ForegroundColor Green
} catch {
    Write-Host "Creating new Heroku app: $AppName" -ForegroundColor Yellow
    heroku create $AppName
}

# Add Heroku remote if not exists
try {
    git remote get-url heroku | Out-Null
} catch {
    Write-Host "🔗 Adding Heroku remote..." -ForegroundColor Blue
    heroku git:remote -a $AppName
}

# Set environment variables
Write-Host "⚙️  Setting environment variables..." -ForegroundColor Blue
heroku config:set NODE_ENV=production -a $AppName

# Deploy
Write-Host "🚀 Deploying to Heroku..." -ForegroundColor Green
git add .
try {
    git commit -m "Deploy to Heroku"
} catch {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}
git push heroku main

# Get the app URL
$AppInfo = heroku apps:info $AppName --json | ConvertFrom-Json
$AppUrl = $AppInfo.app.web_url

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your server is available at: $AppUrl" -ForegroundColor Cyan
Write-Host "🔍 Monitor: ${AppUrl}monitor" -ForegroundColor Cyan
Write-Host "🎮 Test endpoint: ${AppUrl}hello_world" -ForegroundColor Cyan

# Show logs
Write-Host "📋 Recent logs:" -ForegroundColor Blue
heroku logs --tail -n 20 -a $AppName

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Green
Write-Host "1. Update your client .env.local file:" -ForegroundColor Yellow
$WebSocketUrl = $AppUrl -replace "https:", "wss:"
Write-Host "   NEXT_PUBLIC_COLYSEUS_SERVER_URL=$WebSocketUrl" -ForegroundColor Cyan
Write-Host "2. Deploy your client to Vercel" -ForegroundColor Yellow
Write-Host "3. Set the environment variable in Vercel dashboard" -ForegroundColor Yellow