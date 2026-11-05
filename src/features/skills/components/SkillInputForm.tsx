/**
 * Sahayak SkillInputForm Component
 * Compact modal to capture required and optional parameter values before executing a skill.
 * Features live instruction preview.
 */

import React, { useState, useMemo } from 'react';
import { X, Play, Eye } from 'lucide-react';
import { Skill, SkillParameter } from '../types/skill.types';
import { skillTemplateService } from '../services/skill-template.service';

interface SkillInputFormProps {
  skill: Skill;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string | number | boolean>) => void;
  isExecuting?: boolean;
}

export const SkillInputForm: React.FC<SkillInputFormProps> = ({
  skill,
  isOpen,
  onClose,
  onSubmit,
  isExecuting = false,
}) => {
  // Initialize input state with defaults
  const [values, setValues] = useState<Record<string, string | number | boolean>>(() => {
    const init: Record<string, string | number | boolean> = {};
    for (const param of skill.parameters) {
      if (param.defaultValue !== undefined) {
        init[param.name] = param.defaultValue;
      } else {
        init[param.name] = param.type === 'boolean' ? false : '';
      }
    }
    return init;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Compute live rendered instruction preview
  const livePreview = useMemo(() => {
    const res = skillTemplateService.renderTemplate(
      skill.instructionTemplate,
      skill.parameters,
      values
    );
    return res.rendered;
  }, [skill, values]);

  if (!isOpen) return null;

  const handleChange = (param: SkillParameter, val: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [param.name]: val }));
    if (errors[param.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[param.name];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    for (const param of skill.parameters) {
      if (param.required) {
        const val = values[param.name];
        if (val === undefined || val === null || String(val).trim() === '') {
          newErrors[param.name] = `${param.label} is required.`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(values);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-input-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3
              id="skill-input-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Run: {skill.name}
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {skill.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Dynamic Parameter Fields */}
          {skill.parameters.map((param) => {
            const hasError = !!errors[param.name];

            return (
              <div key={param.name}>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {param.label}
                    {param.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  {param.description && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {param.description}
                    </span>
                  )}
                </div>

                {param.type === 'select' && param.options ? (
                  <select
                    value={String(values[param.name] ?? '')}
                    onChange={(e) => handleChange(param, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {param.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : param.type === 'boolean' ? (
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(values[param.name])}
                      onChange={(e) => handleChange(param, e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {values[param.name] ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                ) : param.type === 'number' ? (
                  <input
                    type="number"
                    value={Number(values[param.name] ?? 0)}
                    onChange={(e) => handleChange(param, parseFloat(e.target.value) || 0)}
                    placeholder={param.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(values[param.name] ?? '')}
                    onChange={(e) => handleChange(param, e.target.value)}
                    placeholder={param.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                )}

                {hasError && (
                  <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
                    {errors[param.name]}
                  </p>
                )}
              </div>
            );
          })}

          {/* Rendered Live Preview Card */}
          <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Eye className="h-3 w-3" />
              Live Instruction Preview
            </div>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {livePreview}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isExecuting ? 'Running...' : 'Execute Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
