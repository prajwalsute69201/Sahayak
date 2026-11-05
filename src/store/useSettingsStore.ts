import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  UserSettings,
  settingsSchema,
} from '@/types/settings.types';
import { storageService } from '@/services/storage.service';
import { applyTheme } from '@/utils/theme';

interface SettingsState {
  settings: UserSettings;
  isInitialized: boolean;
  isLoading: boolean;
  isSaving: boolean;
  saveFeedback: {
    status: 'idle' | 'success' | 'error';
    message?: string;
  };
  error: string | null;

  initSettings: () => Promise<void>;
  updateSettings: (newValues: Partial<UserSettings>) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  clearSaveFeedback: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isInitialized: false,
  isLoading: true,
  isSaving: false,
  saveFeedback: { status: 'idle' },
  error: null,

  initSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const stored = await storageService.get<Partial<UserSettings>>(
        SETTINGS_STORAGE_KEY,
        DEFAULT_SETTINGS
      );

      // Merge defaults with stored values
      const merged: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...(stored || {}),
      };

      // Validate schema
      const parsed = settingsSchema.safeParse(merged);
      const validSettings = parsed.success ? parsed.data : DEFAULT_SETTINGS;

      // Apply theme to DOM
      applyTheme(validSettings.theme);

      set({
        settings: validSettings,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      console.error('[Sahayak Settings] Initialization failed:', err);
      applyTheme(DEFAULT_SETTINGS.theme);
      set({
        settings: DEFAULT_SETTINGS,
        isInitialized: true,
        isLoading: false,
        error: 'Failed to load user settings. Defaults applied.',
      });
    }
  },

  updateSettings: async (newValues: Partial<UserSettings>) => {
    set({ isSaving: true, saveFeedback: { status: 'idle' }, error: null });
    const current = get().settings;
    const prospective: UserSettings = {
      ...current,
      ...newValues,
    };

    // Validate using Zod
    const validation = settingsSchema.safeParse(prospective);
    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || 'Invalid settings values provided.';
      set({
        isSaving: false,
        saveFeedback: {
          status: 'error',
          message: errorMsg,
        },
        error: errorMsg,
      });
      return false;
    }

    try {
      await storageService.set(SETTINGS_STORAGE_KEY, validation.data);

      // Update theme if it changed
      if (newValues.theme && newValues.theme !== current.theme) {
        applyTheme(newValues.theme);
      }

      set({
        settings: validation.data,
        isSaving: false,
        saveFeedback: {
          status: 'success',
          message: 'Settings saved successfully.',
        },
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings.';
      set({
        isSaving: false,
        saveFeedback: {
          status: 'error',
          message: msg,
        },
        error: msg,
      });
      return false;
    }
  },

  resetSettings: async () => {
    set({ isSaving: true, saveFeedback: { status: 'idle' }, error: null });
    try {
      await storageService.set(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
      applyTheme(DEFAULT_SETTINGS.theme);
      set({
        settings: DEFAULT_SETTINGS,
        isSaving: false,
        saveFeedback: {
          status: 'success',
          message: 'All settings have been reset to defaults.',
        },
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset settings.';
      set({
        isSaving: false,
        saveFeedback: {
          status: 'error',
          message: msg,
        },
        error: msg,
      });
      return false;
    }
  },

  clearSaveFeedback: () => {
    set({ saveFeedback: { status: 'idle' } });
  },
}));

export default useSettingsStore;
