/**
 * Sahayak Safety Settings Component (Slice 16)
 * Displays active deterministic safety rules, mandatory blocked categories,
 * and user preferences for elevated-risk confirmation.
 */

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Toggle from '@/components/common/Toggle';
import { SafetySettings as ISafetySettings } from '../types/safety.types';
import { safetyPolicyService } from '../services/safety-policy.service';
import { DEFAULT_SAFETY_RULES } from '../rules/default-safety-rules';

export const SafetySettings: React.FC = () => {
  const [settings, setSettings] = useState<ISafetySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    safetyPolicyService.getSettings().then((res) => {
      setSettings(res);
      setIsLoading(false);
    });
  }, []);

  const handleToggleEnhanced = async (val: boolean) => {
    if (!settings) return;
    const updated = await safetyPolicyService.updateSettings({
      enhancedConfirmationEnabled: val,
    });
    setSettings(updated);
  };

  const handleToggleStrictUrl = async (val: boolean) => {
    if (!settings) return;
    const updated = await safetyPolicyService.updateSettings({
      strictUrlValidation: val,
    });
    setSettings(updated);
  };

  if (isLoading || !settings) {
    return <div className="text-xs text-slate-400 py-2">Loading safety rails...</div>;
  }

  const mandatoryRules = DEFAULT_SAFETY_RULES.filter((r) => r.isMandatory);

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* Policy Status Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <div className="flex flex-col">
          <span className="font-bold">Deterministic Safety Policy Active</span>
          <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
            Safety boundaries are enforced by code; AI models and Skills cannot override them.
          </span>
        </div>
      </div>

      {/* Mandatory Blocked Categories List */}
      <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Mandatory Blocked Operations
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <Lock className="h-2.5 w-2.5" /> Immutable
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1 pt-1">
          {mandatoryRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {rule.name}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">{rule.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Preferences (Safe, non-critical preferences only) */}
      <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <Toggle
          label="Enhanced Double-Confirmation"
          description="Require explicit checkbox acknowledgement for elevated-risk or ambiguous interactions."
          checked={settings.enhancedConfirmationEnabled}
          onChange={handleToggleEnhanced}
        />

        <Toggle
          label="Strict Protocol Whitelisting"
          description="Permit only verified http: and https: protocols; reject all internal or embedded schemes."
          checked={settings.strictUrlValidation}
          onChange={handleToggleStrictUrl}
        />
      </div>
    </div>
  );
};

export default SafetySettings;
