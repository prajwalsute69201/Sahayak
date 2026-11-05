/**
 * Sahayak Skill Compatibility Utilities
 * Computes whether a given Skill can be executed against the active tab's page context.
 */

import { Skill, SkillPageContextInfo } from '../types/skill.types';

export interface SkillCompatibilityResult {
  isCompatible: boolean;
  statusBadge: {
    label: string;
    variant: 'success' | 'warning' | 'neutral' | 'error';
  };
  reason?: string;
}

export function checkSkillCompatibility(
  skill: Skill,
  context: SkillPageContextInfo | null
): SkillCompatibilityResult {
  // If no context available or page is restricted (e.g. chrome://, edge://, about:blank)
  if (!context) {
    return {
      isCompatible: false,
      statusBadge: { label: 'No Active Tab', variant: 'neutral' },
      reason: 'No active browser tab context detected.',
    };
  }

  if (context.isRestricted) {
    return {
      isCompatible: false,
      statusBadge: { label: 'Restricted Page', variant: 'error' },
      reason: 'Chrome does not permit extensions to access internal chrome:// or webstore pages.',
    };
  }

  // Check supported page types
  const supported = skill.supportedPageTypes;

  // If 'any' is in supported, it works anywhere unless specifically constrained by route
  if (supported.includes('any')) {
    // If route is 'rewrite', requires selection
    if (skill.executionRoute === 'rewrite' && !context.hasSelection) {
      return {
        isCompatible: false,
        statusBadge: { label: 'Select Text First', variant: 'warning' },
        reason: 'Please select text on the webpage before executing this rewrite skill.',
      };
    }

    return {
      isCompatible: true,
      statusBadge: { label: 'Ready', variant: 'success' },
    };
  }

  // Check specific page type requirements
  if (supported.includes('youtube')) {
    if (context.isYouTube) {
      return {
        isCompatible: true,
        statusBadge: { label: 'YouTube Ready', variant: 'success' },
      };
    }
    return {
      isCompatible: false,
      statusBadge: { label: 'Requires YouTube', variant: 'neutral' },
      reason: 'This skill operates on YouTube video pages with transcript access.',
    };
  }

  if (supported.includes('article')) {
    if (context.isArticle) {
      return {
        isCompatible: true,
        statusBadge: { label: 'Article Ready', variant: 'success' },
      };
    }
    return {
      isCompatible: false,
      statusBadge: { label: 'Requires Article', variant: 'neutral' },
      reason: 'This skill is optimized for readable articles and blog posts.',
    };
  }

  if (supported.includes('selection')) {
    if (context.hasSelection) {
      return {
        isCompatible: true,
        statusBadge: { label: 'Text Selected', variant: 'success' },
      };
    }
    return {
      isCompatible: false,
      statusBadge: { label: 'Select Text First', variant: 'warning' },
      reason: 'Please select text on the page to run this skill.',
    };
  }

  return {
    isCompatible: true,
    statusBadge: { label: 'Ready', variant: 'success' },
  };
}
