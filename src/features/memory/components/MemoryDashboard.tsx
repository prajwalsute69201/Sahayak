/**
 * Sahayak MemoryDashboard Component
 * Dedicated user-controlled interface for reviewing, searching, managing, and editing local profile memories.
 */

import React, { useState } from 'react';
import { Brain, Plus, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { MemoryCategory, MemoryRecord, MemorySource } from '../types/memory.types';
import { useMemory } from '../hooks/useMemory';
import { useMemorySettings } from '../hooks/useMemorySettings';
import { MemoryCard } from './MemoryCard';
import { MemoryEditor } from './MemoryEditor';
import { MemorySettingsView } from './MemorySettingsView';
import { cn } from '@/utils/cn';

const CATEGORIES: { id: MemoryCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'personal_profile', label: 'Profile' },
  { id: 'work_context', label: 'Work Context' },
  { id: 'language_preferences', label: 'Language' },
  { id: 'interaction_preferences', label: 'Interaction' },
  { id: 'custom', label: 'Custom' },
];

export const MemoryDashboard: React.FC = () => {
  const {
    memories,
    stats,
    isLoading,
    error,
    createMemory,
    updateMemory,
    deleteMemory,
    clearAll,
    exportData,
    importData,
  } = useMemory();

  const { settings, updateSettings } = useMemorySettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Filter memories locally for instant UI feedback
  const filteredMemories = memories.filter((mem) => {
    if (selectedCategory !== 'all' && mem.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = mem.title.toLowerCase().includes(q);
      const matchContent = mem.content.toLowerCase().includes(q);
      const matchTag = mem.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTag) return false;
    }
    return true;
  });

  const handleEdit = (mem: MemoryRecord) => {
    setEditingMemory(mem);
    setIsEditorOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingMemory(null);
    setIsEditorOpen(true);
  };

  const handleSaveEditor = async (record: {
    id?: string;
    category: MemoryCategory;
    title: string;
    content: string;
    tags: string[];
    source: MemorySource;
  }) => {
    if (record.id) {
      await updateMemory(record.id, record);
    } else {
      await createMemory({
        ...record,
        isApproved: true,
      });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
      {/* Header Banner */}
      <div className="mb-4 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-indigo-950/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Local Profile Memory
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                User-controlled memory of your preferences and context
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Toggle Memory Settings"
            className="rounded-lg border border-slate-200/80 bg-white/90 p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Privacy badge */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Strictly on-device in Chrome storage • Zero silent tracking</span>
        </div>
      </div>

      {/* Settings View (collapsible) */}
      {showSettings && (
        <div className="mb-4">
          <MemorySettingsView
            settings={settings}
            stats={stats}
            onUpdateSettings={updateSettings}
            onClearAll={clearAll}
            onExport={exportData}
            onImport={importData}
          />
        </div>
      )}

      {/* Search and Add Action Bar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories or tags..."
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Memory
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count =
            cat.id === 'all'
              ? memories.length
              : memories.filter((m) => m.category === cat.id).length;

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

      {/* Memory List or States */}
      {error && (
        <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <span className="text-xs text-slate-400 animate-pulse">Loading memories...</span>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Brain className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery || selectedCategory !== 'all'
              ? 'No matching memories found'
              : 'No profile memories saved yet'}
          </h4>
          <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search terms or selecting another category.'
              : 'Sahayak only remembers what you explicitly ask it to remember (e.g., "Remember that I prefer short explanations") or what you manually add here.'}
          </p>

          {!searchQuery && selectedCategory === 'all' && (
            <button
              onClick={handleOpenAdd}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Memory
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredMemories.map((mem) => (
            <MemoryCard key={mem.id} memory={mem} onEdit={handleEdit} onDelete={deleteMemory} />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <MemoryEditor
        isOpen={isEditorOpen}
        initialMemory={editingMemory}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEditor}
      />
    </div>
  );
};
