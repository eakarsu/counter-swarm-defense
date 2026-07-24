import { createRequire } from 'node:module';
import { describe, expect, test, vi } from 'vitest';

const require = createRequire(import.meta.url);

describe('OpenRouter runtime boundary', () => {
  test('rejects an incomplete provider response instead of returning fallback text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'receipt-without-content', choices: [] }),
    })));
    process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'test/model';
    const { callAI } = require('../routes/ai');
    await expect(callAI('Review this bounded scenario')).rejects.toThrow('incomplete response');
    vi.unstubAllGlobals();
  });

  test('requires the canonical OpenRouter API base', async () => {
    process.env.OPENROUTER_BASE_URL = 'https://example.invalid';
    const { callAI } = require('../routes/ai');
    await expect(callAI('Review this bounded scenario')).rejects.toThrow('not configured');
  });
});
