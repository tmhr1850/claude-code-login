# Scripts

Automation scripts for managing the Claude Code OAuth Action.

## update-v1-release.sh
s
Automatically updates the `v1` release to point to the latest commit on the `main` branch.

### Usage

```bash
./scripts/update-v1-release.sh
```

### What it does

1. **Switches to main branch** (if not already on it)
2. **Pulls latest changes** from origin/main
3. **Validates working directory** is clean
4. **Deletes existing v1 tag** (local and remote)
5. **Deletes existing GitHub release** v1
6. **Creates new v1 tag** pointing to latest commit
7. **Pushes v1 tag** to remote
8. **Creates new GitHub release** with updated notes

### Requirements

- `git` - For tag and repository management
- `gh` - GitHub CLI for release management
- Write access to the repository
- Clean working directory (no uncommitted changes)

### Output

The script provides colored output showing:
- ✅ Success messages in green
- ℹ️ Info messages in blue  
- ⚠️ Warning messages in yellow
- ❌ Error messages in red

### Example Output

```
🚀 Updating v1 release to latest main commit...
[INFO] Latest commit: abc1234 - fix action configuration
[SUCCESS] ✅ v1 release successfully updated!
[SUCCESS] 🎯 Users can now use: grll/claude-code-login@v1
```

### When to Use

Run this script whenever you want to:
- Include latest bug fixes in v1 release
- Update the marketplace version
- Ensure users get the latest stable code
- After merging important changes to main

### Safety Features

- Validates you're on the main branch
- Checks for clean working directory
- Handles missing tags/releases gracefully
- Provides detailed output for debugging
- Exits on any error to prevent partial updates

This ensures the v1 release always points to the latest, tested code from main branch.