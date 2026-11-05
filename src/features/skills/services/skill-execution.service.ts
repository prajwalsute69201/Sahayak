/**
 * Sahayak Skill Execution Service
 * Resolves context, renders templates, personalizes via profile memory, and routes
 * one-click skills to the appropriate existing services (summarize, youtube, chat, find, rewrite, agent).
 */

import {
  Skill,
  SkillExecutionRecord,
  SkillExecutionRoute,
  SkillExecutionStatus,
  SkillPageContextInfo,
} from '../types/skill.types';
import { checkSkillCompatibility } from '../utils/skill-compatibility';
import { skillTemplateService } from './skill-template.service';
import { skillHistoryService } from './skill-history.service';
import { memoryService } from '@/features/memory/services/memory.service';
import { articleExtractorService } from '@/features/article-summary/services/article-extractor.service';
import { summaryService } from '@/features/article-summary/services/summary.service';
import { parseYouTubeUrl } from '@/features/youtube-summary/services/youtube-detector.service';
import { resolveYouTubeMetadata } from '@/features/youtube-summary/services/youtube-metadata.service';
import { retrieveYouTubeTranscript } from '@/features/youtube-summary/services/transcript.service';
import { generateYouTubeSummary } from '@/features/youtube-summary/services/youtube-summary.service';
import { pageContextService } from '@/features/page-chat/services/page-context.service';
import { chatService } from '@/features/page-chat/services/chat.service';
import { elementSearchService } from '@/features/find-element/services/element-search.service';
import { agentOrchestratorService } from '@/features/agent/services/agent-orchestrator.service';
import { scannerClientService } from '@/features/element-scanner/services/scanner-client.service';
import { aiProviderManager } from '@/services/ai';
import { AgentAction } from '@/features/agent/types/agent.types';
import { safetyPolicyService } from '@/features/safety/services/safety-policy.service';

export interface SkillExecutionOutput {
  executionId: string;
  skillId: string;
  skillName: string;
  route: SkillExecutionRoute;
  status: SkillExecutionStatus;
  renderedInstruction: string;
  durationMs: number;
  resultData?: unknown;
  textOutput?: string;
  agentAction?: AgentAction;
  error?: string;
}

export class SkillExecutionService {
  /**
   * Executes a skill against the active page context with human-in-the-loop safety.
   */
  public async executeSkill(
    skill: Skill,
    inputValues: Record<string, string | number | boolean | unknown> = {},
    context: SkillPageContextInfo | null = null
  ): Promise<SkillExecutionOutput> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Render template variables safely
    const renderResult = skillTemplateService.renderTemplate(
      skill.instructionTemplate,
      skill.parameters,
      inputValues as Record<string, string | number | boolean>
    );

    if (renderResult.errors.length > 0) {
      const errorMsg = renderResult.errors.join(' ');
      await this.recordHistory({
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        route: skill.executionRoute,
        pageUrl: context?.url || '',
        pageTitle: context?.title || '',
        status: 'failed',
        renderedInstruction: renderResult.rendered || skill.instructionTemplate,
        inputs: inputValues as Record<string, string | number | boolean>,
        error: errorMsg,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      });

      return {
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        route: skill.executionRoute,
        status: 'failed',
        renderedInstruction: renderResult.rendered,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      };
    }

    const renderedInstruction = renderResult.rendered;

    // 2. Compatibility verification
    const compatibility = checkSkillCompatibility(skill, context);
    if (!compatibility.isCompatible) {
      const reason = compatibility.reason || 'Skill is incompatible with the current page.';
      await this.recordHistory({
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        route: skill.executionRoute,
        pageUrl: context?.url || '',
        pageTitle: context?.title || '',
        status: 'unsupported_context',
        renderedInstruction,
        inputs: inputValues as Record<string, string | number | boolean>,
        error: reason,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      });

      return {
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        route: skill.executionRoute,
        status: 'unsupported_context',
        renderedInstruction,
        durationMs: Date.now() - startTime,
        error: reason,
      };
    }

    // 3. Record Initial History Entry
    await this.recordHistory({
      executionId,
      skillId: skill.id,
      skillName: skill.name,
      category: skill.category,
      route: skill.executionRoute,
      pageUrl: context?.url || '',
      pageTitle: context?.title || '',
      status: 'started',
      renderedInstruction,
      inputs: inputValues as Record<string, string | number | boolean>,
      startedAt: new Date(startTime).toISOString(),
    });

