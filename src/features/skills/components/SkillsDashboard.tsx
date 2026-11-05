/**
 * Sahayak SkillsDashboard Component
 * Central interface to browse built-in skills, create custom skills, run one-click workflows,
 * review history, and manage portable JSON imports and exports.
 */

import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Search, Upload, Download } from 'lucide-react';
import { Skill, SkillCategory, SkillPageContextInfo } from '../types/skill.types';
import { useSkills } from '../hooks/useSkills';
import { useSkillExecution } from '../hooks/useSkillExecution';
import { useNavigationStore } from '@/store/useNavigationStore';
import { SkillCard } from './SkillCard';
import { SkillEditor } from './SkillEditor';
import { SkillInputForm } from './SkillInputForm';
import { SkillExecutionResult } from './SkillExecutionResult';
import { SkillImportDialog } from './SkillImportDialog';
import { SkillExportDialog } from './SkillExportDialog';
import { SkillExecutionHistory } from './SkillExecutionHistory';
import { cn } from '@/utils/cn';

const CATEGORIES: { id: SkillCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'summarization', label: 'Summarize' },
  { id: 'research', label: 'Research' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'writing', label: 'Writing' },
  { id: 'page_interaction', label: 'Actions' },
  { id: 'custom', label: 'Custom' },
];

type MainTab = 'all' | 'favorites' | 'builtin' | 'custom' | 'history';

export const SkillsDashboard: React.FC = () => {
  const {
    skills,
    isLoading,
    error,
    createSkill,
    updateSkill,
    duplicateSkill,
    deleteSkill,
    toggleEnabled,
    toggleFavorite,
    loadSkills,
  } = useSkills();

  const { isExecuting, currentOutput, execute, clearOutput } = useSkillExecution();
  const { activePage, setActiveTab } = useNavigationStore();

  const [activeTab, setActiveMainTab] = useState<MainTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [runningSkill, setRunningSkill] = useState<Skill | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Derive current page context info
  const pageContext: SkillPageContextInfo | null = useMemo(() => {
    if (!activePage) return null;
    const url = activePage.url || '';
    const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
    const isRestricted = !activePage.isSupported;
    const isArticle = !isYouTube && !isRestricted && Boolean(activePage.title);

    return {
      url,
      title: activePage.title || 'Active Webpage',
      isArticle,
      isYouTube,
      hasSelection: false, // Default context
      isRestricted,
    };
  }, [activePage]);

  // Filter skills based on tab, category, and search query
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      // Main tab filter
      if (activeTab === 'favorites' && !s.isFavorite) return false;
      if (activeTab === 'builtin' && s.source !== 'built_in') return false;
      if (activeTab === 'custom' && s.source !== 'user_created') return false;

      // Category filter
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchDesc = s.description.toLowerCase().includes(q);
        const matchCat = s.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }

      return true;
    });
  }, [skills, activeTab, selectedCategory, searchQuery]);

  // Handle clicking "Run" on a skill card
  const handleRunSkill = (skill: Skill) => {
    if (skill.parameters.length > 0) {
      // Needs parameter input
      setRunningSkill(skill);
    } else {
      // One-click execution directly!
      execute(skill, {}, pageContext);
    }
  };

  const handleInputSubmit = async (values: Record<string, string | number | boolean>) => {
    if (!runningSkill) return;
    const targetSkill = runningSkill;
    setRunningSkill(null);
    await execute(targetSkill, values, pageContext);
  };

  const handleOpenInChat = (_text: string) => {
    setActiveTab('chat');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
      {/* Header Banner */}
      <div className="mb-4 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-indigo-950/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Skills & Workflows
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                One-click AI workflows and portable prompt recipes
              </p>
            </div>
          </div>

          {/* Quick Toolbar Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsImportOpen(true)}
              aria-label="Import skills JSON"
              title="Import JSON"
              className="rounded-lg border border-slate-200/80 bg-white/90 p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              aria-label="Export skills JSON"
              title="Export JSON"
              className="rounded-lg border border-slate-200/80 bg-white/90 p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => {
                setEditingSkill(null);
                setIsEditorOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Execution Output Result Banner */}
      {currentOutput && (
        <SkillExecutionResult
          output={currentOutput}
          onClose={clearOutput}
          onOpenInChat={handleOpenInChat}
        />
      )}

      {/* Main Tab Switcher */}
      <div className="mb-3 flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'builtin', label: 'Built-in' },
            { id: 'custom', label: 'My Skills' },
            { id: 'history', label: 'History' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveMainTab(t.id)}
            className={cn(
              'flex-1 rounded-lg py-1 text-center text-xs font-medium transition-all',
              activeTab === t.id
                ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs dark:bg-blue-950/70 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'history' ? (
        /* History View */
        <SkillExecutionHistory
          onRetry={(record) => {
            const skill = skills.find((s) => s.id === record.skillId);
            if (skill) {
              handleRunSkill(skill);
            }
          }}
        />
      ) : (
        /* Skills List View */
        <>
          {/* Search Bar */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills, categories, or keywords..."
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? skills.length
                  : skills.filter((s) => s.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800'
                  )}
                >
                  {cat.label}
                  <span
                    className={cn(
                      'rounded-full px-1 text-[10px]',
                      isSelected
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid of Skill Cards */}
          {error && (
            <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading skills library...
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                No matching skills found
              </h4>
              <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search terms or clearing your category filter.'
                  : 'Get started by creating your first custom skill or import a portable skills package.'}
              </p>

              <button
                onClick={() => {
                  setEditingSkill(null);
                  setIsEditorOpen(true);
                }}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Custom Skill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  pageContext={pageContext}
                  onRun={handleRunSkill}
                  onEdit={(s) => {
                    setEditingSkill(s);
                    setIsEditorOpen(true);
                  }}
                  onDuplicate={(s) => duplicateSkill(s.id)}
                  onDelete={deleteSkill}
                  onToggleFavorite={toggleFavorite}
                  onToggleEnabled={toggleEnabled}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Parameter Input Modal */}
      {runningSkill && (
        <SkillInputForm
          skill={runningSkill}
          isOpen={Boolean(runningSkill)}
          onClose={() => setRunningSkill(null)}
          onSubmit={handleInputSubmit}
          isExecuting={isExecuting}
        />
      )}

      {/* Editor Modal */}
      <SkillEditor
        isOpen={isEditorOpen}
        initialSkill={editingSkill}
        onClose={() => setIsEditorOpen(false)}
        onSave={async (skillData) => {
          if (skillData.id) {
            await updateSkill(skillData.id, skillData);
          } else {
            await createSkill(skillData);
          }
        }}
      />

      {/* Import Modal */}
      <SkillImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={async () => {
          await loadSkills();
        }}
      />

      {/* Export Modal */}
      <SkillExportDialog
        skills={skills}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
