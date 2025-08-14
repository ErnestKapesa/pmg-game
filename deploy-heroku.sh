#!/bin/bash

# Heroku Deployment Script for Colyseus Server
# Usage: ./deploy-heroku.sh [app-name]

set -e

APP_NAME=${1:-"your-game-server"}

echo "🚀 Deploying Colyseus server to Heroku..."
echo "App name: $APP_NAME"

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first."
    echo "Visit: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Login check
echo "🔐 Checking Heroku authentication..."
if ! heroku auth:whoami &> /dev/null; then
    echo "Please login to Heroku first:"
    heroku login
fi

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
fi

# Create Heroku app if it doesn't exist
echo "🏗️  Creating/checking Heroku app..."
if ! heroku apps:info $APP_NAME &> /dev/null; then
    echo "Creating new Heroku app: $APP_NAME"
    heroku create $APP_NAME
else
    echo "Using existing Heroku app: $APP_NAME"
fi

# Add Heroku remote if not exists
if ! git remote get-url heroku &> /dev/null; then
    echo "🔗 Adding Heroku remote..."
    heroku git:remote -a $APP_NAME
fi

# Set environment variables
echo "⚙️  Setting environment variables..."
heroku config:set NODE_ENV=production -a $APP_NAME

# Deploy
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku" || echo "No changes to commit"
git push heroku main

# Get the app URL
APP_URL=$(heroku apps:info $APP_NAME --json | grep '"web_url"' | cut -d'"' -f4)
echo "✅ Deployment complete!"
echo "🌐 Your server is available at: $APP_URL"
echo "🔍 Monitor: ${APP_URL}monitor"
echo "🎮 Test endpoint: ${APP_URL}hello_world"

# Show logs
echo "📋 Recent logs:"
heroku logs --tail -n 20 -a $APP_NAME

echo ""
echo "🎯 Next steps:"
echo "1. Update your client .env.local file:"
echo "   NEXT_PUBLIC_COLYSEUS_SERVER_URL=${APP_URL/https:/wss:}"
echo "2. Deploy your client to Vercel"
echo "3. Set the environment variable in Vercel dashboard"