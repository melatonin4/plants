#!/bin/bash
echo "🚀 Generating snippets and deploying..."

# Generate snippets-data.js
echo "🔄 Generating snippets from image folders..."
node gen-snips.js

# Remove .DS_Store files
find . -name ".DS_Store" -delete

# Deploy to GitHub
echo "📤 Deploying to GitHub..."
git add .
git commit -m "Update: $(date '+%Y-%m-%d %H:%M') - Auto-generated snippets"
git push origin main

echo "✅ Done! Vercel will auto-deploy."
echo "🌐 Check: https://plants-melatonin4.vercel.app"