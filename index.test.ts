import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { 
  generateLoginUrl, 
  loadState, 
  verifyState, 
  exchangeCode, 
  saveCredentials, 
  cleanupState 
} from './index';

const STATE_FILE = 'claude_oauth_state.json';
const CREDENTIALS_FILE = 'credentials.json';

describe('OAuth Login Implementation', () => {
  // Clean up state file before and after tests
  beforeEach(async () => {
    if (existsSync(STATE_FILE)) {
      await unlink(STATE_FILE);
    }
    if (existsSync(CREDENTIALS_FILE)) {
      await unlink(CREDENTIALS_FILE);
    }
  });

  afterEach(async () => {
    if (existsSync(STATE_FILE)) {
      await unlink(STATE_FILE);
    }
    if (existsSync(CREDENTIALS_FILE)) {
      await unlink(CREDENTIALS_FILE);
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

// Helper to create a valid state file
async function createValidState() {
  const { randomBytes } = await import('node:crypto');
  const state = randomBytes(32).toString('hex');
  const codeVerifier = randomBytes(32).toString('base64url');
  
  const stateData = {
    state,
    code_verifier: codeVerifier,
    timestamp: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + 600
  };
  
  await writeFile(STATE_FILE, JSON.stringify(stateData, null, 2));
  return { state, codeVerifier };
}

describe('OAuth Code Exchange - Unit Tests', () => {
  // Ensure clean state for unit tests
  beforeEach(async () => {
    if (existsSync(STATE_FILE)) {
      await unlink(STATE_FILE);
    }
    if (existsSync(CREDENTIALS_FILE)) {
      await unlink(CREDENTIALS_FILE);
    }
  });

  afterEach(async () => {
    if (existsSync(STATE_FILE)) {
      await unlink(STATE_FILE);
    }
    if (existsSync(CREDENTIALS_FILE)) {
      await unlink(CREDENTIALS_FILE);
    }
  });
  describe('loadState', () => {
    test('should return null when state file does not exist', async () => {
      const result = await loadState();
      expect(result).toBeNull();
    });

    test('should load and parse state file correctly', async () => {
      const { state, codeVerifier } = await createValidState();
      const result = await loadState();
      
      expect(result).not.toBeNull();
      expect(result?.state).toBe(state);
      expect(result?.code_verifier).toBe(codeVerifier);
      expect(result?.timestamp).toBeDefined();
      expect(result?.expires_at).toBeDefined();
    });
  });

  describe('verifyState', () => {
    test('should return false when no state file exists', async () => {
      // Mock console.error to prevent output
      const originalError = console.error;
      console.error = mock(() => {});
      
      try {
        const result = await verifyState();
        expect(result).toBe(false);
      } finally {
        console.error = originalError;
      }
    });

    test('should return false when state is expired', async () => {
      const originalError = console.error;
      console.error = mock(() => {});
      
      try {
        // Create expired state
        const stateData = {
          state: 'expired-state',
          code_verifier: 'expired-verifier',
          timestamp: Math.floor(Date.now() / 1000) - 700,
          expires_at: Math.floor(Date.now() / 1000) - 100
        };
        
        await writeFile(STATE_FILE, JSON.stringify(stateData, null, 2));
        
        const result = await verifyState();
        expect(result).toBe(false);
      } finally {
        console.error = originalError;
      }
    });

    test('should return true when state is valid', async () => {
      await createValidState();
      const result = await verifyState();
      expect(result).toBe(true);
    });
  });

  describe('saveCredentials', () => {
    test('should save credentials in correct format', async () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
        scopes: ['user:inference', 'user:profile'],
        isMax: true
      };
      
      const result = await saveCredentials(tokens);
      expect(result).toBe(true);
      
      const content = await readFile(CREDENTIALS_FILE, 'utf-8');
      const saved = JSON.parse(content);
      
      expect(saved.claudeAiOauth).toEqual(tokens);
      // Verify pretty printing
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  describe('cleanupState', () => {
    test('should remove state file when it exists', async () => {
      await createValidState();
      expect(existsSync(STATE_FILE)).toBe(true);
      
      await cleanupState();
      expect(existsSync(STATE_FILE)).toBe(false);
    });

    test('should not throw when state file does not exist', async () => {
      const originalWarn = console.warn;
      console.warn = mock(() => {});
      
      try {
        // Should not throw
        await expect(cleanupState()).resolves.toBeUndefined();
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('exchangeCode', () => {
    test('should clean authorization code fragments', async () => {
      await createValidState();
      
      const originalFetch = global.fetch;
      // @ts-ignore - Mock type compatibility
      global.fetch = mock(async (url: string, options: any) => {
        const body = JSON.parse(options.body);
        expect(body.code).toBe('actual-code');
        
        return {
          ok: true,
          json: async () => ({
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600
          })
        };
      });
      
      try {
        const result = await exchangeCode('actual-code#fragment&other=param');
        expect(result).not.toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should include all required headers and parameters', async () => {
      const { state } = await createValidState();
      
      const originalFetch = global.fetch;
      // @ts-ignore - Mock type compatibility
      global.fetch = mock(async (url: string, options: any) => {
        expect(url).toBe('https://console.anthropic.com/v1/oauth/token');
        expect(options.method).toBe('POST');
        
        // Check headers
        expect(options.headers['Content-Type']).toBe('application/json');
        expect(options.headers['User-Agent']).toContain('Chrome');
        expect(options.headers['Accept']).toBe('application/json, text/plain, */*');
        expect(options.headers['Origin']).toBe('https://claude.ai');
        expect(options.headers['Referer']).toBe('https://claude.ai/');
        
        // Check body
        const body = JSON.parse(options.body);
        expect(body.grant_type).toBe('authorization_code');
        expect(body.client_id).toBe('9d1c250a-e61b-44d9-88ed-5944d1962f5e');
        expect(body.redirect_uri).toBe('https://console.anthropic.com/oauth/code/callback');
        expect(body.state).toBe(state);
        expect(body.code_verifier).toBeDefined();
        
        return {
          ok: true,
          json: async () => ({
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600
          })
        };
      });
      
      try {
        const result = await exchangeCode('test-code');
        expect(result).not.toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle network errors', async () => {
      await createValidState();
      
      const originalFetch = global.fetch;
      const originalError = console.error;
      // @ts-ignore - Mock type compatibility
      global.fetch = mock(async () => {
        throw new Error('Network error');
      });
      console.error = mock(() => {});
      
      try {
        const result = await exchangeCode('test-code');
        expect(result).toBeNull();
      } finally {
        global.fetch = originalFetch;
        console.error = originalError;
      }
    });

    test('should handle error responses', async () => {
      await createValidState();
      
      const originalFetch = global.fetch;
      const originalError = console.error;
      // @ts-ignore - Mock type compatibility
      global.fetch = mock(async () => ({
        ok: false,
        status: 400,
        text: async () => 'Invalid authorization code'
      }));
      console.error = mock(() => {});
      
      try {
        const result = await exchangeCode('test-code');
        expect(result).toBeNull();
      } finally {
        global.fetch = originalFetch;
        console.error = originalError;
      }
    });

    test('should parse token response correctly', async () => {
      await createValidState();
      const beforeTime = Math.floor(Date.now() / 1000);
      
      const originalFetch = global.fetch;
      // @ts-ignore - Mock type compatibility
      global.fetch = mock(async () => ({
        ok: true,
        json: async () => ({
          access_token: 'access-123',
          refresh_token: 'refresh-456',
          expires_in: 7200,
          scope: 'org:create_api_key user:profile user:inference'
        })
      }));
      
      try {
        const result = await exchangeCode('test-code');
        const afterTime = Math.floor(Date.now() / 1000);
        
        expect(result).not.toBeNull();
        expect(result?.accessToken).toBe('access-123');
        expect(result?.refreshToken).toBe('refresh-456');
        expect(result?.scopes).toEqual(['org:create_api_key', 'user:profile', 'user:inference']);
        expect(result?.isMax).toBe(true);
        
        // Check expiration calculation (in milliseconds)
        const expiresAtSeconds = result!.expiresAt / 1000;
        expect(expiresAtSeconds).toBeGreaterThanOrEqual(beforeTime + 7200);
        expect(expiresAtSeconds).toBeLessThanOrEqual(afterTime + 7200);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should use default scopes when none provided', async () => {
      await createValidState();
      
      const originalFetch = global.fetch;
      // @ts-ignore - Mock type compatibility
      global.fetch = mock(async () => ({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600
          // No scope field
        })
      }));
      
      try {
        const result = await exchangeCode('test-code');
        expect(result?.scopes).toEqual(['user:inference', 'user:profile']);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

describe('OAuth Code Exchange - Integration Tests', () => {

  describe('CLI Integration', () => {
    test('should fail if no state file exists', async () => {
      const { spawn } = await import('node:child_process');
      const proc = spawn('bun', ['run', 'index.ts', 'test-code']);
      
      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const exitCode = await new Promise<number>((resolve) => {
        proc.on('exit', (code) => resolve(code ?? 1));
      });
      
      expect(exitCode).toBe(1);
      expect(stderr).toContain('No state file found');
    });

    test('should fail if state has expired', async () => {
      // Create expired state
      const stateData = {
        state: 'expired-state',
        code_verifier: 'expired-verifier',
        timestamp: Math.floor(Date.now() / 1000) - 700,
        expires_at: Math.floor(Date.now() / 1000) - 100
      };
      
      await writeFile(STATE_FILE, JSON.stringify(stateData, null, 2));
      
      const { spawn } = await import('node:child_process');
      const proc = spawn('bun', ['run', 'index.ts', 'test-code']);
      
      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const exitCode = await new Promise<number>((resolve) => {
        proc.on('exit', (code) => resolve(code ?? 1));
      });
      
      expect(exitCode).toBe(1);
      expect(stderr).toContain('State has expired');
    });

    test('should exit with error code on failure', async () => {
      // No state file - will fail
      const { spawn } = await import('node:child_process');
      const proc = spawn('bun', ['run', 'index.ts', 'test-code']);
      
      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const exitCode = await new Promise<number>((resolve) => {
        proc.on('exit', (code) => resolve(code ?? 1));
      });
      
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid or expired state');
    });
  });
});

describe('CLI Help', () => {
  test('should show updated help text with code exchange info', async () => {
    const { spawn } = await import('node:child_process');
    const proc = spawn('bun', ['run', 'index.ts', '--help']);
    
    let stdout = '';
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    const exitCode = await new Promise<number>((resolve) => {
      proc.on('exit', (code) => resolve(code ?? 1));
    });
    
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('[authorization_code]');
    expect(stdout).toContain('Without code: Generates an OAuth login URL');
    expect(stdout).toContain('With code: Completes OAuth login and exchanges code for tokens');
    expect(stdout).toContain('authorization_code  The code received from the OAuth callback');
  });
});