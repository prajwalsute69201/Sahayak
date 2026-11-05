/**
 * Sahayak Skill Storage Service
 * On-device persistence for user-created custom skills and built-in skill user preferences.
 * Strictly guarantees immutability of original built-in skill definitions.
 */

import { Skill, SkillFilter } from '../types/skill.types';
import { BUILTIN_SKILLS } from '../data/builtin-skills';
import {
  CURRENT_SKILL_SCHEMA_VERSION,
  MAX_CUSTOM_SKILLS_COUNT,
  skillSchema,
} from '../schemas/skill.schema';

export const USER_SKILLS_STORAGE_KEY = 'sahayak_user_skills_v1';
export const BUILTIN_PREFS_STORAGE_KEY = 'sahayak_builtin_skill_prefs_v1';

interface BuiltinSkillPrefs {
  isEnabled?: boolean;
  isFavorite?: boolean;
}

export class SkillStorageService {
  private inMemoryCustomSkills: Skill[] = [];
  private inMemoryBuiltinPrefs: Record<string, BuiltinSkillPrefs> = {};

  private get isStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local &&
      typeof chrome.storage.local.get === 'function'
    );
  }

  /**
   * Retrieves all skills (built-in + user-created), applying preference overrides and optional filtering.
   */
  public async getSkills(filter?: SkillFilter): Promise<Skill[]> {
    const builtinPrefs = await this.getBuiltinPrefs();
    const customSkills = await this.getCustomSkills();

    // Map built-in skills with user overrides (enabled, favorite)
    const builtins: Skill[] = BUILTIN_SKILLS.map((skill) => {
      const prefs = builtinPrefs[skill.id];
      if (!prefs) return { ...skill };

      return {
        ...skill,
        isEnabled: prefs.isEnabled !== undefined ? prefs.isEnabled : skill.isEnabled,
        isFavorite: prefs.isFavorite !== undefined ? prefs.isFavorite : skill.isFavorite,
      };
    });

    const allSkills = [...builtins, ...customSkills];

    if (!filter) return allSkills;

    return allSkills.filter((s) => {
      // Category filter
      if (filter.category && filter.category !== 'all' && s.category !== filter.category) {
        return false;
      }

      // Source filter
      if (filter.source && filter.source !== 'all' && s.source !== filter.source) {
        return false;
      }

      // Favorite filter
      if (filter.onlyFavorites && !s.isFavorite) {
        return false;
      }

      // Search query (name, description, category)
      if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
        const q = filter.searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchDesc = s.description.toLowerCase().includes(q);
        const matchCategory = s.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Retrieves a single skill by its ID
   */
  public async getSkillById(id: string): Promise<Skill | null> {
    const all = await this.getSkills();
    return all.find((s) => s.id === id) || null;
  }

  /**
   * Saves or creates a new user-created skill
   */
  public async createSkill(
    skillData: Omit<
      Skill,
      'id' | 'source' | 'version' | 'createdAt' | 'updatedAt' | 'isEnabled' | 'isFavorite'
    > & {
      id?: string;
      isEnabled?: boolean;
      isFavorite?: boolean;
    }
  ): Promise<Skill> {
    const customSkills = await this.getCustomSkills();

    if (customSkills.length >= MAX_CUSTOM_SKILLS_COUNT) {
      throw new Error(
        `Custom skill limit reached (${MAX_CUSTOM_SKILLS_COUNT}). Please delete unused skills first.`
      );
    }

    const now = new Date().toISOString();
    const id =
      skillData.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? `custom_${crypto.randomUUID()}`
        : `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    const newSkill: Skill = {
      ...skillData,
      id,
      source: 'user_created',
      version: CURRENT_SKILL_SCHEMA_VERSION,
      isEnabled: skillData.isEnabled !== undefined ? skillData.isEnabled : true,
      isFavorite: skillData.isFavorite !== undefined ? skillData.isFavorite : false,
      createdAt: now,
      updatedAt: now,
    };

    const validated = skillSchema.parse(newSkill);

    // Prevent ID collisions with built-in skills
    if (BUILTIN_SKILLS.some((b) => b.id === validated.id)) {
      throw new Error('Cannot create skill with a built-in skill ID.');
    }

    const existingIdx = customSkills.findIndex((s) => s.id === validated.id);
    if (existingIdx >= 0) {
      customSkills[existingIdx] = validated;
    } else {
      customSkills.unshift(validated);
    }

    await this.persistCustomSkills(customSkills);
    return validated;
  }

  /**
   * Updates an existing user-created skill.
   * Throws if an attempt is made to overwrite a built-in skill.
   */
  public async updateSkill(
    id: string,
    updates: Partial<Omit<Skill, 'id' | 'source' | 'createdAt'>>
  ): Promise<Skill> {
    const isBuiltin = BUILTIN_SKILLS.some((b) => b.id === id);
    if (isBuiltin) {
      throw new Error(
        'Cannot directly edit a built-in skill. Duplicate the skill to create a customizable copy.'
      );
    }

    const customSkills = await this.getCustomSkills();
    const index = customSkills.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new Error(`Custom skill with ID "${id}" was not found.`);
    }

    const existing = customSkills[index];
    const updatedSkill: Skill = {
      ...existing,
      ...updates,
      id: existing.id,
      source: 'user_created',
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const validated = skillSchema.parse(updatedSkill);
    customSkills[index] = validated;
    await this.persistCustomSkills(customSkills);
    return validated;
  }

  /**
   * Duplicates a built-in or custom skill into a new editable user-created skill
   */
  public async duplicateSkill(id: string, newName?: string): Promise<Skill> {
    const target = await this.getSkillById(id);
    if (!target) {
      throw new Error(`Skill with ID "${id}" was not found to duplicate.`);
    }

    const name = newName || `Copy of ${target.name}`;

    return await this.createSkill({
      name,
      description: target.description,
      category: target.category,
      icon: target.icon,
      instructionTemplate: target.instructionTemplate,
      parameters: JSON.parse(JSON.stringify(target.parameters)),
      supportedPageTypes: [...target.supportedPageTypes],
      executionRoute: target.executionRoute,
      isEnabled: true,
      isFavorite: false,
    });
  }

  /**
   * Deletes a user-created skill.
   * Built-in skills cannot be deleted.
   */
  public async deleteSkill(id: string): Promise<boolean> {
    const isBuiltin = BUILTIN_SKILLS.some((b) => b.id === id);
    if (isBuiltin) {
      throw new Error('Cannot delete built-in skills.');
    }

    const customSkills = await this.getCustomSkills();
    const initialLength = customSkills.length;
    const filtered = customSkills.filter((s) => s.id !== id);

    if (filtered.length === initialLength) {
      return false;
    }

    await this.persistCustomSkills(filtered);
    return true;
  }

  /**
   * Toggles the enabled state of a skill (persisting custom skill or built-in prefs)
   */
  public async toggleSkillEnabled(id: string, isEnabled: boolean): Promise<Skill | null> {
    const isBuiltin = BUILTIN_SKILLS.some((b) => b.id === id);

    if (isBuiltin) {
      await this.updateBuiltinPref(id, { isEnabled });
      return await this.getSkillById(id);
    }

    return await this.updateSkill(id, { isEnabled });
  }

  /**
   * Toggles the favorite status of a skill
   */
  public async toggleSkillFavorite(id: string, isFavorite: boolean): Promise<Skill | null> {
    const isBuiltin = BUILTIN_SKILLS.some((b) => b.id === id);

    if (isBuiltin) {
      await this.updateBuiltinPref(id, { isFavorite });
      return await this.getSkillById(id);
    }

    return await this.updateSkill(id, { isFavorite });
  }

  /**
   * Internal getter for custom user-created skills
   */
  public async getCustomSkills(): Promise<Skill[]> {
    if (!this.isStorageAvailable) {
      return [...this.inMemoryCustomSkills];
    }

    try {
      const res = await chrome.storage.local.get(USER_SKILLS_STORAGE_KEY);
      const raw = res ? (res as Record<string, unknown>)[USER_SKILLS_STORAGE_KEY] : undefined;

      if (!Array.isArray(raw)) return [];

      return raw
        .filter((item) => skillSchema.safeParse(item).success)
        .map((item) => skillSchema.parse(item));
    } catch {
      return [...this.inMemoryCustomSkills];
    }
  }

  /**
   * Internal getter for built-in preferences
   */
  private async getBuiltinPrefs(): Promise<Record<string, BuiltinSkillPrefs>> {
    if (!this.isStorageAvailable) {
      return { ...this.inMemoryBuiltinPrefs };
    }

    try {
      const res = await chrome.storage.local.get(BUILTIN_PREFS_STORAGE_KEY);
      const raw = res ? (res as Record<string, unknown>)[BUILTIN_PREFS_STORAGE_KEY] : undefined;
      return typeof raw === 'object' && raw !== null
        ? (raw as Record<string, BuiltinSkillPrefs>)
        : {};
    } catch {
      return { ...this.inMemoryBuiltinPrefs };
    }
  }

  private async updateBuiltinPref(id: string, pref: Partial<BuiltinSkillPrefs>): Promise<void> {
    const current = await this.getBuiltinPrefs();
    current[id] = { ...current[id], ...pref };

    if (this.isStorageAvailable) {
      await chrome.storage.local.set({ [BUILTIN_PREFS_STORAGE_KEY]: current });
    } else {
      this.inMemoryBuiltinPrefs = current;
    }
  }

  public async persistCustomSkills(skills: Skill[]): Promise<void> {
    if (this.isStorageAvailable) {
      await chrome.storage.local.set({ [USER_SKILLS_STORAGE_KEY]: skills });
    } else {
      this.inMemoryCustomSkills = [...skills];
    }
  }

  /**
   * Resets custom skills and built-in preferences (useful for tests or hard resets)
   */
  public async resetAllSkills(): Promise<void> {
    if (this.isStorageAvailable) {
      await chrome.storage.local.remove([USER_SKILLS_STORAGE_KEY, BUILTIN_PREFS_STORAGE_KEY]);
    }
    this.inMemoryCustomSkills = [];
    this.inMemoryBuiltinPrefs = {};
  }
}

export const skillStorageService = new SkillStorageService();
