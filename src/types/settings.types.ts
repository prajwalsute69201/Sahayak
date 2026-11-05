import { z } from 'zod';

export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguagePreference = 'auto' | 'en' | 'hi-en';
export type AiModelChoice = 'gemini-2.0-flash-lite' | 'gemini-2.0-flash' | 'groq-llama-3.3-70b';

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['auto', 'en', 'hi-en']),
  geminiApiKey: z.string().trim(),
  groqApiKey: z.string().trim(),
  preferredModel: z.enum(['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'groq-llama-3.3-70b']),
  primaryProvider: z.enum(['gemini', 'groq']).default('gemini'),
  enableFallback: z.boolean().default(true),
  geminiModel: z.string().default('gemini-2.0-flash-lite'),
  groqModel: z.string().default('llama-3.3-70b-versatile'),
  maxSteps: z.number().int().min(1).max(50),
  dryRunDefault: z.boolean(),
  soundFeedback: z.boolean(),
  actionNotifications: z.boolean(),
  enableSafetyBlacklist: z.boolean(),
  preventPasswordAutofill: z.boolean(),
  telemetryEnabled: z.boolean(),
});

export type UserSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  language: 'en',
  geminiApiKey: '',
  groqApiKey: '',
  preferredModel: 'gemini-2.0-flash-lite',
  primaryProvider: 'gemini',
  enableFallback: true,
  geminiModel: 'gemini-2.0-flash-lite',
  groqModel: 'llama-3.3-70b-versatile',
  maxSteps: 15,
  dryRunDefault: false,
  soundFeedback: false,
  actionNotifications: true,
  enableSafetyBlacklist: true,
  preventPasswordAutofill: true,
  telemetryEnabled: false,
};

export const SETTINGS_STORAGE_KEY = 'sahayak_user_settings';
