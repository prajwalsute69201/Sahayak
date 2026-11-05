/**
 * Sahayak Skill Import Service
 * Secure parsing, validation, duplicate resolution, and importation of portable JSON skill packages.
 * Strictly guarantees that imported data cannot overwrite built-in skills or execute arbitrary code.
 */

import { Skill } from '../types/skill.types';
import { BUILTIN_SKILLS } from '../data/builtin-skills';
import {
  MAX_CUSTOM_SKILLS_COUNT,
  MAX_IMPORT_FILE_SIZE_BYTES,
  skillExportPackageSchema,
  skillSchema,
} from '../schemas/skill.schema';
import { skillStorageService } from './skill-storage.service';

export interface ImportPreviewItem {
  skill: Skill;
  hasIdCollision: boolean;
  hasNameCollision: boolean;
  isBuiltinId: boolean;
  selected: boolean;
}

export interface ImportPreviewResult {
  isValid: boolean;
  format: string;
  version: number;
  exportedAt?: string;
  items: ImportPreviewItem[];
  errors: string[];
}

export interface ImportExecutionResult {
  importedCount: number;
  skippedCount: number;
  errors: string[];
  importedSkills: Skill[];
}

export class SkillImportService {
  /**
   * Parses and validates raw JSON input, generating an interactive preview of skills to import.
   */
  public async previewImport(rawJson: string): Promise<ImportPreviewResult> {
    const errors: string[] = [];

    // 1. File size check
    const byteSize = new Blob([rawJson]).size;
    if (byteSize > MAX_IMPORT_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        format: 'unknown',
        version: 0,
        items: [],
        errors: [
          `File size (${(byteSize / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed (2 MB).`,
        ],
      };
    }

    // 2. Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return {
        isValid: false,
        format: 'unknown',
        version: 0,
        items: [],
        errors: ['Invalid JSON syntax. Please verify the file contents.'],
      };
    }

    // 3. Format & Schema Validation
    const pkgResult = skillExportPackageSchema.safeParse(parsed);
    if (!pkgResult.success) {
      const issue = pkgResult.error.issues[0]?.message || 'Schema validation failed';
      return {
        isValid: false,
        format: (parsed as { format?: string })?.format || 'unknown',
        version: (parsed as { version?: number })?.version || 0,
        items: [],
        errors: [`Package validation error: ${issue}`],
      };
    }

    const { format, version, exportedAt, skills } = pkgResult.data;
    const existingSkills = await skillStorageService.getSkills();
    const existingIds = new Set(existingSkills.map((s) => s.id));
    const existingNames = new Set(existingSkills.map((s) => s.name.toLowerCase().trim()));
    const builtinIds = new Set(BUILTIN_SKILLS.map((b) => b.id));

    const previewItems: ImportPreviewItem[] = [];

    for (const rawSkill of skills) {
      // Validate individual skill
      const skillCheck = skillSchema.safeParse(rawSkill);
      if (!skillCheck.success) {
        errors.push(
          `Skill "${rawSkill.name || 'unnamed'}" failed validation: ${skillCheck.error.issues[0]?.message}`
        );
        continue;
      }

      const validSkill = skillCheck.data;
      const isBuiltinId = builtinIds.has(validSkill.id);
      const hasIdCollision = existingIds.has(validSkill.id);
      const hasNameCollision = existingNames.has(validSkill.name.toLowerCase().trim());

      previewItems.push({
        skill: validSkill,
        hasIdCollision,
        hasNameCollision,
        isBuiltinId,
        selected: true,
      });
    }

    return {
      isValid: errors.length === 0 || previewItems.length > 0,
      format,
      version,
      exportedAt,
      items: previewItems,
      errors,
    };
  }

  /**
   * Imports selected skills into local storage with collision resolution.
   * Never overwrites built-in skills.
   */
  public async executeImport(
    itemsToImport: Skill[],
    options: { resolveCollisions?: 'rename' | 'overwrite' } = { resolveCollisions: 'rename' }
  ): Promise<ImportExecutionResult> {
    const existingCustomSkills = await skillStorageService.getCustomSkills();
    const builtinIds = new Set(BUILTIN_SKILLS.map((b) => b.id));

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const importedSkills: Skill[] = [];

    for (const skill of itemsToImport) {
      if (existingCustomSkills.length >= MAX_CUSTOM_SKILLS_COUNT) {
        errors.push(`Reached maximum limit of ${MAX_CUSTOM_SKILLS_COUNT} custom skills.`);
        break;
      }

      // Security & Isolation: All imported skills are strictly user_created
      const baseSkill: Skill = {
        ...skill,
        source: 'user_created',
        updatedAt: new Date().toISOString(),
      };

      // Conflict handling: Built-in IDs must ALWAYS get a new custom ID
      if (builtinIds.has(baseSkill.id)) {
        baseSkill.id = this.generateCustomId();
        baseSkill.name = `${baseSkill.name} (Imported)`;
      } else {
        const existingIndex = existingCustomSkills.findIndex((s) => s.id === baseSkill.id);

        if (existingIndex >= 0) {
          if (options.resolveCollisions === 'overwrite') {
            existingCustomSkills[existingIndex] = baseSkill;
            importedCount++;
            importedSkills.push(baseSkill);
            continue;
          } else {
            // Rename/assign new ID
            baseSkill.id = this.generateCustomId();
            baseSkill.name = `${baseSkill.name} (Copy)`;
          }
        }
      }

      const validated = skillSchema.safeParse(baseSkill);
      if (validated.success) {
        existingCustomSkills.unshift(validated.data);
        importedCount++;
        importedSkills.push(validated.data);
      } else {
        errors.push(`Skill "${skill.name}" skipped: validation failed.`);
        skippedCount++;
      }
    }

    await skillStorageService.persistCustomSkills(existingCustomSkills);

    return {
      importedCount,
      skippedCount,
      errors,
      importedSkills,
    };
  }

  private generateCustomId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? `custom_${crypto.randomUUID()}`
      : `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }
}

export const skillImportService = new SkillImportService();
