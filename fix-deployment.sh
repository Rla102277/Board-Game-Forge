#!/bin/bash
# Fix deployment cache issues

echo "=== Clearing build cache and rebuilding ==="
cd /Users/randyarchambault/Documents/Projects/Code/Board-Game-Forge/artifacts/gameforge

# Clear all caches
rm -rf dist
rm -rf node_modules/.vite
rm -rf node_modules/.cache

# Rebuild
echo "=== Building ==="
npm run build

# Check if build succeeded
if [ ! -d "dist/assets" ]; then
    echo "ERROR: Build failed - dist/assets directory not created"
    exit 1
fi

echo "=== Build complete ==="
echo "Files in dist/assets:"
ls -la dist/assets/ | head -20

echo ""
echo "=== Next steps ==="
echo "1. Ensure your web server (nginx/Apache) serves index.html with NO CACHE headers"
echo "2. Ensure JS/CSS files in assets/ have proper cache-busting hashes"
echo "3. Deploy the entire dist/ folder"
echo "4. Invalidate any CDN cache (CloudFlare, etc.)"
