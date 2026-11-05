/**
 * Sahayak Unified Skill Service
 * High-level orchestration facade combining storage, templates, execution, history, and portable JSON transfers.
 */

import {
  Skill,
  SkillExecutionRecord,
  SkillFilter,
  SkillPageContextInfo,
  SkillParameter,
} from '../types/skill.types';
import { skillStorageService } from './skill-storage.service';
import {
  skillTemplateService,
  TemplateValidationResult,
  RenderResult,
} from './skill-template.service';
import { skillExecutionService, SkillExecutionOutput } from './skill-execution.service';
import { skillHistoryService } from './skill-history.service';
import { skillExportService } from './skill-export.service';
import {
  skillImportService,
  ImportPreviewResult,
  ImportExecutionResult,
} from './skill-import.service';

export class SkillService {
  /**
   * Retrieves all skills (built-ins + custom), optionally filtered
   */
  public async getSkills(filter?: SkillFilter): Promise<Skill[]> {
    return await skillStorageService.getSkills(filter);
  }

  /**
   * Retrieves a single skill by ID
   */
  public async getSkillById(id: string): Promise<Skill | null> {
    return await skillStorageService.getSkillById(id);
  }

  /**
   * Creates a new user-authored custom skill
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
    return await skillStorageService.createSkill(skillData);
  }

  /**
   * Updates an existing user-created skill
   */
  public async updateSkill(
    id: string,
    updates: Partial<Omit<Skill, 'id' | 'source' | 'createdAt'>>
  ): Promise<Skill> {
    return await skillStorageService.updateSkill(id, updates);
  }

  /**
   * Duplicates a built-in or custom skill into a new editable copy
   */
  public async duplicateSkill(id: string, newName?: string): Promise<Skill> {
    return await skillStorageService.duplicateSkill(id, newName);
  }

  /**
   * Deletes a user-created skill
   */
  public async deleteSkill(id: string): Promise<boolean> {
    return await skillStorageService.deleteSkill(id);
  }

  /**
   * Toggles enabled state of a skill
   */
  public async toggleSkillEnabled(id: string, isEnabled: boolean): Promise<Skill | null> {
    return await skillStorageService.toggleSkillEnabled(id, isEnabled);
  }

  /**
   * Toggles favorite/pinned status
   */
  public async toggleSkillFavorite(id: string, isFavorite: boolean): Promise<Skill | null> {
    return await skillStorageService.toggleSkillFavorite(id, isFavorite);
  }

  /**
   * Validates instruction template and parameter bindings
   */
  public validateTemplate(template: string, parameters = []): TemplateValidationResult {
    return skillTemplateService.validateTemplate(template, parameters);
  }

  /**
   * Renders instruction template with parameter inputs
   */
  public renderTemplate(
    template: string,
    parameters: SkillParameter[],
    values: Record<string, string | number | boolean | unknown>
  ): RenderResult {
    return skillTemplateService.renderTemplate(template, parameters, values);
  }

  /**
   * Executes a skill against the active page context
   */
  public async executeSkill(
    skill: Skill,
    inputValues: Record<string, string | number | boolean | unknown> = {},
    context: SkillPageContextInfo | null = null
  ): Promise<SkillExecutionOutput> {
    return await skillExecutionService.executeSkill(skill, inputValues, context);
  }

  /**
   * Retrieves execution history
   */
  public async getHistory(skillId?: string): Promise<SkillExecutionRecord[]> {
    return await skillHistoryService.getHistory(skillId);
  }

  /**
   * Clears execution history
   */
  public async clearHistory(): Promise<void> {
    await skillHistoryService.clearHistory();
  }

  /**
   * Exports skills to formatted JSON string
   */
  public exportSkillsJson(skills: Skill[]): string {
    return skillExportService.exportToJsonString(skills);
  }

  /**
   * Downloads skills as JSON file
   */
  public downloadSkillsExport(skills: Skill[], filenamePrefix?: string): void {
    skillExportService.downloadExportFile(skills, filenamePrefix);
  }

  /**
   * Validates and previews imported JSON string
   */
  public async previewImportJson(rawJson: string): Promise<ImportPreviewResult> {
    return await skillImportService.previewImport(rawJson);
  }

  /**
   * Imports selected skills into storage
   */
  public async importSkills(
    skillsToImport: Skill[],
    options?: { resolveCollisions?: 'rename' | 'overwrite' }
  ): Promise<ImportExecutionResult> {
    return await skillImportService.executeImport(skillsToImport, options);
  }
}

export const skillService = new SkillService();
