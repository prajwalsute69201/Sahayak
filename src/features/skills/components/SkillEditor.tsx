/**
 * Sahayak SkillEditor Component
 * Visual editor to create, customize, and configure reusable skills with template variable bindings.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Plus, Trash2, Sparkles } from 'lucide-react';
import {
  Skill,
  SkillCategory,
  SkillExecutionRoute,
  SkillParameter,
  SkillParameterType,
  SupportedPageType,
} from '../types/skill.types';
import { skillTemplateService } from '../services/skill-template.service';
import {
  MAX_SKILL_NAME_LENGTH,
  MAX_SKILL_DESC_LENGTH,
  MAX_TEMPLATE_LENGTH,
} from '../schemas/skill.schema';

interface SkillEditorProps {
  initialSkill?: Skill | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    skillData: Omit<Skill, 'id' | 'source' | 'version' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    }
  ) => Promise<void>;
}

const CATEGORIES: SkillCategory[] = [
  'summarization',
  'research',
  'productivity',
  'writing',
  'navigation',
  'page_interaction',
  'custom',
];

const ROUTES: { id: SkillExecutionRoute; label: string }[] = [
  { id: 'chat', label: 'Grounded Page Chat' },
  { id: 'summarize', label: 'Article Summarizer' },
  { id: 'youtube', label: 'YouTube Video Summarizer' },
  { id: 'find_element', label: 'Find Interactive Element' },
  { id: 'rewrite', label: 'Text Rewriter' },
  { id: 'agent_action', label: 'Browser Action (Single-Step Agent)' },
];

const PAGE_TYPES: { id: SupportedPageType; label: string }[] = [
  { id: 'any', label: 'Any Page' },
  { id: 'article', label: 'Articles' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'selection', label: 'Text Selection' },
  { id: 'interactive', label: 'Interactive Forms' },
];

export const SkillEditor: React.FC<SkillEditorProps> = ({
  initialSkill,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SkillCategory>('custom');
  const [executionRoute, setExecutionRoute] = useState<SkillExecutionRoute>('chat');
  const [supportedPageTypes, setSupportedPageTypes] = useState<SupportedPageType[]>(['any']);
  const [instructionTemplate, setInstructionTemplate] = useState('');
  const [parameters, setParameters] = useState<SkillParameter[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSkill) {
      setName(initialSkill.name);
      setDescription(initialSkill.description);
      setCategory(initialSkill.category);
      setExecutionRoute(initialSkill.executionRoute);
      setSupportedPageTypes([...initialSkill.supportedPageTypes]);
      setInstructionTemplate(initialSkill.instructionTemplate);
      setParameters(JSON.parse(JSON.stringify(initialSkill.parameters)));
    } else {
      setName('');
      setDescription('');
      setCategory('custom');
      setExecutionRoute('chat');
      setSupportedPageTypes(['any']);
      setInstructionTemplate('Summarize the main points about {{topic}} on this page.');
      setParameters([
        {
          name: 'topic',
          label: 'Topic of Interest',
          type: 'string',
          defaultValue: '',
          required: true,
          placeholder: 'e.g. pricing, roadmap, security',
        },
      ]);
    }
    setError(null);
  }, [initialSkill, isOpen]);

  // Extract variables present in the template
  const detectedVariables = useMemo(() => {
    return skillTemplateService.extractVariables(instructionTemplate);
  }, [instructionTemplate]);

  if (!isOpen) return null;

  const handleTogglePageType = (type: SupportedPageType) => {
    if (type === 'any') {
      setSupportedPageTypes(['any']);
      return;
    }

    const withoutAny = supportedPageTypes.filter((t) => t !== 'any');
    if (withoutAny.includes(type)) {
      const next = withoutAny.filter((t) => t !== type);
      setSupportedPageTypes(next.length === 0 ? ['any'] : next);
    } else {
      setSupportedPageTypes([...withoutAny, type]);
    }
  };

  const handleAddDetectedParam = (varName: string) => {
    if (parameters.some((p) => p.name === varName)) return;

    setParameters([
      ...parameters,
      {
        name: varName,
        label: varName.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: 'string',
        defaultValue: '',
        required: true,
      },
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleUpdateParam = (index: number, updates: Partial<SkillParameter>) => {
    setParameters((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanDesc = description.trim();
    const cleanTemplate = instructionTemplate.trim();

    if (!cleanName) {
      setError('Skill name is required.');
      return;
    }
    if (!cleanDesc) {
      setError('Skill description is required.');
      return;
    }
    if (!cleanTemplate) {
      setError('Instruction template is required.');
      return;
    }

    // Template validation
    const templateValidation = skillTemplateService.validateTemplate(cleanTemplate, parameters);
    if (!templateValidation.isValid) {
      setError(templateValidation.errors.join(' '));
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialSkill?.id,
        name: cleanName,
        description: cleanDesc,
        category,
        icon: initialSkill?.icon || 'Sparkles',
        instructionTemplate: cleanTemplate,
        parameters,
        supportedPageTypes,
        executionRoute,
        isEnabled: initialSkill?.isEnabled !== undefined ? initialSkill.isEnabled : true,
        isFavorite: Boolean(initialSkill?.isFavorite),
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save skill';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3
              id="skill-editor-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {initialSkill ? 'Edit Custom Skill' : 'Create Custom Skill'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Skill Name
                </label>
                <span className="text-[10px] text-slate-400">
                  {name.length}/{MAX_SKILL_NAME_LENGTH}
                </span>
              </div>
              <input
                type="text"
                value={name}
                maxLength={MAX_SKILL_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Competitor Price Extractor"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SkillCategory)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>
              <span className="text-[10px] text-slate-400">
                {description.length}/{MAX_SKILL_DESC_LENGTH}
              </span>
            </div>
            <input
              type="text"
              value={description}
              maxLength={MAX_SKILL_DESC_LENGTH}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief explanation of what this workflow accomplishes"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Execution Route & Supported Pages */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Execution Engine
              </label>
              <select
                value={executionRoute}
                onChange={(e) => setExecutionRoute(e.target.value as SkillExecutionRoute)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Supported Pages
              </label>
              <div className="flex flex-wrap gap-1">
                {PAGE_TYPES.map((p) => {
                  const isChecked = supportedPageTypes.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleTogglePageType(p.id)}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium border transition-colors ${
                        isChecked
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Instruction Template */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Instruction Template
              </label>
              <span className="text-[10px] text-slate-400">
                Use{' '}
                <code className="bg-slate-100 px-1 rounded dark:bg-slate-800">{`{{variable}}`}</code>{' '}
                for inputs
              </span>
            </div>
            <textarea
              rows={4}
              value={instructionTemplate}
              maxLength={MAX_TEMPLATE_LENGTH}
              onChange={(e) => setInstructionTemplate(e.target.value)}
              placeholder="e.g. Extract the pricing table for {{tier_name}} and calculate annual cost."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono text-[11px] leading-relaxed resize-none"
            />

            {/* Variable detection helper bar */}
            {detectedVariables.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500">Detected Variables:</span>
                {detectedVariables.map((v) => {
                  const hasParam = parameters.some((p) => p.name === v);
                  return (
                    <span
                      key={v}
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono border ${
                        hasParam
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 cursor-pointer'
                      }`}
                      onClick={() => !hasParam && handleAddDetectedParam(v)}
                    >
                      {`{{${v}}}`}
                      {!hasParam && <Plus className="h-2.5 w-2.5" />}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Parameter Configuration List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Input Parameters ({parameters.length})
              </label>
              <button
                type="button"
                onClick={() =>
                  setParameters([
                    ...parameters,
                    {
                      name: `param_${parameters.length + 1}`,
                      label: `Parameter ${parameters.length + 1}`,
                      type: 'string',
                      defaultValue: '',
                      required: false,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                <Plus className="h-3 w-3" />
                Add Parameter
              </button>
            </div>

            {parameters.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                No input parameters defined. This skill will execute in 1-click mode.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {parameters.map((param, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-950/50 text-xs"
                  >
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) =>
                        handleUpdateParam(idx, {
                          name: e.target.value.toLowerCase().replace(/[^\w-]/g, ''),
                        })
                      }
                      placeholder="var_name"
                      className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono dark:border-slate-700 dark:bg-slate-800"
                    />

                    <input
                      type="text"
                      value={param.label}
                      onChange={(e) => handleUpdateParam(idx, { label: e.target.value })}
                      placeholder="Label"
                      className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-800"
                    />

                    <select
                      value={param.type}
                      onChange={(e) =>
                        handleUpdateParam(idx, { type: e.target.value as SkillParameterType })
                      }
                      className="w-20 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>

                    <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => handleUpdateParam(idx, { required: e.target.checked })}
                      />
                      Req
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveParam(idx)}
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {isSubmitting ? 'Saving...' : initialSkill ? 'Update Skill' : 'Create Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
