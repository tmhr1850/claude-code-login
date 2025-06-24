#!/usr/bin/env bun

import { randomBytes, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

// Constants
const OAUTH_AUTHORIZE_URL = 'https://claude.ai/oauth/authorize';
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';
const STATE_FILE = 'claude_oauth_state.json';

// Types
interface StateData {
  state: string;
  code_verifier: string;
  timestamp: number;
  expires_at: number;
}

/**
 * Saves OAuth state data to a JSON file for later verification
 */
async function saveState(state: string, codeVerifier: string): Promise<void> {
  const stateData: StateData = {
    state,
    code_verifier: codeVerifier,
    timestamp: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + 600 // 10 minutes
  };

  try {
    await writeFile(STATE_FILE, JSON.stringify(stateData, null, 2));
  } catch (error) {
    console.warn(`Warning: Could not save state file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates an OAuth login URL for Claude Code authentication
 */
export async function generateLoginUrl(): Promise<string> {
  // Generate secure random values
  const state = randomBytes(32).toString('hex');
  const codeVerifier = randomBytes(32).toString('base64url');
  
  // Create PKCE code challenge
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Save state and code verifier for verification later
  await saveState(state, codeVerifier);

  // Build OAuth URL
  const params = new URLSearchParams({
    code: 'true',
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'org:create_api_key user:profile user:inference',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state
  });

  const url = `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  
  console.log(url);
  
  return url;
}

// CLI handling
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: ${process.argv[1]}`);
    console.log('  Generates an OAuth login URL for Claude Code authentication');
    console.log('  --help, -h     Show this help message');
    process.exit(0);
  }

  await generateLoginUrl();
}