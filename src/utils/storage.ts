/**
 * Sahayak Storage Utilities
 * Helper wrappers around StorageService for typed storage operations.
 */
import { storageService } from '@/services/storage.service';

export const storage = {
  get: <T>(key: string, defaultValue?: T) => storageService.get<T>(key, defaultValue),
  set: <T>(key: string, value: T) => storageService.set<T>(key, value),
  remove: (key: string) => storageService.remove(key),
  clear: () => storageService.clear(),
  getAll: () => storageService.getAll(),
};

export default storage;
