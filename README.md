# claude-code-login

A minimal OAuth 2.0 authentication tool for Claude Code using TypeScript and Bun.

## Features

- **OAuth 2.0 + PKCE**: Secure authentication flow with Proof Key for Code Exchange
- **GitHub Actions Integration**: Ready-to-use workflow for automated authentication
- **TypeScript**: Fully typed with strict mode enabled
- **Minimal Dependencies**: Uses only Node.js built-ins and fetch API

## Usage

### Local Development

Install dependencies:
```bash
bun install
```

Generate login URL:
```bash
bun run index.ts
```

Exchange authorization code for tokens:
```bash
bun run index.ts <authorization_code>
```

### GitHub Actions

This repository includes a GitHub Action for easy OAuth authentication in CI/CD workflows.

#### Prerequisites: Setting up SECRETS_ADMIN_PAT

This action requires a Personal Access Token (PAT) to securely store OAuth credentials as GitHub secrets. Follow these steps:

##### 1. Create a Fine-grained Personal Access Token (30 seconds)

1. Go to **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **"Generate new token"**

2. Configure the token:
   - **Resource owner**: Choose the organization or user that owns the repository
   - **Repository access**: Select "Only select repositories" and choose the repository/repositories that will run this action
   - **Permissions**: 
     - Repository → **Secrets**: Write (this automatically includes read permission)
   - **Expiration**: Set the shortest practical lifetime (30-60 days) and add a calendar reminder to renew it
   - **Name**: Give it a descriptive name like `actions-secret-sync-<repo>`

3. Click **"Generate token"** and copy the value immediately (GitHub will never show it again)

##### 2. Store the PAT as a Repository Secret (30 seconds)

1. In your repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add the secret:
   - **Name**: `SECRETS_ADMIN_PAT`
   - **Value**: Paste your PAT from step 1
4. Click **"Add secret"**

> **Note**: You do NOT need the wide-open `repo` scope of a classic token. Fine-grained tokens with only `secrets:write` permission are more secure.

#### Quick Setup (Marketplace)

If using the published action from GitHub Marketplace, create `.github/workflows/claude-oauth.yml`:

```yaml
name: Claude OAuth

on:
  workflow_dispatch:
    inputs:
      code:
        description: 'Authorization code (leave empty for step 1)'
        required: false

permissions:
  actions: write  # Required for cache management
  contents: read  # Required for basic repository access

jobs:
  auth:
    runs-on: ubuntu-latest
    steps:
      - uses: grll/claude-code-login@v1
        with:
          code: ${{ inputs.code }}
          secrets_admin_pat: ${{ secrets.SECRETS_ADMIN_PAT }}
```

#### Local Development Setup

For local development or customization:

```yaml
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
      - uses: actions/checkout@v4
      - uses: ./
        with:
          code: ${{ inputs.code }}
          secrets_admin_pat: ${{ secrets.SECRETS_ADMIN_PAT }}
```

#### Usage Steps

1. **Step 1 - Generate Login URL**
   - Go to your repository's **Actions** tab
   - Select **Claude OAuth** workflow
   - Click **Run workflow** (leave code field empty)
   - Copy the generated login URL

2. **Step 2 - Complete Authentication**
   - Open the URL and sign in to Claude
   - Copy the authorization code from the redirect URL
   - Run the workflow again with the code
   - OAuth tokens will be stored as GitHub secrets

#### Using the OAuth Credentials

After successful authentication, the OAuth tokens are stored as repository secrets:
- `CLAUDE_ACCESS_TOKEN` - OAuth access token for Claude API
- `CLAUDE_REFRESH_TOKEN` - OAuth refresh token for token renewal  
- `CLAUDE_EXPIRES_AT` - Token expiration timestamp (milliseconds)

To use these credentials in other workflows:

```yaml
name: Claude PR Assistant

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]

jobs:
  claude-code-action:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
      (github.event_name == 'issues' && contains(github.event.issue.body, '@claude'))
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Run Claude PR Action
        uses: grll/claude-code-action@beta
        with:
          use_oauth: true
          claude_access_token: ${{ secrets.CLAUDE_ACCESS_TOKEN }}
          claude_refresh_token: ${{ secrets.CLAUDE_REFRESH_TOKEN }}
          claude_expires_at: ${{ secrets.CLAUDE_EXPIRES_AT }}
          timeout_minutes: "60"
```

## Testing

Run the test suite:
```bash
bun test
```

Type checking:
```bash
bunx tsc --noEmit
```

## Files

- `index.ts` - Main OAuth implementation
- `index.test.ts` - Comprehensive test suite
- `action.yml` - GitHub Action definition
- `CLAUDE.md` - Development guidelines for Claude Code
- `scripts/` - Automation scripts for release management

## Development

### Updating v1 Release

To update the v1 release to include the latest changes:

```bash
./scripts/update-v1-release.sh
```

This script automatically:
- Moves the v1 tag to the latest main commit
- Updates the GitHub release with current changes
- Ensures marketplace users get the latest version

This project was created using `bun init` in bun v1.2.17. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
