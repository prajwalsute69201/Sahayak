import { describe, it, expect } from 'vitest';

describe('Tooling & Environment Verification', () => {
  it('initializes mock Chrome API globals', () => {
    expect(chrome).toBeDefined();
    expect(chrome.runtime.id).toBe('sahayak-test-extension-id');
    expect(typeof chrome.storage.local.get).toBe('function');
  });

  it('resolves TypeScript path alias @ correctly', async () => {
    const { App } = await import('@/sidepanel/App');
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('validates storage mock behavior', async () => {
    await chrome.storage.local.set({ testKey: 'testVal' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ testKey: 'testVal' });
  });
});
