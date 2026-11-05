import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNavigationStore } from '@/store/useNavigationStore';
import Shell from '@/components/layout/Shell';
import HomePage from '@/features/home/HomePage';
import AgentPage from '@/features/agent/AgentPage';
import { MemoryDashboard } from '@/features/memory/components/MemoryDashboard';
import SkillsPage from '@/features/skills/SkillsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';

export const App: React.FC = () => {
  const { isInitialized, isLoading, error, initSettings } = useSettingsStore();
  const { activeTab, syncActiveBrowserTab } = useNavigationStore();

  useEffect(() => {
    initSettings();
    syncActiveBrowserTab();

    // Listen to active tab changes in Chrome
    if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
      const handleTabActivated = () => syncActiveBrowserTab();
      const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
          syncActiveBrowserTab();
        }
      };

      chrome.tabs.onActivated.addListener(handleTabActivated);
      chrome.tabs.onUpdated.addListener(handleTabUpdated);

      return () => {
        chrome.tabs.onActivated.removeListener(handleTabActivated);
        chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      };
    }
  }, [initSettings, syncActiveBrowserTab]);

  if (isLoading && !isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingState message="Initializing Sahayak Assistant..." />
      </div>
    );
  }

  if (error && !isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <ErrorState title="Initialization Failed" message={error} onRetry={() => initSettings()} />
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'chat':
        return <HomePage />;
      case 'agent':
        return <AgentPage />;
      case 'memory':
        return <MemoryDashboard />;
      case 'skills':
        return <SkillsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return <Shell>{renderActiveTab()}</Shell>;
};

export default App;
