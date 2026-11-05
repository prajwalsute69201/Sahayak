import React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface FeedbackBannerProps {
  status: 'idle' | 'success' | 'error' | 'info';
  message?: string;
  onDismiss?: () => void;
  className?: string;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  status,
  message,
  onDismiss,
  className,
}) => {
  if (status === 'idle' || !message) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      styles:
        'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
      iconStyles: 'text-emerald-600 dark:text-emerald-400',
    },
    error: {
      icon: AlertCircle,
      styles:
        'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800',
      iconStyles: 'text-red-600 dark:text-red-400',
    },
    info: {
      icon: Info,
      styles:
        'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
      iconStyles: 'text-blue-600 dark:text-blue-400',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border p-3 text-xs font-medium transition-all duration-200 shadow-sm',
        config.styles,
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4 shrink-0', config.iconStyles)} />
        <span>{message}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
          aria-label="Dismiss message"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default FeedbackBanner;
