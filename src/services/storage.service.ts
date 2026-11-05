/**
 * Sahayak Storage Service
 * Strongly typed wrapper around chrome.storage.local with automatic in-memory fallback.
 */

class StorageService {
  private inMemoryFallback = new Map<string, unknown>();

  private isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' && Boolean(chrome.storage) && Boolean(chrome.storage.local)
    );
  }

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    try {
      if (this.isChromeStorageAvailable()) {
        const result = await chrome.storage.local.get(key);
        if (result && key in result && result[key] !== undefined) {
          return result[key] as T;
        }
      } else if (this.inMemoryFallback.has(key)) {
        return this.inMemoryFallback.get(key) as T;
      }
    } catch (error) {
      console.warn(`[Sahayak Storage] Failed to read key "${key}":`, error);
    }
    return defaultValue as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        this.inMemoryFallback.set(key, value);
      }
    } catch (error) {
      console.error(`[Sahayak Storage] Failed to persist key "${key}":`, error);
      throw new Error(`Failed to save data for "${key}".`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.remove(key);
      } else {
        this.inMemoryFallback.delete(key);
      }
    } catch (error) {
      console.warn(`[Sahayak Storage] Failed to remove key "${key}":`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isChromeStorageAvailable()) {
        await chrome.storage.local.clear();
      } else {
        this.inMemoryFallback.clear();
      }
    } catch (error) {
      console.error('[Sahayak Storage] Failed to clear storage:', error);
      throw new Error('Failed to reset storage.');
    }
  }

  async getAll(): Promise<Record<string, unknown>> {
    try {
      if (this.isChromeStorageAvailable()) {
        return await chrome.storage.local.get(null);
      }
      return Object.fromEntries(this.inMemoryFallback.entries());
    } catch (error) {
      console.warn('[Sahayak Storage] Failed to fetch all items:', error);
      return {};
    }
  }
}

export const storageService = new StorageService();
export default storageService;
