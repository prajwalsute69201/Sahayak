import React from 'react';
import logoLight from '@/assets/logo.png';
import logoDark from '@/assets/logo-dark.png';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import { Settings, Globe } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Header: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { activeTab, setActiveTab, activePage } = useNavigationStore();

  const cycleLanguage = () => {
    const cycle: Record<string, 'en' | 'hi-en' | 'auto'> = {
      en: 'hi-en',
      'hi-en': 'auto',
      auto: 'en',
    };
    const nextLang = cycle[settings.language] || 'en';
    updateSettings({ language: nextLang });
  };

  const getLanguageLabel = () => {
    switch (settings.language) {
      case 'hi-en':
        return 'Hinglish';
      case 'auto':
        return 'Auto';
      default:
        return 'English';
    }
  };

  return (
    <header className="flex flex-col border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs select-none">
      <div className="flex h-12 items-center justify-between px-3">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setActiveTab('chat')}
          title="Sahayak Home"
        >
          <img
            src={logoLight}
            alt="Sahayak"
            className="h-7 w-auto object-contain transition-opacity duration-200 dark:hidden"
          />
          <img
            src={logoDark}
            alt="Sahayak"
            className="hidden h-7 w-auto object-contain transition-opacity duration-200 dark:block"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Language Toggle (EN / HI / AUTO) */}
          <button
            type="button"
            onClick={cycleLanguage}
            title={`Switch language engine (Current: ${getLanguageLabel()})`}
            className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          >
            <span
              className={cn(
                'rounded px-1 py-0.5',
                settings.language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              EN
            </span>
            <span className="mx-0.5 text-slate-300 dark:text-slate-600">/</span>
            <span
              className={cn(
                'rounded px-1 py-0.5',
                settings.language === 'hi-en'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              HI
            </span>
            <span className="mx-0.5 text-slate-300 dark:text-slate-600">/</span>
            <span
              className={cn(
                'rounded px-1 py-0.5',
                settings.language === 'auto'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              AUTO
            </span>
          </button>

          {/* Quick Settings Gear Icon */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            title="Settings & Diagnostics"
            aria-label="Open Settings"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              activeTab === 'settings'
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Tab Sub-header bar */}
      {activePage && (
        <div className="flex items-center justify-between bg-slate-50/80 px-3 py-1 text-[11px] text-slate-500 dark:bg-slate-950/60 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 truncate max-w-[240px]">
            <Globe className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
              {activePage.domain || 'No active web page'}
            </span>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-medium',
              activePage.isSupported
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                activePage.isSupported ? 'bg-emerald-500' : 'bg-amber-500'
              )}
            />
            {activePage.isSupported ? 'Active' : 'Restricted Page'}
          </span>
        </div>
      )}
    </header>
  );
};

export default Header;
