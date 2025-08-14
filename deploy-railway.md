# 🚀 Railway Deployment Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and create a new repository
2. Name it: `pmg-game-server`
3. Make it **Public** (required for Railway free tier)
4. Don't initialize with README (we already have files)

## Step 2: Push Code to GitHub

Run these commands in your terminal (my-server directory):

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/pmg-game-server.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy on Railway

1. Go to [Railway.app](https://railway.app)
2. Sign up with your **GitHub account**
3. Click **"Deploy from GitHub repo"**
4. Select your `pmg-game-server` repository
5. Railway will automatically:
   - Detect Node.js
   - Run `npm install`
   - Run `npm run build`
   - Start with `npm run start:prod`

## Step 4: Get Your Server URL

After deployment:
1. Go to your Railway project dashboard
2. Click on your service
3. Go to **Settings** → **Domains**
4. Copy the generated URL (e.g., `https://pmg-game-server-production.up.railway.app`)

## Step 5: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `pmg-ruddy`
3. Go to **Settings** → **Environment Variables**
4. Update `NEXT_PUBLIC_COLYSEUS_SERVER_URL` to:
   ```
   wss://your-railway-url.up.railway.app
   ```
   (Replace `your-railway-url` with your actual Railway URL)
5. **Important**: Use `wss://` not `ws://` for secure WebSocket connection

## Step 6: Redeploy Vercel

In your main project directory:
```bash
npx vercel --prod
```

## 🎯 Quick Commands Summary

```bash
# In my-server directory
git remote add origin https://github.com/YOUR_USERNAME/pmg-game-server.git
git branch -M main
git push -u origin main

# Then deploy on Railway website
# Get URL and update Vercel env vars
# Redeploy Vercel
```

## ✅ Testing Your Deployment

1. **Test server health**: Visit `https://your-railway-url.up.railway.app/hello_world`
2. **Test your game**: Go to `https://pmg-ruddy.vercel.app/`
3. **Check WebSocket**: Open browser console and look for connection messages

## 🆘 Troubleshooting

- **Railway build fails**: Check build logs in Railway dashboard
- **WebSocket connection fails**: Ensure you're using `wss://` not `ws://`
- **Game doesn't connect**: Verify environment variable is updated in Vercel
- **CORS errors**: Check that your Vercel domain is allowed in server CORS settings

---

**Your multiplayer game will be live once these steps are complete! 🎮**