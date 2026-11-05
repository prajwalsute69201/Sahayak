import React, { ReactNode } from 'react';
import Header from './Header';
import TabBar from '@/components/navigation/TabBar';

export interface ShellProps {
  children: ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 focus:outline-none">
        {children}
      </main>
      <TabBar />
    </div>
  );
};

export default Shell;
