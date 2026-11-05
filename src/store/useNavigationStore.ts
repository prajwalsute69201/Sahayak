import { create } from 'zustand';

export type NavigationTab = 'chat' | 'agent' | 'memory' | 'skills' | 'settings';

export interface ActivePageInfo {
  url: string;
  title: string;
  domain: string;
  favIconUrl?: string;
  isSupported: boolean;
}

interface NavigationState {
  activeTab: NavigationTab;
  previousTab: NavigationTab | null;
  activePage: ActivePageInfo | null;
  setActiveTab: (tab: NavigationTab) => void;
  setActivePage: (info: ActivePageInfo | null) => void;
  syncActiveBrowserTab: () => Promise<void>;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  activeTab: 'chat',
  previousTab: null,
  activePage: null,

  setActiveTab: (tab: NavigationTab) => {
    set({
      previousTab: get().activeTab,
      activeTab: tab,
    });
  },

  setActivePage: (info) => {
    set({ activePage: info });
  },

  syncActiveBrowserTab: async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      set({
        activePage: {
          url: 'https://example.com/demo-page',
          title: 'Demo Environment Page',
          domain: 'example.com',
          isSupported: true,
        },
      });
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        let domain = '';
        try {
          const parsed = new URL(tab.url);
          domain = parsed.hostname;
        } catch {
          domain = tab.url;
        }

        const isSpecialProtocol =
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:');

        set({
          activePage: {
            url: tab.url,
            title: tab.title || domain,
            domain,
            favIconUrl: tab.favIconUrl,
            isSupported: !isSpecialProtocol,
          },
        });
      }
    } catch (err) {
      console.warn('[Sahayak Navigation] Tab query failed:', err);
    }
  },
}));

export default useNavigationStore;
