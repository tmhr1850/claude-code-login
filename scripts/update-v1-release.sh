#!/bin/bash

# Script to update v1 release to point to the latest main commit
# This script automates the process of moving the v1 tag and GitHub release

set -e  # Exit on any error

echo "🚀 Updating v1 release to latest main commit..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    print_error "Not on main branch. Currently on: $current_branch"
    print_status "Switching to main branch..."
    git checkout main
fi

# Pull latest changes
print_status "Pulling latest changes from origin/main..."
git pull origin main

# Get latest commit info
latest_commit=$(git rev-parse HEAD)
latest_commit_short=$(git rev-parse --short HEAD)
latest_commit_message=$(git log -1 --pretty=format:"%s")

print_status "Latest commit: $latest_commit_short - $latest_commit_message"

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    print_error "Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Check if v1 tag exists
if git tag -l | grep -q "^v1$"; then
    print_status "Deleting existing v1 tag locally..."
    git tag -d v1
    
    print_status "Deleting existing v1 tag from remote..."
    git push origin :refs/tags/v1 2>/dev/null || print_warning "v1 tag may not exist on remote"
else
    print_status "No existing v1 tag found"
fi

# Check if GitHub release exists and delete it
print_status "Checking for existing GitHub release..."
if gh release view v1 >/dev/null 2>&1; then
    print_status "Deleting existing GitHub release v1..."
    gh release delete v1 --yes
else
    print_status "No existing GitHub release v1 found"
fi

# Create new v1 tag pointing to latest commit
print_status "Creating new v1 tag pointing to latest commit..."
git tag -a v1 -m "Release v1.0.0 - Claude Code OAuth GitHub Action

🚀 **Claude Code OAuth Action - Latest Release**

## Latest Updates
- Latest commit: $latest_commit_short
- Changes: $latest_commit_message
- Updated: $(date '+%Y-%m-%d %H:%M:%S')

## Features
- Complete OAuth 2.0 + PKCE authentication flow
- Two-step GitHub Actions workflow (URL generation → token exchange)
- Secure credential storage with proper error handling
- TypeScript implementation with comprehensive test suite
- Ready for GitHub Marketplace publication
- Custom branding with log-in icon and orange color
- Optimized for GitHub Actions environment

## Usage
Create .github/workflows/claude-oauth.yml:

\`\`\`yaml
name: Claude OAuth
on:
  workflow_dispatch:
    inputs:
      code:
        description: 'Authorization code (leave empty for step 1)'
        required: false

jobs:
  auth:
    runs-on: ubuntu-latest
    steps:
      - uses: grll/claude-code-login@v1
        with:
          code: \${{ inputs.code }}
\`\`\`

## What's Included
- OAuth URL generation with PKCE security
- Authorization code exchange for access tokens
- Credential persistence to credentials.json
- GitHub Actions integration with proper outputs
- Comprehensive error handling and user guidance
- Optimized action configuration

## Files
- action.yml - GitHub Action definition with proper setup
- index.ts - Main OAuth implementation
- index.test.ts - Test suite (25 tests, 100% pass)
- README.md - Documentation and usage guide
- scripts/ - Automation scripts"

# Push new v1 tag to remote
print_status "Pushing v1 tag to remote..."
git push origin v1

# Create new GitHub release
print_status "Creating new GitHub release..."
gh release create v1 \
  --title "v1.0.0 - Claude Code OAuth GitHub Action" \
  --notes "🚀 **Claude Code OAuth Action - Latest Release**

## Latest Updates
- **Latest commit**: \`$latest_commit_short\`
- **Changes**: $latest_commit_message
- **Updated**: $(date '+%Y-%m-%d %H:%M:%S')

## Features
- Complete OAuth 2.0 + PKCE authentication flow  
- Two-step GitHub Actions workflow (URL generation → token exchange)
- Secure credential storage with proper error handling
- TypeScript implementation with comprehensive test suite
- Ready for GitHub Marketplace publication
- **Custom branding** with log-in icon and orange color
- **Optimized for GitHub Actions** environment

## Usage
Create \`.github/workflows/claude-oauth.yml\`:

\`\`\`yaml
name: Claude OAuth
on:
  workflow_dispatch:
    inputs:
      code:
        description: 'Authorization code (leave empty for step 1)'
        required: false

jobs:
  auth:
    runs-on: ubuntu-latest
    steps:
      - uses: grll/claude-code-login@v1
        with:
          code: \${{ inputs.code }}
\`\`\`

## What's Included
- OAuth URL generation with PKCE security
- Authorization code exchange for access tokens  
- Credential persistence to credentials.json
- GitHub Actions integration with proper outputs
- Comprehensive error handling and user guidance
- **Optimized action configuration**

## Files
- \`action.yml\` - GitHub Action definition with proper setup
- \`index.ts\` - Main OAuth implementation  
- \`index.test.ts\` - Test suite (25 tests, 100% pass)
- \`README.md\` - Documentation and usage guide
- \`scripts/\` - Automation scripts

## Getting Started
1. Copy the workflow YAML above to your repository
2. Run the workflow without code parameter to get login URL
3. Follow the OAuth flow and get your authorization code
4. Run the workflow again with the authorization code
5. Your credentials will be saved to \`credentials.json\`

Perfect for CI/CD workflows that need Claude Code authentication!

---
*This release was automatically updated to include the latest changes.*"

# Get the release URL
release_url=$(gh release view v1 --json url --jq .url)

print_success "✅ v1 release successfully updated!"
echo ""
print_status "📊 Release Summary:"
echo "  • Tag: v1"
echo "  • Commit: $latest_commit_short"
echo "  • Message: $latest_commit_message"
echo "  • Release URL: $release_url"
echo ""
print_success "🎯 Users can now use: grll/claude-code-login@v1"
print_success "🔗 GitHub Release: $release_url"