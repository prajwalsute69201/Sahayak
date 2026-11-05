import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading Sahayak...',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
};

export default LoadingState;