    try {
      // 4. Retrieve Profile Memory Personalization (Slice 14)
      const userMemoryContext = await memoryService.getRelevantContext(
        renderedInstruction,
        skill.executionRoute === 'agent_action' ? 'agent' : 'chat'
      );

      let textOutput = '';
      let resultData: unknown = undefined;
      let agentAction: AgentAction | undefined = undefined;

      // 5. Route to appropriate existing feature service
      switch (skill.executionRoute) {
        case 'summarize': {
          const article = await articleExtractorService.extractFromActiveTab();
          const summary = await summaryService.generateSummary(article);
          resultData = summary;
          textOutput = `${summary.overview}\n\nKey Takeaways:\n${summary.keyPoints.map((p) => `- ${p}`).join('\n')}`;
          break;
        }

        case 'youtube': {
          if (!context || !context.isYouTube) {
            throw new Error('Current page is not a supported YouTube video URL.');
          }
          const parsed = parseYouTubeUrl(context.url);
          if (!parsed.isValid || !parsed.videoId) {
            throw new Error('Could not identify a valid YouTube video on this page.');
          }
          const meta = await resolveYouTubeMetadata(context.url);
          if (!meta) {
            throw new Error('Could not retrieve YouTube video metadata.');
          }
          const transcriptData = await retrieveYouTubeTranscript(context.url);
          if (!transcriptData.success || !transcriptData.segments) {
            throw new Error(
              transcriptData.errorMessage || 'No transcript available for this video.'
            );
          }
          const ytSummary = await generateYouTubeSummary(meta, transcriptData.segments);
          resultData = ytSummary;
          textOutput = `${ytSummary.overview}\n\nTop Moments:\n${ytSummary.importantMoments.map((m) => `[${m.timestamp}] ${m.title}`).join('\n')}`;
          break;
        }

        case 'chat': {
          const pageContext = await pageContextService.extractContextFromActiveTab();
          const chatResult = await chatService.sendQuestion({
            question: renderedInstruction,
            pageContext,
            language: 'en',
          });
          textOutput = chatResult.message.content;
          resultData = chatResult;
          break;
        }

        case 'find_element': {
          const scanRes = await scannerClientService.scanActiveTab(true);
          const searchResult = await elementSearchService.search(
            renderedInstruction,
            scanRes.elements
          );
          resultData = searchResult;
          if (searchResult.bestMatch) {
            await scannerClientService.highlightElement(searchResult.bestMatch.element.actionId);
            const conf =
              searchResult.bestMatch.confidence ??
              (searchResult.bestMatch as { score?: number }).score ??
              1;
            const elementLabel =
              (searchResult.bestMatch.element as { label?: string; text?: string; tagName: string })
                .label ||
              (searchResult.bestMatch.element as { label?: string; text?: string; tagName: string })
                .text ||
              searchResult.bestMatch.element.tagName;
            textOutput = `Found element "${elementLabel}" (${Math.round(conf * 100)}% match). Badge #${searchResult.bestMatch.element.actionId} highlighted on page.`;
          } else {
            textOutput = 'No matching interactive element found on this page.';
          }
          break;
        }

        case 'rewrite': {
          const textToRewrite = context?.selectedText || String(inputValues.text || '');
          if (!textToRewrite.trim()) {
            throw new Error('No text selected or provided to rewrite.');
          }

          const prompt = `Rewrite and improve the following text according to instructions:
Instruction: ${renderedInstruction}

<INPUT_TEXT>
${textToRewrite}
</INPUT_TEXT>
${userMemoryContext ? `\n${userMemoryContext}\n` : ''}`;

          const res = await aiProviderManager.generateText(prompt, {
            temperature: 0.3,
          });
          textOutput = res.text;
          resultData = { rewritten: res.text, original: textToRewrite };
          break;
        }

        case 'agent_action': {
          // Strictly single-step agent planning with HITL approval
          const scanRes = await scannerClientService.scanActiveTab(true);
          const planned = await agentOrchestratorService.planAction({
            instruction: renderedInstruction,
            candidates: scanRes.elements,
            pageTitle: context?.title || '',
            pageUrl: context?.url || '',
          });

          const targetCandidate = scanRes.elements.find(
            (e) => 'targetActionId' in planned && e.actionId === planned.targetActionId
          );
          const policyCheck = safetyPolicyService.evaluateAction(planned, targetCandidate, {
            url: context?.url,
            title: context?.title,
          });

          agentAction = planned;
          if (policyCheck.isBlocked) {
            textOutput = `Proposed Action: ${planned.title} (${planned.type}). BLOCKED by Safety Policy: ${policyCheck.reason}`;
          } else {
            textOutput = `Proposed Action: ${planned.title} (${planned.type}). Human approval required before execution.`;
          }
          resultData = { action: planned, policyDecision: policyCheck };
          break;
        }

        default:
          throw new Error(`Unsupported execution route "${skill.executionRoute}".`);
      }

      const durationMs = Date.now() - startTime;

      // Update history record as completed
      await skillHistoryService.updateRecord(executionId, {
        status: 'completed',
        outputSummary: textOutput.slice(0, 300),
        completedAt: new Date().toISOString(),
        durationMs,
      });

      return {
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        route: skill.executionRoute,
        status: 'completed',
        renderedInstruction,
        durationMs,
        resultData,
        textOutput,
        agentAction,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Execution failed';
      const durationMs = Date.now() - startTime;

      await skillHistoryService.updateRecord(executionId, {
        status: 'failed',
        error: errorMsg,
        completedAt: new Date().toISOString(),
        durationMs,
      });

      return {
        executionId,
        skillId: skill.id,
        skillName: skill.name,
        route: skill.executionRoute,
        status: 'failed',
        renderedInstruction,
        durationMs,
        error: errorMsg,
      };
    }
  }

  private async recordHistory(record: SkillExecutionRecord): Promise<void> {
    try {
      await skillHistoryService.addRecord(record);
    } catch (e) {
      console.warn('[Sahayak Skill Execution] Failed to record history:', e);
    }
  }
}

export const skillExecutionService = new SkillExecutionService();
