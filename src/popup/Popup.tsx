import React from 'react';
import logoLight from '@/assets/logo.png';
import logoDark from '@/assets/logo-dark.png';

export const Popup: React.FC = () => {
  const openSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    }
  };

  return (
    <div className="flex w-80 flex-col bg-white p-4 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
        <picture>
          <source srcSet={logoDark} media="(prefers-color-scheme: dark)" />
          <img
            src={logoLight}
            alt="Sahayak Logo"
            className="h-6 w-auto object-contain dark:hidden"
          />
        </picture>
        <img
          src={logoDark}
          alt="Sahayak Logo"
          className="hidden h-6 w-auto object-contain dark:block"
        />
        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          MV3
        </span>
      </div>

      <div className="py-4 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sahayak is active. Open the Side Panel to summarize pages, ask questions, or run agent
          tasks.
        </p>
        <button
          onClick={openSidePanel}
          className="mt-4 w-full rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Open Side Panel
        </button>
      </div>
    </div>
  );
};

export default Popup;
