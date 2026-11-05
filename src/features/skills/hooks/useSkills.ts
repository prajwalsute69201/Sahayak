/**
 * Sahayak useSkills Hook
 * Manages skills list, filtering, CRUD operations, toggling favorites, and state updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { Skill, SkillFilter } from '../types/skill.types';
import { skillService } from '../services/skill.service';

export function useSkills(initialFilter?: SkillFilter) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filter, setFilterState] = useState<SkillFilter>(initialFilter || {});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await skillService.getSkills(filter);
      setSkills(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load skills';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const setFilter = useCallback((newFilter: Partial<SkillFilter>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const createSkill = useCallback(
    async (
      skillData: Omit<Skill, 'id' | 'source' | 'version' | 'createdAt' | 'updatedAt'> & {
        id?: string;
      }
    ) => {
      try {
        setError(null);
        const created = await skillService.createSkill(skillData);
        await loadSkills();
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create skill';
        setError(msg);
        throw err;
      }
    },
    [loadSkills]
  );

  const updateSkill = useCallback(
    async (id: string, updates: Partial<Omit<Skill, 'id' | 'source' | 'createdAt'>>) => {
      try {
        setError(null);
        const updated = await skillService.updateSkill(id, updates);
        await loadSkills();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update skill';
        setError(msg);
        throw err;
      }
    },
    [loadSkills]
  );

  const duplicateSkill = useCallback(
    async (id: string, newName?: string) => {
      try {
        setError(null);
        const copy = await skillService.duplicateSkill(id, newName);
        await loadSkills();
        return copy;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to duplicate skill';
        setError(msg);
        throw err;
      }
    },
    [loadSkills]
  );

  const deleteSkill = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const res = await skillService.deleteSkill(id);
        await loadSkills();
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete skill';
        setError(msg);
        throw err;
      }
    },
    [loadSkills]
  );

  const toggleEnabled = useCallback(
    async (id: string, isEnabled: boolean) => {
      try {
        setError(null);
        const updated = await skillService.toggleSkillEnabled(id, isEnabled);
        await loadSkills();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to toggle skill enabled status';
        setError(msg);
        throw err;
      }
    },
    [loadSkills]
  );

  const toggleFavorite = useCallback(
    async (id: string, isFavorite: boolean) => {
      try {
        setError(null);
        const updated = await skillService.toggleSkillFavorite(id, isFavorite);
        await loadSkills();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to toggle favorite status';
        setError(msg);
        throw err;
      }
    },
    [loadSkills]
  );

  return {
    skills,
    filter,
    isLoading,
    error,
    loadSkills,
    setFilter,
    createSkill,
    updateSkill,
    duplicateSkill,
    deleteSkill,
    toggleEnabled,
    toggleFavorite,
  };
}
