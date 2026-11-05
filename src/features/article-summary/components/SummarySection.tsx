import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SummarySectionProps {
  icon: LucideIcon;
  title: string;
  count?: number;
  badge?: string;
  children: ReactNode;
  className?: string;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  icon: Icon,
  title,
  count,
  badge,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3.5 text-left shadow-xs dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {title}
          </h3>
          {count !== undefined && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {count}
            </span>
          )}
        </div>

        {badge && (
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {badge}
          </span>
        )}
      </div>

      <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
        {children}
      </div>
    </div>
  );
};

export default SummarySection;
