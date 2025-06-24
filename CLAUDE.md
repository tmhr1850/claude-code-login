# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime Environment

This project uses **Bun** as the JavaScript runtime (not Node.js). Bun is a fast all-in-one JavaScript runtime that can execute TypeScript directly without compilation.

## Development Commands

### Essential Commands
- **Install dependencies**: `bun install`
- **Run the application**: `bun run index.ts`
- **Run tests**: `bun test`
- **Watch tests**: `bun test --watch`

### Type Checking
Since `tsconfig.json` has `"noEmit": true`, TypeScript is used only for type checking:
- **Check types**: `bunx tsc --noEmit`

## Project Architecture

This is a minimal TypeScript project with:
- **Entry point**: `index.ts` at the root level
- **TypeScript configuration**: Strict mode enabled with modern ES features
- **Module system**: ES modules (`"type": "module"`)

## TypeScript Configuration Notes

The project uses strict TypeScript settings with:
- Target: ESNext with latest features
- Module resolution: Bundler mode (allows `.ts` imports)
- React JSX support configured (though not currently used)
- Additional strict checks: `noUncheckedIndexedAccess`, `noImplicitOverride`

## Testing

No test framework is currently configured. Bun has a built-in test runner that can be used by creating test files and running `bun test`.