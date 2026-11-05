import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from '@/store/useNavigationStore';

describe('Navigation Module & Store', () => {
  beforeEach(() => {
    useNavigationStore.setState({
      activeTab: 'chat',
      previousTab: null,
      activePage: null,
    });
  });

  it('updates active tab and preserves previous tab history', () => {
    const store = useNavigationStore.getState();
    expect(store.activeTab).toBe('chat');

    store.setActiveTab('settings');
    expect(useNavigationStore.getState().activeTab).toBe('settings');
    expect(useNavigationStore.getState().previousTab).toBe('chat');

    useNavigationStore.getState().setActiveTab('agent');
    expect(useNavigationStore.getState().activeTab).toBe('agent');
    expect(useNavigationStore.getState().previousTab).toBe('settings');
  });

  it('syncs active browser tab context info correctly', async () => {
    await useNavigationStore.getState().syncActiveBrowserTab();
    const activePage = useNavigationStore.getState().activePage;

    expect(activePage).toBeDefined();
    expect(activePage?.domain).toBe('developer.chrome.com');
    expect(activePage?.isSupported).toBe(true);
  });
});
