import React, { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SettingsSection } from './SettingsSection';
import { AIProviderSettings } from './components/AIProviderSettings';
import Toggle from '@/components/common/Toggle';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import FeedbackBanner from '@/components/common/FeedbackBanner';
import {
  KeyRound,
  Palette,
  ShieldCheck,
  Bell,
  HardDrive,
  Sun,
  Moon,
  Laptop,
  Check,
} from 'lucide-react';
import { ThemeMode, LanguagePreference } from '@/types/settings.types';
import { cn } from '@/utils/cn';
import { SafetySettings } from '@/features/safety';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings, saveFeedback, clearSaveFeedback, isSaving } =
    useSettingsStore();

  const [formState, setFormState] = useState(settings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state when settings change
  const handleChange = <K extends keyof typeof formState>(key: K, value: (typeof formState)[K]) => {
    const updated = { ...formState, [key]: value };
    setFormState(updated);
    // Automatically apply theme or language immediately
    if (key === 'theme' || key === 'language') {
      updateSettings({ [key]: value });
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formState);
  };

  const handleReset = async () => {
    await resetSettings();
    setFormState(useSettingsStore.getState().settings);
    setShowResetConfirm(false);
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Settings & Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure your AI keys, language, theme, and safety boundaries.
          </p>
        </div>
      </div>

      <FeedbackBanner
        status={saveFeedback.status}
        message={saveFeedback.message}
        onDismiss={clearSaveFeedback}
      />

      <form onSubmit={handleSaveAll} className="flex flex-col gap-4">
        {/* Section 1: AI Provider Keys & Fallback */}
        <SettingsSection
          icon={KeyRound}
          title="AI Providers & Rate-Limit Resilience"
          description="Configure Google Gemini and Groq fallback cascade. Keys are stored exclusively in local browser storage (Zero-Telemetry)."
        >
          <AIProviderSettings settings={formState} onChange={handleChange} />
        </SettingsSection>

        {/* Section 2: General & Appearance */}
        <SettingsSection
          icon={Palette}
          title="Appearance & Language"
          description="Choose how Sahayak looks and communicates with you."
        >
          {/* Theme Segmented Control */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Theme Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light' as ThemeMode, label: 'Light', icon: Sun },
                { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
                { id: 'system' as ThemeMode, label: 'System', icon: Laptop },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = formState.theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleChange('theme', item.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors',
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Selection */}
          <div className="flex flex-col gap-1.5 text-left pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Preferred Language Engine
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'auto' as LanguagePreference, label: 'Auto Detect', hint: 'Smart match' },
                { id: 'en' as LanguagePreference, label: 'English', hint: 'Default tone' },
                {
                  id: 'hi-en' as LanguagePreference,
                  label: 'Hinglish',
                  hint: 'Hindi-EN Roman',
                },
              ].map((item) => {
                const isSelected = formState.language === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleChange('language', item.id)}
                    className={cn(
                      'flex flex-col items-start rounded-lg border p-2 text-left transition-colors',
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold">{item.label}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {item.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </SettingsSection>

        {/* Section 3: Deterministic Safety Rails & Execution */}
        <SettingsSection
          icon={ShieldCheck}
          title="Safety Rails & Privacy"
          description="Hardcoded deterministic boundaries that safeguard execution."
        >
          <SafetySettings />

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Toggle
              label="Domain Safety Blacklist"
              description="Blocks agent execution on banking, payment, and sensitive portals."
              checked={formState.enableSafetyBlacklist}
              onChange={(val) => handleChange('enableSafetyBlacklist', val)}
            />
          </div>

          <Toggle
            label="Suppress Password & OTP Autofill"
            description="Prevents typing or reading sensitive password, OTP, and CVV fields."
            checked={formState.preventPasswordAutofill}
            onChange={(val) => handleChange('preventPasswordAutofill', val)}
          />

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Toggle
              label="Zero-Telemetry Privacy Guarantee"
              description="All credentials, memory profiles, and history stay strictly on your device."
              checked={!formState.telemetryEnabled}
              disabled={true}
              onChange={() => {}}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Max Agent Step Limit: {formState.maxSteps}
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={formState.maxSteps}
              onChange={(e) => handleChange('maxSteps', parseInt(e.target.value, 10))}
              className="mt-2 w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5 steps</span>
              <span>15 (default)</span>
              <span>30 steps</span>
            </div>
          </div>
        </SettingsSection>

        {/* Section 4: Notifications & Feedback */}
        <SettingsSection
          icon={Bell}
          title="Notifications & Feedback"
          description="Manage sound and visual alerts during agent tasks."
        >
          <Toggle
            label="Action Approval Notifications"
            description="Alerts you when the agent requires your explicit approval to click or type."
            checked={formState.actionNotifications}
            onChange={(val) => handleChange('actionNotifications', val)}
          />

          <Toggle
            label="Audio Cues"
            description="Play subtle audio cues on task completion and approval triggers."
            checked={formState.soundFeedback}
            onChange={(val) => handleChange('soundFeedback', val)}
          />
        </SettingsSection>

        {/* Save All Button */}
        <div className="sticky bottom-0 z-10 -mx-3.5 -mb-3.5 bg-white/95 p-3.5 backdrop-blur-sm border-t border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
          <Button type="submit" variant="primary" size="md" isLoading={isSaving} className="w-full">
            Save Changes
          </Button>
        </div>
      </form>

      {/* Danger Zone: Reset Settings */}
      <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <HardDrive className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-xs font-semibold text-red-900 dark:text-red-200">
                Reset All Settings
              </h3>
              <p className="text-[11px] text-red-700/80 dark:text-red-300/70">
                Restore default preferences and clear local API keys.
              </p>
            </div>
          </div>

          {!showResetConfirm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              Reset
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs"
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
