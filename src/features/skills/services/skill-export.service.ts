/**
 * Sahayak Skill Export Service
 * Generates portable, versioned, privacy-preserving JSON export files of skills.
 * Guarantees zero leakage of credentials, personal memories, or session history.
 */

import { Skill, SkillExportPackage } from '../types/skill.types';
import { CURRENT_SKILL_SCHEMA_VERSION, skillExportPackageSchema } from '../schemas/skill.schema';

export class SkillExportService {
  /**
   * Sanitizes a skill record before export, ensuring zero personal memory or credentials leak.
   */
  public sanitizeSkillForExport(skill: Skill): Skill {
    return {
      id: skill.id,
      name: skill.name.trim(),
      description: skill.description.trim(),
      category: skill.category,
      icon: skill.icon || 'Sparkles',
      instructionTemplate: skill.instructionTemplate.trim(),
      parameters: skill.parameters.map((p) => ({
        name: p.name,
        label: p.label,
        description: p.description,
        type: p.type,
        defaultValue: p.defaultValue,
        options: p.options ? [...p.options] : undefined,
        required: p.required,
        placeholder: p.placeholder,
      })),
      supportedPageTypes: [...skill.supportedPageTypes],
      executionRoute: skill.executionRoute,
      source: skill.source,
      version: skill.version || CURRENT_SKILL_SCHEMA_VERSION,
      isEnabled: skill.isEnabled !== undefined ? skill.isEnabled : true,
      isFavorite: Boolean(skill.isFavorite),
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }

  /**
   * Creates a versioned export package for a list of skills
   */
  public createExportPackage(skills: Skill[]): SkillExportPackage {
    const sanitized = skills.map((s) => this.sanitizeSkillForExport(s));

    const exportPackage: SkillExportPackage = {
      format: 'sahayak-skills',
      version: CURRENT_SKILL_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      skills: sanitized,
    };

    return skillExportPackageSchema.parse(exportPackage);
  }

  /**
   * Serializes export package to formatted JSON string
   */
  public exportToJsonString(skills: Skill[]): string {
    const pkg = this.createExportPackage(skills);
    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Generates a downloadable JSON file for the user
   */
  public downloadExportFile(skills: Skill[], filenamePrefix = 'sahayak-skills'): void {
    if (typeof document === 'undefined') return;

    const json = this.exportToJsonString(skills);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}-${dateStr}.json`;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const skillExportService = new SkillExportService();
