import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { generateLoginUrl } from './index';

const STATE_FILE = 'claude_oauth_state.json';

describe('OAuth Login Implementation', () => {
  // Clean up state file before and after tests
  beforeEach(async () => {
    if (existsSync(STATE_FILE)) {
      await unlink(STATE_FILE);
    }
  });

  afterEach(async () => {
    if (existsSync(STATE_FILE)) {
      await unlink(STATE_FILE);
    }
  });

  describe('generateLoginUrl', () => {
    test('should generate a valid OAuth URL with all required parameters', async () => {
      const url = await generateLoginUrl();
      
      // Parse the URL
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      
      // Check base URL
      expect(parsedUrl.origin + parsedUrl.pathname).toBe('https://claude.ai/oauth/authorize');
      
      // Check all required OAuth parameters
      expect(params.get('code')).toBe('true');
      expect(params.get('client_id')).toBe('9d1c250a-e61b-44d9-88ed-5944d1962f5e');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('redirect_uri')).toBe('https://console.anthropic.com/oauth/code/callback');
      expect(params.get('scope')).toBe('org:create_api_key user:profile user:inference');
      expect(params.get('code_challenge_method')).toBe('S256');
      
      // Check dynamic parameters exist and have correct format
      const state = params.get('state');
      expect(state).toBeTruthy();
      expect(state).toMatch(/^[a-f0-9]{64}$/); // 32 bytes as hex = 64 chars
      
      const codeChallenge = params.get('code_challenge');
      expect(codeChallenge).toBeTruthy();
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/); // base64url format
    });

    test('should create a state file with correct data', async () => {
      await generateLoginUrl();
      
      // Check file exists
      expect(existsSync(STATE_FILE)).toBe(true);
      
      // Read and parse the file
      const content = await readFile(STATE_FILE, 'utf-8');
      const stateData = JSON.parse(content);
      
      // Verify structure
      expect(stateData).toHaveProperty('state');
      expect(stateData).toHaveProperty('code_verifier');
      expect(stateData).toHaveProperty('timestamp');
      expect(stateData).toHaveProperty('expires_at');
      
      // Verify data formats
      expect(stateData.state).toMatch(/^[a-f0-9]{64}$/);
      expect(stateData.code_verifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(typeof stateData.timestamp).toBe('number');
      expect(typeof stateData.expires_at).toBe('number');
      
      // Verify expiration is 10 minutes after timestamp
      expect(stateData.expires_at - stateData.timestamp).toBe(600);
    });

    test('should generate different state values on each call', async () => {
      const url1 = await generateLoginUrl();
      const stateData1 = JSON.parse(await readFile(STATE_FILE, 'utf-8'));
      
      // Generate second URL
      const url2 = await generateLoginUrl();
      const stateData2 = JSON.parse(await readFile(STATE_FILE, 'utf-8'));
      
      // Parse URLs
      const params1 = new URL(url1).searchParams;
      const params2 = new URL(url2).searchParams;
      
      // Verify different random values
      expect(params1.get('state')).not.toBe(params2.get('state'));
      expect(params1.get('code_challenge')).not.toBe(params2.get('code_challenge'));
      expect(stateData1.code_verifier).not.toBe(stateData2.code_verifier);
    });

    test('should handle file write errors gracefully', async () => {
      // Mock console.warn to verify warning is logged
      const originalWarn = console.warn;
      const warnMock = mock(() => {});
      console.warn = warnMock;

      // Create a directory with the state file name to cause write error
      const { mkdir, rmdir } = await import('node:fs/promises');
      await mkdir(STATE_FILE);
      
      try {
        // Should not throw, but should log warning
        const url = await generateLoginUrl();
        expect(url).toBeTruthy();
        expect(warnMock).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not save state file:'));
      } finally {
        console.warn = originalWarn;
        // Clean up
        await rmdir(STATE_FILE);
      }
    });

    test('should correctly implement PKCE flow', async () => {
      const url = await generateLoginUrl();
      const stateData = JSON.parse(await readFile(STATE_FILE, 'utf-8'));
      
      // Verify PKCE implementation
      const codeChallenge = new URL(url).searchParams.get('code_challenge')!;
      
      // Recreate the challenge from the verifier to verify correctness
      const { createHash } = await import('node:crypto');
      const expectedChallenge = createHash('sha256')
        .update(stateData.code_verifier)
        .digest('base64url');
      
      expect(codeChallenge).toBe(expectedChallenge);
    });
  });

  describe('CLI functionality', () => {
    test('should output URL to console', async () => {
      // Mock console.log to capture output
      const originalLog = console.log;
      const logMock = mock(() => {});
      console.log = logMock;
      
      try {
        await generateLoginUrl();
        
        // Verify console.log was called with a URL
        expect(logMock).toHaveBeenCalledTimes(1);
        // @ts-expect-error - Bun's mock type definitions are incomplete
        const loggedUrl = logMock.mock.calls[0][0];
        expect(loggedUrl).toMatch(/^https:\/\/claude\.ai\/oauth\/authorize\?/);
      } finally {
        console.log = originalLog;
      }
    });
  });
});

describe('State file format', () => {
  test('should use pretty-printed JSON', async () => {
    await generateLoginUrl();
    
    const content = await readFile(STATE_FILE, 'utf-8');
    
    // Check for pretty printing (should have newlines and indentation)
    expect(content).toContain('\n');
    expect(content).toContain('  '); // 2-space indentation
    
    // Verify it's valid JSON
    expect(() => JSON.parse(content)).not.toThrow();
  });
});