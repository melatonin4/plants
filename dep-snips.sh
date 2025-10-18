#!/bin/bash

# ... your existing color definitions ...

echo -e "${BLUE} Generating snippets and deploying...${NC}"

# Simple image check without compression
check_image_sizes() {
    local max_size_mb=5
    local large_files=0
    
    echo -e "${BLUE_ICON} 🔍 Checking image sizes...${NC}"
    
    find public/images -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r file; do
        size_mb=$(du -m "$file" 2>/dev/null | cut -f1)
        
        if [ -n "$size_mb" ] && [ "$size_mb" -gt "$max_size_mb" ]; then
            echo -e "${RED_ICON} WARNING: Large image: ${RED}$file (${size_mb}MB)${NC}"
            large_files=$((large_files + 1))
        fi
    done
    
    if [ "$large_files" -gt 0 ]; then
        echo -e "${RED_ICON} ⚠️  Found $large_files images >5MB - consider compressing manually${NC}"
        echo -e "${YELLOW} Quick compress: open Preview → Tools → Adjust Size → Set to 2000px width${NC}"
    else
        echo -e "${GREEN_ICON} ✅ All images are reasonably sized${NC}"
    fi
}

check_image_sizes


# Colors for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Icons
YELLOW_ICON='🟡'
GREEN_ICON='🟢'
BLUE_ICON='🔵'
RED_ICON='🔴'

echo -e "${BLUE} Generating snippets and deploying...${NC}"

# Image compression function
compress_large_images() {
    local max_size_mb=5
    local compressed_count=0
    
    echo -e "${BLUE_ICON} 🔍 Checking for large images (>${max_size_mb}MB)...${NC}"
    
    # Find all JPEG/JPG/PNG files larger than max_size_mb
    find public/images -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -size +${max_size_mb}M | while read -r file; do
        size_mb=$(du -m "$file" 2>/dev/null | cut -f1)
        
        if [ -n "$size_mb" ] && [ "$size_mb" -gt "$max_size_mb" ]; then
            echo -e "${YELLOW_ICON} Compressing: ${YELLOW}$file (${size_mb}MB)${NC}"
            
            # Create backup
            backup_file="${file}.backup"
            cp "$file" "$backup_file"
            
            # Use ImageMagick to compress (85% quality, resize if huge)
            if command -v convert >/dev/null 2>&1; then
                if [ "$size_mb" -gt 10 ]; then
                    # For very large images, also resize width to 2000px max
                    convert "$file" -resize 2000x2000\> -quality 85% "$file"
                else
                    # For moderately large, just adjust quality
                    convert "$file" -quality 85% "$file"
                fi
                
                new_size_mb=$(du -m "$file" 2>/dev/null | cut -f1)
                echo -e "${GREEN_ICON} Compressed: ${GREEN}$file (${size_mb}MB → ${new_size_mb}MB)${NC}"
                rm "$backup_file"
                compressed_count=$((compressed_count + 1))
            else
                echo -e "${RED_ICON} ImageMagick not installed. Skipping compression.${NC}"
                mv "$backup_file" "$file"
            fi
        fi
    done
    
    if [ "$compressed_count" -gt 0 ]; then
        echo -e "${GREEN_ICON} ✅ Compressed ${compressed_count} large images${NC}"
    else
        echo -e "${BLUE_ICON} 📷 No large images found to compress${NC}"
    fi
}

# Check if ImageMagick is available for compression
if command -v convert >/dev/null 2>&1; then
    compress_large_images
else
    echo -e "${YELLOW_ICON} ⚠️ ImageMagick not installed - skipping image compression${NC}"
    echo -e "${YELLOW} Install with: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)${NC}"
fi

# Generate snippets first
echo -e "${BLUE_ICON} 🔄 Generating snippets from image folders...${NC}"
node gen-snips.js

# Git operations
echo -e "${BLUE_ICON} 📤 Deploying to GitHub...${NC}"

# Check git status and show changed files
echo -e "${YELLOW}📁 Changed files:${NC}"
git status --porcelain | while read status file; do
  case "$status" in
    " M") echo -e "${YELLOW_ICON} Modified:   ${YELLOW}$file${NC}" ;;
    "A ") echo -e "${GREEN_ICON} Added:      ${GREEN}$file${NC}" ;;
    "D ") echo -e "${RED_ICON} Deleted:    ${RED}$file${NC}" ;;
    "R ") echo -e "${BLUE_ICON} Renamed:    ${BLUE}$file${NC}" ;;
    "??") echo -e "${GREEN_ICON} Untracked:  ${GREEN}$file${NC}" ;;
    *) echo -e "? $status: $file" ;;
  esac
done

# Add all changes
echo -e "\n${BLUE_ICON} 📦 Staging changes...${NC}"
git add .

# Check if there are changes to commit
if git diff-index --quiet HEAD --; then
    echo -e "${YELLOW_ICON} 📝 No changes to commit.${NC}"
else
    # Show what will be committed
    echo -e "\n${GREEN}📄 Files to be committed:${NC}"
    git diff --cached --name-only | while read file; do
        echo -e "${YELLOW_ICON} ${YELLOW}$file${NC}"
    done
    
    # Commit changes
    echo -e "\n${GREEN_ICON} 💾 Committing changes...${NC}"
    git commit -m "Update: $(date +'%Y-%m-%d %H:%M') - Auto-generated snippets"
    
    # Pull remote changes first to avoid rejection
    echo -e "${BLUE_ICON} 📥 Pulling remote changes...${NC}"
    git pull origin main --rebase
    
    # Push to GitHub
    echo -e "${GREEN_ICON} 📤 Pushing to GitHub...${NC}"
    git push origin main
fi

echo -e "\n${GREEN_ICON} ✅ Done! Vercel will auto-deploy.${NC}"
echo -e "${GREEN}🌐 Check: https://plants-melatonin4.vercel.app${NC}"