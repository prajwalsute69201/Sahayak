/**
 * Sahayak useSkillExecution Hook
 * Manages executing a skill, tracking live execution status, and storing output results.
 */

import { useState, useCallback } from 'react';
import { Skill, SkillPageContextInfo } from '../types/skill.types';
import { skillService } from '../services/skill.service';
import { SkillExecutionOutput } from '../services/skill-execution.service';

export function useSkillExecution() {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [currentOutput, setCurrentOutput] = useState<SkillExecutionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      skill: Skill,
      inputValues: Record<string, string | number | boolean | unknown> = {},
      context: SkillPageContextInfo | null = null
    ) => {
      try {
        setIsExecuting(true);
        setError(null);
        const result = await skillService.executeSkill(skill, inputValues, context);
        setCurrentOutput(result);

        if (result.status === 'failed') {
          setError(result.error || 'Execution failed');
        } else if (result.status === 'unsupported_context') {
          setError(result.error || 'Page is unsupported for this skill');
        }

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Execution failed';
        setError(msg);
        throw err;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  const clearOutput = useCallback(() => {
    setCurrentOutput(null);
    setError(null);
  }, []);

  return {
    isExecuting,
    currentOutput,
    error,
    execute,
    clearOutput,
  };
}
