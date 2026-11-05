/**
 * Sahayak MemoryEditor Component
 * Form modal / card to manually create or update a profile memory record.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Tag } from 'lucide-react';
import { MemoryCategory, MemoryRecord, MemorySource } from '../types/memory.types';
import { MemoryRetrievalService } from '../services/memory-retrieval.service';
import { MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH, MAX_TAGS_COUNT } from '../schemas/memory.schema';

interface MemoryEditorProps {
  initialMemory?: MemoryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: {
    id?: string;
    category: MemoryCategory;
    title: string;
    content: string;
    tags: string[];
    source: MemorySource;
  }) => Promise<void>;
}

const CATEGORIES: MemoryCategory[] = [
  'preferences',
  'personal_profile',
  'work_context',
  'language_preferences',
  'interaction_preferences',
  'custom',
];

export const MemoryEditor: React.FC<MemoryEditorProps> = ({
  initialMemory,
  isOpen,
  onClose,
  onSave,
}) => {
  const [category, setCategory] = useState<MemoryCategory>('preferences');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMemory) {
      setCategory(initialMemory.category);
      setTitle(initialMemory.title);
      setContent(initialMemory.content);
      setTags([...initialMemory.tags]);
    } else {
      setCategory('preferences');
      setTitle('');
      setContent('');
      setTags([]);
    }
    setError(null);
  }, [initialMemory, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput
      .trim()
      .toLowerCase()
      .replace(/[^\w-]/g, '');
    if (!trimmed) return;
    if (tags.length >= MAX_TAGS_COUNT) {
      setError(`Maximum of ${MAX_TAGS_COUNT} tags allowed`);
      return;
    }
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      setError(null);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      setError('Title is required.');
      return;
    }
    if (!cleanContent) {
      setError('Content is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialMemory?.id,
        category,
        title: cleanTitle,
        content: cleanContent,
        tags,
        source: initialMemory?.source || 'manual_entry',
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save memory';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3
            id="memory-editor-title"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {initialMemory ? 'Edit Profile Memory' : 'Add Profile Memory'}
          </h3>
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

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
          {/* Category Select */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {MemoryRetrievalService.CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Title
              </label>
              <span className="text-[10px] text-slate-400">
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>
            <input
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Response Style: Concise with bullets"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Content
              </label>
              <span className="text-[10px] text-slate-400">
                {content.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
            <textarea
              rows={3}
              value={content}
              maxLength={MAX_CONTENT_LENGTH}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Prefer short, direct answers formatted as clear bullet points."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Tags
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag (e.g., bullets)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Add
              </button>
            </div>

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {isSubmitting ? 'Saving...' : initialMemory ? 'Update Memory' : 'Save Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
