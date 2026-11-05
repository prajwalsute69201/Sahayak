import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '@/services/storage.service';

describe('StorageService', () => {
  beforeEach(async () => {
    await storageService.clear();
  });

  it('persists and retrieves a typed value', async () => {
    await storageService.set('test_key', { count: 42, active: true });
    const result = await storageService.get<{ count: number; active: boolean }>('test_key');
    expect(result).toEqual({ count: 42, active: true });
  });

  it('returns default value when key does not exist', async () => {
    const val = await storageService.get<string>('missing_key', 'fallback');
    expect(val).toBe('fallback');
  });

  it('removes keys properly', async () => {
    await storageService.set('removable', 'val');
    expect(await storageService.get('removable')).toBe('val');
    await storageService.remove('removable');
    expect(await storageService.get('removable')).toBeUndefined();
  });

  it('clears all keys properly', async () => {
    await storageService.set('k1', 1);
    await storageService.set('k2', 2);
    await storageService.clear();
    expect(await storageService.get('k1')).toBeUndefined();
    expect(await storageService.get('k2')).toBeUndefined();
  });
});
