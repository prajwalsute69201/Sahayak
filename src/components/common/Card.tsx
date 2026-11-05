import React, { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'outline';
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default:
      'bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100',
    muted:
      'bg-slate-50 text-slate-900 border border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100',
    outline:
      'bg-transparent border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100',
  };

  return (
    <div
      className={cn('rounded-xl p-4 transition-all duration-150', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
