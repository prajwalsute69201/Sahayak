// Vitest setup file for Sahayak Chrome Extension environment
import { vi } from 'vitest';

// In-memory mock storage
const storageMap = new Map<string, unknown>();

// Mock chrome extension APIs in test environment
const mockChrome = {
  runtime: {
    id: 'sahayak-test-extension-id',
    onInstalled: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn().mockImplementation((keys) => {
        if (!keys) {
          return Promise.resolve(Object.fromEntries(storageMap.entries()));
        }
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: storageMap.get(keys) });
        }
        if (Array.isArray(keys)) {
          const res: Record<string, unknown> = {};
          keys.forEach((k) => {
            res[k] = storageMap.get(k);
          });
          return Promise.resolve(res);
        }
        return Promise.resolve({});
      }),
      set: vi.fn().mockImplementation((items) => {
        Object.entries(items).forEach(([k, v]) => storageMap.set(k, v));
        return Promise.resolve();
      }),
      remove: vi.fn().mockImplementation((keys) => {
        if (typeof keys === 'string') storageMap.delete(keys);
        if (Array.isArray(keys)) keys.forEach((k) => storageMap.delete(k));
        return Promise.resolve();
      }),
      clear: vi.fn().mockImplementation(() => {
        storageMap.clear();
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([
      {
        id: 101,
        url: 'https://developer.chrome.com/docs/extensions/mv3',
        title: 'Chrome Extensions Documentation',
        favIconUrl: 'https://developer.chrome.com/favicon.ico',
      },
    ]),
    sendMessage: vi.fn().mockResolvedValue({}),
    captureVisibleTab: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
    onActivated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  sidePanel: {
    setPanelBehavior: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(undefined),
  },
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn().mockImplementation((cb) => {
      if (cb) cb();
      return Promise.resolve();
    }),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

Object.defineProperty(globalThis, 'chrome', {
  value: mockChrome,
  writable: true,
  configurable: true,
});

// Mock window.matchMedia for theme tests
if (typeof window !== 'undefined') {
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
