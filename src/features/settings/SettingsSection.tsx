import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import Card from '@/components/common/Card';

export interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  icon: Icon,
  title,
  description,
  children,
}) => {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col text-left">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 pt-1">{children}</div>
    </Card>
  );
};

export default SettingsSection;
