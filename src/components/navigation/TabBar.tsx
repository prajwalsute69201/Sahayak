import React from 'react';
import { MessageSquareText, Bot, Brain, Sparkles, Settings } from 'lucide-react';
import { NavigationTab, useNavigationStore } from '@/store/useNavigationStore';
import { cn } from '@/utils/cn';

interface TabItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { id: 'chat', label: 'Read & Chat', icon: MessageSquareText },
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const TabBar: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <nav
      role="tablist"
      aria-label="Sahayak Main Navigation"
      className="flex w-full items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'group flex flex-1 flex-col items-center justify-center rounded-lg py-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            )}
          >
            <div
              className={cn(
                'relative flex h-6 w-10 items-center justify-center rounded-full transition-colors',
                isActive && 'bg-blue-50 dark:bg-blue-950/80'
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="mt-0.5 text-[10px] tracking-tight truncate max-w-[64px]">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default TabBar;
