/**
 * Sahayak Safety Risk Indicator Component (Slice 16)
 * Visual badge displaying deterministic risk classifications with standard color schemes.
 */

import React from 'react';
import { ShieldCheck, Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { SafetyRiskLevel } from '../types/safety.types';
import { cn } from '@/utils/cn';

interface RiskIndicatorProps {
  risk: SafetyRiskLevel;
  className?: string;
  showLabel?: boolean;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  risk,
  className,
  showLabel = true,
}) => {
  const config = {
    low: {
      label: 'Low Risk',
      icon: ShieldCheck,
      badgeClass:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    },
    medium: {
      label: 'Medium Risk',
      icon: Shield,
      badgeClass:
        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    },
    high: {
      label: 'High Risk',
      icon: ShieldAlert,
      badgeClass:
        'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
    },
    critical: {
      label: 'Critical Risk (Blocked)',
      icon: ShieldX,
      badgeClass:
        'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-200 dark:border-red-800',
    },
  }[risk];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-tight',
        config.badgeClass,
        className
      )}
      title={`Deterministic Risk Assessment: ${config.label}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

export default RiskIndicator;
