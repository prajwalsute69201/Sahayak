/**
 * Slice 15: One-Click Reusable Skills & JSON Import/Export Test Suite
 * Comprehensive unit and integration tests verifying:
 * - Schema & Data Model Validation
 * - Built-in Skills Library & Immutability
 * - Safe Template Rendering Engine (no eval/code execution)
 * - Page Context Compatibility
 * - Skill Storage & Execution History
 * - Portable JSON Import & Export (zero credential leakage, collision resolution)
 * - One-Click Execution Routing (Article, YouTube, Chat, Find Element, Rewrite, Agent Actions with HITL)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  skillCategorySchema,
  skillExecutionRouteSchema,
  skillParameterSchema,
  skillSchema,
  skillExecutionRecordSchema,
  skillExportPackageSchema,
  MAX_CUSTOM_SKILLS_COUNT,
  MAX_SKILL_NAME_LENGTH,
  MAX_SKILL_DESC_LENGTH,
  MAX_TEMPLATE_LENGTH,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_HISTORY_ENTRIES,
} from '../src/features/skills/schemas/skill.schema';
import { BUILTIN_SKILLS } from '../src/features/skills/data/builtin-skills';
import { skillTemplateService } from '../src/features/skills/services/skill-template.service';
import { skillStorageService } from '../src/features/skills/services/skill-storage.service';
import { skillHistoryService } from '../src/features/skills/services/skill-history.service';
import { skillExportService } from '../src/features/skills/services/skill-export.service';
import { skillImportService } from '../src/features/skills/services/skill-import.service';
import { skillExecutionService } from '../src/features/skills/services/skill-execution.service';
import { skillService } from '../src/features/skills/services/skill.service';
import { checkSkillCompatibility } from '../src/features/skills/utils/skill-compatibility';
import {
  Skill,
  SkillExportPackage,
  SkillExecutionRecord,
  SkillPageContextInfo,
} from '../src/features/skills/types/skill.types';

// Mock external services called during execution
vi.mock('@/features/article-summary/services/article-extractor.service', () => ({
  articleExtractorService: {
    extractFromActiveTab: vi.fn().mockResolvedValue({
      title: 'Test Article',
      url: 'https://example.com/article',
      byline: 'Test Author',
      content: 'This is a test article content for testing summary skills.',
      textContent: 'This is a test article content for testing summary skills.',
      length: 50,
      excerpt: 'Test article excerpt',
      siteName: 'Example News',
    }),
  },
}));

vi.mock('@/features/article-summary/services/summary.service', () => ({
  summaryService: {
    generateSummary: vi.fn().mockResolvedValue({
      overview: 'Test article overview summary.',
      keyPoints: ['First point', 'Second point'],
      quickSummary: 'Brief summary',
      readingTimeMinutes: 2,
    }),
  },
}));

vi.mock('@/features/youtube-summary/services/youtube-detector.service', () => ({
  parseYouTubeUrl: vi.fn().mockImplementation((url: string) => ({
    isValid: url.includes('youtube.com/watch') || url.includes('youtu.be/'),
    videoId: url.includes('dQw4w9WgXcQ') ? 'dQw4w9WgXcQ' : 'test_video_id',
    timestamp: 0,
    isShort: false,
  })),
}));

vi.mock('@/features/youtube-summary/services/youtube-metadata.service', () => ({
  resolveYouTubeMetadata: vi.fn().mockResolvedValue({
    videoId: 'dQw4w9WgXcQ',
    title: 'Test Video',
    channelTitle: 'Test Channel',
    description: 'Test video description',
    publishedAt: '2026-01-01',
    thumbnails: { default: { url: 'https://img.youtube.com/default.jpg' } },
  }),
}));

vi.mock('@/features/youtube-summary/services/transcript.service', () => ({
  retrieveYouTubeTranscript: vi.fn().mockResolvedValue({
    success: true,
    videoId: 'dQw4w9WgXcQ',
    segments: [
      { start: 0, duration: 5, text: 'Hello and welcome to this video.' },
      { start: 5, duration: 10, text: 'Today we discuss Sahayak skills.' },
    ],
  }),
}));

vi.mock('@/features/youtube-summary/services/youtube-summary.service', () => ({
  generateYouTubeSummary: vi.fn().mockResolvedValue({
    videoId: 'dQw4w9WgXcQ',
    title: 'Test Video',
    overview: 'Video discussing Sahayak skills.',
    keyTakeaways: ['Skills automate repeated tasks.'],
    importantMoments: [{ timestamp: '00:00', title: 'Introduction', description: 'Intro' }],
    metadata: { videoId: 'dQw4w9WgXcQ', title: 'Test Video', channelTitle: 'Test Channel' },
  }),
}));

vi.mock('@/features/page-chat/services/page-context.service', () => ({
  pageContextService: {
    extractContextFromActiveTab: vi.fn().mockResolvedValue({
      title: 'Current Active Page',
      url: 'https://example.com/chat-test',
      extractedText: 'Content of the active page for chat verification.',
    }),
  },
}));

vi.mock('@/features/page-chat/services/chat.service', () => ({
  chatService: {
    sendQuestion: vi.fn().mockResolvedValue({
      message: {
        id: 'msg_1',
        role: 'assistant',
        content: 'This is the grounded chat answer for the page.',
        timestamp: Date.now(),
      },
    }),
  },
}));

vi.mock('@/features/element-scanner/services/scanner-client.service', () => ({
  scannerClientService: {
    scanActiveTab: vi.fn().mockResolvedValue({
      success: true,
      elements: [
        {
          actionId: 'sahayak-btn-1',
          tagName: 'button',
          type: 'button',
          text: 'Submit Application',
          role: 'button',
          isVisible: true,
          confidence: 0.95,
          boundingRect: { x: 100, y: 100, width: 80, height: 32 },
        },
      ],
      scanDurationMs: 12,
    }),
    highlightElement: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/features/find-element/services/element-search.service', () => ({
  elementSearchService: {
    search: vi.fn().mockResolvedValue({
      query: 'Submit button',
      candidatesEvaluated: 1,
      bestMatch: {
        element: {
          actionId: 'sahayak-btn-1',
          tagName: 'button',
          type: 'button',
          text: 'Submit Application',
        },
        score: 0.92,
        reasoning: 'Matches button text directly',
      },
      matches: [],
    }),
  },
}));

vi.mock('@/features/agent/services/agent-orchestrator.service', () => ({
  agentOrchestratorService: {
    planAction: vi.fn().mockResolvedValue({
      id: 'action-test-1',
      type: 'click_element',
      targetActionId: 101,
      title: 'Click Submit Application button',
      description: 'Click the Submit Application button',
      reason: 'Executing step required by user skill',
      risk: 'low',
      expectedResult: 'Submit form',
      approvalStatus: 'pending',
      createdAt: Date.now(),
    }),
  },
}));

vi.mock('@/services/ai', () => ({
  aiProviderManager: {
    generateText: vi.fn().mockResolvedValue({
      text: 'Rewritten clean text from prompt.',
    }),
  },
}));

vi.mock('@/features/memory/services/memory.service', () => ({
  memoryService: {
    getRelevantContext: vi
      .fn()
      .mockResolvedValue('[User Preference]: Prefers concise bullet points.'),
    getPromptContext: vi
      .fn()
      .mockResolvedValue('[User Preference]: Prefers concise bullet points.'),
  },
}));

describe('Slice 15: One-Click Reusable Skills & JSON Import/Export', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await chrome.storage.local.remove([
      'sahayak_user_skills_v1',
      'sahayak_builtin_skill_prefs_v1',
      'sahayak_skill_history_v1',
    ]);
  });

  /* -------------------------------------------------------------------------- */
  /* A. Schema & Data Model Validation                                          */
  /* -------------------------------------------------------------------------- */
  describe('A. Schema & Data Model Validation', () => {
    it('validates supported skill categories', () => {
      const validCategories = [
        'summarization',
        'research',
        'productivity',
        'writing',
        'navigation',
        'page_interaction',
        'custom',
      ];
      for (const cat of validCategories) {
        expect(skillCategorySchema.safeParse(cat).success).toBe(true);
      }
      expect(skillCategorySchema.safeParse('unsupported_cat').success).toBe(false);
    });

    it('validates supported execution routes', () => {
      const validRoutes = [
        'summarize',
        'youtube',
        'chat',
        'rewrite',
        'find_element',
        'agent_action',
      ];
      for (const route of validRoutes) {
        expect(skillExecutionRouteSchema.safeParse(route).success).toBe(true);
      }
      expect(skillExecutionRouteSchema.safeParse('invalid_route').success).toBe(false);
    });

    it('validates skill parameters schema', () => {
      const validParam = {
        name: 'targetLang',
        label: 'Target Language',
        type: 'select' as const,
        required: true,
        defaultValue: 'Spanish',
        options: ['Spanish', 'French', 'German'],
      };
      const result = skillParameterSchema.safeParse(validParam);
      expect(result.success).toBe(true);

      // Invalid param (missing name)
      const invalidParam = { label: 'Missing Name', type: 'string' };
      expect(skillParameterSchema.safeParse(invalidParam).success).toBe(false);
    });

    it('validates a complete well-formed Skill record', () => {
      const validSkill: Skill = {
        id: 'custom_skill_1',
        name: 'Quick Academic Breakdown',
        description: 'Breaks down research paper methodology and conclusions.',
        category: 'research',
        icon: 'BookOpen',
        instructionTemplate: 'Analyze methodology in {{section}}: {{instruction}}',
        parameters: [
          {
            name: 'section',
            label: 'Section Name',
            type: 'string',
            required: false,
            defaultValue: 'Abstract',
          },
          {
            name: 'instruction',
            label: 'Focus',
            type: 'string',
            required: true,
          },
        ],
        supportedPageTypes: ['article', 'any'],
        executionRoute: 'chat',
        source: 'user_created',
        version: 1,
        isEnabled: true,
        isFavorite: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const parsed = skillSchema.safeParse(validSkill);
      expect(parsed.success).toBe(true);
    });

    it('enforces maximum character length constraints', () => {
      expect(MAX_SKILL_NAME_LENGTH).toBe(80);
      expect(MAX_SKILL_DESC_LENGTH).toBe(300);
      expect(MAX_TEMPLATE_LENGTH).toBe(4000);
      expect(MAX_CUSTOM_SKILLS_COUNT).toBe(150);
      expect(MAX_HISTORY_ENTRIES).toBe(100);
      expect(MAX_IMPORT_FILE_SIZE_BYTES).toBe(2 * 1024 * 1024);

      const longNameSkill = {
        id: 'skill_long_name',
        name: 'A'.repeat(MAX_SKILL_NAME_LENGTH + 1),
        description: 'Test',
        category: 'productivity',
        icon: 'Sparkles',
        instructionTemplate: 'Test template',
        parameters: [],
        supportedPageTypes: ['any'],
        executionRoute: 'chat',
        source: 'user_created',
        version: 1,
        isEnabled: true,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(skillSchema.safeParse(longNameSkill).success).toBe(false);

      const longTemplateSkill = {
        ...longNameSkill,
        name: 'Valid Name',
        instructionTemplate: 'B'.repeat(MAX_TEMPLATE_LENGTH + 1),
      };
      expect(skillSchema.safeParse(longTemplateSkill).success).toBe(false);
    });

    it('validates skill execution records', () => {
      const validRecord: SkillExecutionRecord = {
        executionId: 'exec_1',
        skillId: 'builtin-quick-summary',
        skillName: 'Quick Page Summary',
        category: 'summarization',
        route: 'summarize',
        pageUrl: 'https://example.com/test',
        pageTitle: 'Test Page',
        status: 'completed',
        renderedInstruction: 'Summarize this page in 3 points.',
        inputs: {},
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 420,
      };
      expect(skillExecutionRecordSchema.safeParse(validRecord).success).toBe(true);

      const invalidStatusRecord = {
        ...validRecord,
        status: 'unknown_status',
      };
      expect(skillExecutionRecordSchema.safeParse(invalidStatusRecord).success).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* B. Built-in Skills Library & Immutability                                  */
  /* -------------------------------------------------------------------------- */
  describe('B. Built-in Skills Library & Immutability', () => {
    it('provides 8 predefined high-utility built-in skills', () => {
      expect(BUILTIN_SKILLS.length).toBeGreaterThanOrEqual(8);
      for (const skill of BUILTIN_SKILLS) {
        expect(skill.source).toBe('built_in');
        const parseRes = skillSchema.safeParse(skill);
        expect(parseRes.success).toBe(true);
      }
    });

    it('includes essential built-in workflows across core categories', () => {
      const ids = BUILTIN_SKILLS.map((s) => s.id);
      expect(ids).toContain('builtin-quick-summary');
      expect(ids).toContain('builtin-detailed-analysis');
      expect(ids).toContain('builtin-explain-page');
      expect(ids).toContain('builtin-extract-key-info');
      expect(ids).toContain('builtin-youtube-summary');
      expect(ids).toContain('builtin-find-element');
      expect(ids).toContain('builtin-improve-text');
      expect(ids).toContain('builtin-ask-page');
    });

    it('protects built-in skills from deletion in storage', async () => {
      await expect(skillStorageService.deleteSkill('builtin-quick-summary')).rejects.toThrow(
        /Cannot delete built-in skills/i
      );

      // Verify built-in remains in the combined skills list
      const allSkills = await skillStorageService.getSkills();
      const quickSummary = allSkills.find((s) => s.id === 'builtin-quick-summary');
      expect(quickSummary).toBeDefined();
    });

    it('protects built-in skills from direct modification in storage', async () => {
      await expect(
        skillStorageService.updateSkill('builtin-quick-summary', {
          name: 'Hacked BuiltIn Name',
        })
      ).rejects.toThrow(/Cannot directly edit a built-in skill/i);
    });

    it('allows duplicating a built-in skill to create an editable custom skill', async () => {
      const duplicated = await skillService.duplicateSkill(
        'builtin-quick-summary',
        'My Custom Summary'
      );
      expect(duplicated.id).not.toBe('builtin-quick-summary');
      expect(duplicated.source).toBe('user_created');
      expect(duplicated.name).toBe('My Custom Summary');

      // Verify custom skill is in storage
      const customSkills = await skillStorageService.getCustomSkills();
      expect(customSkills.some((s) => s.id === duplicated.id)).toBe(true);
    });

    it('allows users to toggle favorite status on built-in skills via preference storage', async () => {
      const targetId = 'builtin-detailed-analysis';
      const before = (await skillStorageService.getSkills()).find((s) => s.id === targetId);
      expect(before?.isFavorite).toBe(false);

      const updated = await skillStorageService.toggleSkillFavorite(targetId, true);
      expect(updated?.isFavorite).toBe(true);

      // Re-fetch to ensure preference persisted
      const after = (await skillStorageService.getSkills()).find((s) => s.id === targetId);
      expect(after?.isFavorite).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* C. Safe Template Rendering Engine                                          */
  /* -------------------------------------------------------------------------- */
  describe('C. Safe Template Rendering Engine', () => {
    it('extracts unique variable placeholders using mustache syntax', () => {
      const template = 'Summarize {{topic}} for {{audience}}. Focus on {{topic}} aspects.';
      const vars = skillTemplateService.extractVariables(template);
      expect(vars).toEqual(['topic', 'audience']);
    });

    it('handles templates without placeholders', () => {
      const template = 'Summarize this page directly without parameters.';
      expect(skillTemplateService.extractVariables(template)).toEqual([]);
    });

    it('renders variables correctly using provided parameter values', () => {
      const template = 'Explain {{topic}} in {{style}} style.';
      const params = [
        { name: 'topic', label: 'Topic', type: 'string' as const, required: true },
        { name: 'style', label: 'Style', type: 'string' as const, required: true },
      ];
      const result = skillTemplateService.renderTemplate(template, params, {
        topic: 'Quantum Computing',
        style: 'conversational Hinglish',
      });

      expect(result.rendered).toBe('Explain Quantum Computing in conversational Hinglish style.');
      expect(result.errors).toEqual([]);
    });

    it('falls back to default values when optional parameters are omitted', () => {
      const template = 'Translate to {{targetLang}}: {{text}}';
      const params = [
        {
          name: 'targetLang',
          label: 'Language',
          type: 'string' as const,
          required: false,
          defaultValue: 'Hindi',
        },
        { name: 'text', label: 'Content', type: 'string' as const, required: true },
      ];
      const result = skillTemplateService.renderTemplate(template, params, {
        text: 'Welcome to our platform',
      });

      expect(result.rendered).toBe('Translate to Hindi: Welcome to our platform');
      expect(result.errors).toEqual([]);
    });

    it('flags missing required parameters and reports them cleanly', () => {
      const template = 'Search for {{query}} in section {{section}}';
      const params = [
        { name: 'query', label: 'Search Query', type: 'string' as const, required: true },
        { name: 'section', label: 'Section', type: 'string' as const, required: true },
      ];
      const result = skillTemplateService.renderTemplate(template, params, {
        query: 'Pricing details',
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Required parameter "Section" is missing');
      expect(result.rendered).toContain('{{section}}');
    });

    it('sanitizes input and executes zero dynamic code / eval', () => {
      const template = 'Execute: {{command}}';
      const malicious = '<script>alert("hack")</script>';
      const params = [{ name: 'command', label: 'Cmd', type: 'string' as const, required: true }];
      const result = skillTemplateService.renderTemplate(template, params, {
        command: malicious,
      });

      // Tags are stripped out by sanitizer
      expect(result.rendered).not.toContain('<script>');
      expect(result.rendered).toBe('Execute: alert("hack")');
    });

    it('validates template variables against defined parameter list', () => {
      const template = 'Analyze {{metric}} from {{quarter}}';
      const params = [{ name: 'metric', label: 'Metric', type: 'string' as const, required: true }];
      const validation = skillTemplateService.validateTemplate(template, params);

      expect(validation.isValid).toBe(false);
      expect(validation.missingParameters).toContain('quarter');
      expect(validation.templateVariables).toEqual(['metric', 'quarter']);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* D. Page Context Compatibility                                              */
  /* -------------------------------------------------------------------------- */
  describe('D. Page Context Compatibility', () => {
    it('identifies YouTube summary skill as compatible only on YouTube URLs', () => {
      const ytSkill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-youtube-summary')!;
      const ytContext: SkillPageContextInfo = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        isArticle: false,
        isYouTube: true,
        hasSelection: false,
        isRestricted: false,
      };
      const generalContext: SkillPageContextInfo = {
        url: 'https://developer.chrome.com/docs/extensions/',
        title: 'Chrome Extensions',
        isArticle: true,
        isYouTube: false,
        hasSelection: false,
        isRestricted: false,
      };

      const ytCheck = checkSkillCompatibility(ytSkill, ytContext);
      expect(ytCheck.isCompatible).toBe(true);

      const generalCheck = checkSkillCompatibility(ytSkill, generalContext);
      expect(generalCheck.isCompatible).toBe(false);
      expect(generalCheck.reason).toMatch(/requires youtube|youtube video pages/i);
    });

    it('flags skills requiring text selection when no selection is present', () => {
      const rewriteSkill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-improve-text')!;
      const noSelectContext: SkillPageContextInfo = {
        url: 'https://example.com',
        title: 'Example',
        isArticle: false,
        isYouTube: false,
        hasSelection: false,
        isRestricted: false,
      };
      const withSelectContext: SkillPageContextInfo = {
        ...noSelectContext,
        hasSelection: true,
        selectedText: 'Draft paragraph needing improvement.',
      };

      const check1 = checkSkillCompatibility(rewriteSkill, noSelectContext);
      expect(check1.isCompatible).toBe(false);
      expect(check1.reason).toMatch(/select text/i);

      const check2 = checkSkillCompatibility(rewriteSkill, withSelectContext);
      expect(check2.isCompatible).toBe(true);
    });

    it('rejects unsupported browser restricted pages (chrome://, edge://)', () => {
      const skill = BUILTIN_SKILLS[0];
      const systemPageContext: SkillPageContextInfo = {
        url: 'chrome://settings',
        title: 'Settings',
        isArticle: false,
        isYouTube: false,
        hasSelection: false,
        isRestricted: true,
      };
      const check = checkSkillCompatibility(skill, systemPageContext);
      expect(check.isCompatible).toBe(false);
      expect(check.reason).toMatch(/chrome does not permit extensions to access internal/i);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* E. Skill Storage & History Service                                         */
  /* -------------------------------------------------------------------------- */
  describe('E. Skill Storage & History Service', () => {
    it('creates, saves, retrieves, and deletes custom skills', async () => {
      const created = await skillService.createSkill({
        name: 'Competitive Product Matrix',
        description: 'Extracts features and compares with competitors',
        category: 'research',
        icon: 'Sparkles',
        instructionTemplate: 'Analyze {{product}} features versus current market alternatives.',
        parameters: [{ name: 'product', label: 'Product Name', type: 'string', required: true }],
        supportedPageTypes: ['any'],
        executionRoute: 'chat',
        isEnabled: true,
        isFavorite: false,
      });

      expect(created.id).toBeDefined();
      expect(created.source).toBe('user_created');

      const retrieved = await skillStorageService.getSkillById(created.id);
      expect(retrieved?.name).toBe('Competitive Product Matrix');

      // Update skill
      const updated = await skillStorageService.updateSkill(created.id, {
        description: 'Updated description for competitive matrix.',
      });
      expect(updated.description).toBe('Updated description for competitive matrix.');

      // Delete skill
      const deleted = await skillStorageService.deleteSkill(created.id);
      expect(deleted).toBe(true);
      const afterDelete = await skillStorageService.getSkillById(created.id);
      expect(afterDelete).toBeNull();
    });

    it('records execution history and manages history records', async () => {
      const sampleRecord: SkillExecutionRecord = {
        executionId: 'exec_test_1',
        skillId: 'builtin-quick-summary',
        skillName: 'Quick Summary',
        category: 'summarization',
        route: 'summarize',
        status: 'completed',
        renderedInstruction: 'Summarize page',
        inputs: {},
        durationMs: 310,
        pageUrl: 'https://example.com/test-article',
        pageTitle: 'Test Article',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      await skillHistoryService.addRecord(sampleRecord);

      const history = await skillHistoryService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].skillName).toBe('Quick Summary');

      // Clear history
      await skillHistoryService.clearHistory();
      const clearedHistory = await skillHistoryService.getHistory();
      expect(clearedHistory.length).toBe(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* F. Portable JSON Export & Import                                           */
  /* -------------------------------------------------------------------------- */
  describe('F. Portable JSON Export & Import', () => {
    it('exports skills into a valid, versioned JSON package', async () => {
      const customSkill = await skillService.createSkill({
        name: 'Exportable Test Skill',
        description: 'Testing clean portability without private data.',
        category: 'productivity',
        icon: 'Sparkles',
        instructionTemplate: 'Process this {{item}}',
        parameters: [{ name: 'item', label: 'Item', type: 'string', required: true }],
        supportedPageTypes: ['any'],
        executionRoute: 'chat',
      });

      const pkg = skillExportService.createExportPackage([customSkill, BUILTIN_SKILLS[0]]);

      expect(pkg.format).toBe('sahayak-skills');
      expect(pkg.version).toBe(1);
      expect(pkg.skills.length).toBe(2);

      // Verify validation schema succeeds
      expect(skillExportPackageSchema.safeParse(pkg).success).toBe(true);
    });

    it('never leaks API keys, personal memories, or credentials in exported JSON', async () => {
      const customSkill = await skillService.createSkill({
        name: 'Confidentiality Check Skill',
        description: 'Ensure clean export',
        category: 'writing',
        icon: 'Sparkles',
        instructionTemplate: 'Rewrite this text',
        parameters: [],
        supportedPageTypes: ['any'],
        executionRoute: 'rewrite',
      });

      const jsonStr = skillExportService.exportToJsonString([customSkill]);

      // Assert zero API keys or secrets in json string
      expect(jsonStr).not.toContain('apiKey');
      expect(jsonStr).not.toContain('geminiApiKey');
      expect(jsonStr).not.toContain('groqApiKey');
      expect(jsonStr).not.toContain('sahayak_memories_v1');
      expect(jsonStr).not.toContain('Prefers concise bullet points');
    });

    it('previews and imports skills resolving collisions safely via renaming or overwriting', async () => {
      const existing = await skillService.createSkill({
        name: 'Pre-existing Skill',
        description: 'Original version',
        category: 'research',
        icon: 'Sparkles',
        instructionTemplate: 'Analyze {{topic}}',
        parameters: [{ name: 'topic', label: 'Topic', type: 'string', required: true }],
        supportedPageTypes: ['any'],
        executionRoute: 'chat',
      });

      const importPkg: SkillExportPackage = {
        format: 'sahayak-skills',
        version: 1,
        exportedAt: new Date().toISOString(),
        skills: [
          {
            id: existing.id, // ID collision
            name: 'Pre-existing Skill',
            description: 'New imported version',
            category: 'research',
            icon: 'Sparkles',
            instructionTemplate: 'Analyze deeply {{topic}}',
            parameters: [{ name: 'topic', label: 'Topic', type: 'string', required: true }],
            supportedPageTypes: ['any'],
            executionRoute: 'chat',
            source: 'user_created',
            version: 1,
            isEnabled: true,
            isFavorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'new_imported_skill_2',
            name: 'Brand New Imported Skill',
            description: 'Brand new skill',
            category: 'navigation',
            icon: 'Compass',
            instructionTemplate: 'Locate checkout button',
            parameters: [],
            supportedPageTypes: ['any'],
            executionRoute: 'find_element',
            source: 'user_created',
            version: 1,
            isEnabled: true,
            isFavorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const jsonPayload = JSON.stringify(importPkg);

      // 1. Preview
      const preview = await skillImportService.previewImport(jsonPayload);
      expect(preview.isValid).toBe(true);
      expect(preview.items.length).toBe(2);
      expect(preview.items[0].hasIdCollision).toBe(true);

      // 2. Execute Import with rename
      const importResult = await skillImportService.executeImport(
        preview.items.map((i) => i.skill),
        { resolveCollisions: 'rename' }
      );

      expect(importResult.importedCount).toBe(2);

      const allCustom = await skillStorageService.getCustomSkills();
      const renamed = allCustom.find((s) => s.name.includes('(Copy)'));
      expect(renamed).toBeDefined();
    });

    it('rejects oversized JSON payloads exceeding 2MB limit in preview', async () => {
      const hugeString = 'X'.repeat(MAX_IMPORT_FILE_SIZE_BYTES + 100);
      const preview = await skillImportService.previewImport(hugeString);
      expect(preview.isValid).toBe(false);
      expect(preview.errors[0]).toMatch(/exceeds maximum allowed/i);
    });

    it('rejects invalid or corrupted JSON payloads in preview', async () => {
      const corruptedPreview = await skillImportService.previewImport('{ bad json: true');
      expect(corruptedPreview.isValid).toBe(false);
      expect(corruptedPreview.errors[0]).toMatch(/invalid json syntax/i);

      const badFormatPreview = await skillImportService.previewImport(
        JSON.stringify({ format: 'invalid-format', version: 99 })
      );
      expect(badFormatPreview.isValid).toBe(false);
      expect(badFormatPreview.errors[0]).toMatch(/package validation error/i);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* G. One-Click Execution Routing                                             */
  /* -------------------------------------------------------------------------- */
  describe('G. One-Click Execution Routing', () => {
    it('executes summarize route and records successful execution', async () => {
      const skill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-quick-summary')!;
      const context: SkillPageContextInfo = {
        url: 'https://example.com/article',
        title: 'Test Article',
        isArticle: true,
        isYouTube: false,
        hasSelection: false,
        isRestricted: false,
      };

      const result = await skillExecutionService.executeSkill(skill, {}, context);
      expect(result.status).toBe('completed');
      expect(result.route).toBe('summarize');
      expect(result.textOutput).toContain('Test article overview summary.');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);

      // Verify execution recorded in history
      const history = await skillHistoryService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].skillId).toBe('builtin-quick-summary');
    });

    it('executes youtube route when on a valid YouTube page', async () => {
      const skill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-youtube-summary')!;
      const context: SkillPageContextInfo = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Test Video',
        isArticle: false,
        isYouTube: true,
        hasSelection: false,
        isRestricted: false,
      };

      const result = await skillExecutionService.executeSkill(skill, {}, context);
      expect(result.status).toBe('completed');
      expect(result.route).toBe('youtube');
      expect(result.textOutput).toContain('Video discussing Sahayak skills.');
    });

    it('executes chat route with page context grounding', async () => {
      const skill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-explain-page')!;
      const context: SkillPageContextInfo = {
        url: 'https://example.com/article',
        title: 'Test Article',
        isArticle: true,
        isYouTube: false,
        hasSelection: false,
        isRestricted: false,
      };

      const result = await skillExecutionService.executeSkill(skill, {}, context);
      expect(result.status).toBe('completed');
      expect(result.route).toBe('chat');
      expect(result.textOutput).toBe('This is the grounded chat answer for the page.');
    });

    it('executes find_element route and produces highlighted element result', async () => {
      const skill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-find-element')!;
      const context: SkillPageContextInfo = {
        url: 'https://example.com/app',
        title: 'App Interface',
        isArticle: false,
        isYouTube: false,
        hasSelection: false,
        isRestricted: false,
      };

      const result = await skillExecutionService.executeSkill(
        skill,
        { element_description: 'Submit Application' },
        context
      );

      expect(result.status).toBe('completed');
      expect(result.route).toBe('find_element');
      expect(result.textOutput).toContain('Found element');
      expect(result.textOutput).toContain('Submit Application');
    });

    it('executes rewrite route using selected text and AI manager', async () => {
      const skill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-improve-text')!;
      const context: SkillPageContextInfo = {
        url: 'https://example.com/editor',
        title: 'Text Editor',
        isArticle: false,
        isYouTube: false,
        hasSelection: true,
        selectedText: 'Here is rough drafting text that needs polishing.',
        isRestricted: false,
      };

      const result = await skillExecutionService.executeSkill(
        skill,
        { style: 'Professional', tone: 'Neutral' },
        context
      );

      expect(result.status).toBe('completed');
      expect(result.route).toBe('rewrite');
      expect(result.textOutput).toBe('Rewritten clean text from prompt.');
    });

    it('routes agent_action into HITL single-step approval flow', async () => {
      const customAgentSkill: Skill = {
        id: 'skill_agent_action_test',
        name: 'Automated Submit Flow',
        description: 'Plans next action to submit the form',
        category: 'page_interaction',
        icon: 'Bot',
        instructionTemplate: 'Click the submit application button for me',
        parameters: [],
        supportedPageTypes: ['any'],
        executionRoute: 'agent_action',
        source: 'user_created',
        version: 1,
        isEnabled: true,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const context: SkillPageContextInfo = {
        url: 'https://example.com/form',
        title: 'Job Form',
        isArticle: false,
        isYouTube: false,
        hasSelection: false,
        isRestricted: false,
      };

      const result = await skillExecutionService.executeSkill(customAgentSkill, {}, context);
      expect(result.status).toBe('completed');
      expect(result.route).toBe('agent_action');
      expect(result.agentAction).toBeDefined();
      if (result.agentAction && result.agentAction.type === 'click_element') {
        expect(result.agentAction.targetActionId).toBe(101);
      }
      expect(result.agentAction?.description).toContain('Click the Submit Application button');
    });

    it('handles unsupported page context gracefully with unsupported_context status', async () => {
      const skill = BUILTIN_SKILLS.find((s) => s.id === 'builtin-youtube-summary')!;
      // Provide invalid non-YouTube context to trigger error
      const invalidContext: SkillPageContextInfo = {
        url: 'https://example.com/not-youtube',
        title: 'Not YouTube',
        isArticle: false,
        isYouTube: false,
        hasSelection: false,
        isRestricted: false,
      };

      const result = await skillExecutionService.executeSkill(skill, {}, invalidContext);
      expect(result.status).toBe('unsupported_context');
      expect(result.error).toMatch(/operates on youtube video pages/i);

      // Verify failure recorded in history
      const history = await skillHistoryService.getHistory();
      const failedEntry = history.find((h) => h.status === 'unsupported_context');
      expect(failedEntry).toBeDefined();
      expect(failedEntry?.error).toMatch(/operates on youtube video pages/i);
    });
  });
});
