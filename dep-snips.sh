#!/bin/bash

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

echo -e "${BLUE}🚀 Generating snippets and deploying...${NC}"

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