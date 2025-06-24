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
   - Access tokens will be saved to `credentials.json`

#### Cached Credentials

After successful authentication, the `credentials.json` file is automatically cached in GitHub Actions cache with the key `claude-oauth-credentials`. This allows other workflows in your repository to reuse the OAuth credentials without re-authentication.

To access cached credentials in other workflows:

```yaml
- name: Restore Claude Credentials
  uses: actions/cache@v4
  with:
    path: credentials.json
    key: claude-oauth-credentials
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
