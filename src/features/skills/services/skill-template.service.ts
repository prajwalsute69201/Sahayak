/**
 * Sahayak Skill Template Service
 * Safe variable substitution, validation, and sanitization for skill prompt templates.
 * Strictly avoids eval(), Function(), and dynamic code execution.
 */

import { SkillParameter } from '../types/skill.types';

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  templateVariables: string[];
  missingParameters: string[];
  unusedParameters: string[];
}

export interface RenderResult {
  rendered: string;
  errors: string[];
}

export class SkillTemplateService {
  private static readonly VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;

  /**
   * Extracts unique template variable names from an instruction template string
   */
  public extractVariables(template: string): string[] {
    const vars = new Set<string>();
    let match: RegExpExecArray | null;
    const regex = new RegExp(SkillTemplateService.VARIABLE_REGEX);

    while ((match = regex.exec(template)) !== null) {
      if (match[1]) {
        vars.add(match[1].trim());
      }
    }

    return Array.from(vars);
  }

  /**
   * Validates template syntax against defined parameter list
   */
  public validateTemplate(
    template: string,
    parameters: SkillParameter[] = []
  ): TemplateValidationResult {
    const errors: string[] = [];
    const templateVariables = this.extractVariables(template);
    const paramNames = new Set(parameters.map((p) => p.name));

    // Security check: Reject dangerous executable patterns
    if (/<script\b/i.test(template) || /javascript:/i.test(template)) {
      errors.push('Template contains disallowed script or executable content.');
    }

    // Check for variables missing from parameters
    const missingParameters = templateVariables.filter((v) => !paramNames.has(v));
    for (const missing of missingParameters) {
      errors.push(`Template variable "{{${missing}}}" is not defined in parameters.`);
    }

    // Check for parameters defined but not used in template
    const templateVarSet = new Set(templateVariables);
    const unusedParameters = parameters
      .filter((p) => !templateVarSet.has(p.name))
      .map((p) => p.name);

    return {
      isValid: errors.length === 0,
      errors,
      templateVariables,
      missingParameters,
      unusedParameters,
    };
  }

  /**
   * Safely renders instruction template with parameter values.
   * Performs type validation and fallback to default values.
   */
  public renderTemplate(
    template: string,
    parameters: SkillParameter[],
    values: Record<string, string | number | boolean | unknown> = {}
  ): RenderResult {
    const errors: string[] = [];
    const paramMap = new Map(parameters.map((p) => [p.name, p]));

    // Substitute all variables safely
    const rendered = template.replace(
      SkillTemplateService.VARIABLE_REGEX,
      (_fullMatch, varName) => {
        const param = paramMap.get(varName);

        // Value resolution order: values[varName] -> param.defaultValue -> undefined
        let resolvedValue = values[varName];
        if (resolvedValue === undefined || resolvedValue === null || resolvedValue === '') {
          resolvedValue = param?.defaultValue;
        }

        // Check required
        if (param && param.required) {
          if (
            resolvedValue === undefined ||
            resolvedValue === null ||
            String(resolvedValue).trim() === ''
          ) {
            errors.push(`Required parameter "${param.label || varName}" is missing.`);
            return `{{${varName}}}`;
          }
        }

        // Type-safe stringification and sanitization
        if (resolvedValue === undefined || resolvedValue === null) {
          return '';
        }

        return this.sanitizeVariableValue(String(resolvedValue));
      }
    );

    return { rendered: rendered.trim(), errors };
  }

  /**
   * Sanitizes user input to prevent XML/HTML delimiter breakage in downstream prompts
   */
  private sanitizeVariableValue(val: string): string {
    return val
      .replace(/<\/?[a-zA-Z_-]+[^>]*>/g, '') // Strip HTML/XML tags
      .trim();
  }
}

export const skillTemplateService = new SkillTemplateService();
