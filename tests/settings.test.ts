import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/store/useSettingsStore';
import { DEFAULT_SETTINGS, settingsSchema } from '@/types/settings.types';
import { storageService } from '@/services/storage.service';

describe('Settings Module & Store', () => {
  beforeEach(async () => {
    await storageService.clear();
    await useSettingsStore.getState().resetSettings();
  });

  it('validates default settings conform strictly to Zod schema', () => {
    const parsed = settingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(parsed.success).toBe(true);
  });

  it('initializes and rehydrates settings from storage', async () => {
    await storageService.set('sahayak_user_settings', {
      ...DEFAULT_SETTINGS,
      language: 'hi-en',
      geminiApiKey: 'test-api-key-12345',
    });

    await useSettingsStore.getState().initSettings();
    const state = useSettingsStore.getState();

    expect(state.isInitialized).toBe(true);
    expect(state.settings.language).toBe('hi-en');
    expect(state.settings.geminiApiKey).toBe('test-api-key-12345');
  });

  it('updates valid settings dynamically and persists to storage', async () => {
    const success = await useSettingsStore.getState().updateSettings({
      theme: 'dark',
      maxSteps: 25,
      soundFeedback: true,
    });

    expect(success).toBe(true);
    const updated = useSettingsStore.getState().settings;
    expect(updated.theme).toBe('dark');
    expect(updated.maxSteps).toBe(25);
    expect(updated.soundFeedback).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('rejects invalid settings values through Zod validation', async () => {
    const success = await useSettingsStore.getState().updateSettings({
      maxSteps: 999,
    });

    expect(success).toBe(false);
    expect(useSettingsStore.getState().saveFeedback.status).toBe('error');
    // Stored setting remains unchanged
    expect(useSettingsStore.getState().settings.maxSteps).toBe(15);
  });

  it('resets settings to default values properly', async () => {
    await useSettingsStore.getState().updateSettings({
      theme: 'dark',
      language: 'hi-en',
      geminiApiKey: 'my-key',
    });

    await useSettingsStore.getState().resetSettings();
    const current = useSettingsStore.getState().settings;

    expect(current.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(current.language).toBe(DEFAULT_SETTINGS.language);
    expect(current.geminiApiKey).toBe('');
  });
});
