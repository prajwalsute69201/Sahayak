/**
 * Sahayak Default Safety Rules & Policy Declarations (Slice 16)
 * Immutable, code-level safety boundaries that govern all browser automation actions.
 * Mandatory rules CANNOT be disabled by user preferences, imported Skills, or AI instructions.
 */

import { BlockedActionCategory, SafetyPolicyRule } from '../types/safety.types';

export const MANDATORY_BLOCKED_CATEGORIES: BlockedActionCategory[] = [
  'form_submission',
  'payments_and_purchases',
  'financial_transfers',
  'messaging_and_emails',
  'publishing_content',
  'destructive_operations',
  'security_account_changes',
  'unsupported_url_schemes',
  'sensitive_field_interaction',
];

export const DEFAULT_SAFETY_RULES: ReadonlyArray<SafetyPolicyRule> = [
  {
    id: 'RULE_BLOCK_FORM_SUBMISSION',
    name: 'Block Form Submissions',
    description:
      'Blocks automated clicks on submit buttons or controls nested inside forms that would transmit form data.',
    category: 'form_submission',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_PAYMENTS',
    name: 'Block Payments & Purchases',
    description:
      'Strictly prevents any payment, checkout, card entry, purchase, or order placement in English or Hinglish.',
    category: 'payments_and_purchases',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_FINANCIAL_TRANSFERS',
    name: 'Block Financial Transfers',
    description:
      'Prevents wire transfers, balance withdrawals, bank transfers, or funds movement on all platforms.',
    category: 'financial_transfers',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_MESSAGING',
    name: 'Block Outbound Messaging & Emails',
    description:
      'Prevents automated sending of emails, chat messages, social media posts, direct messages, or publishing content.',
    category: 'messaging_and_emails',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_PUBLISHING',
    name: 'Block Content Publishing',
    description:
      'Prevents publishing articles, uploading public media, posting comments, or broadcasting public updates.',
    category: 'publishing_content',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_DESTRUCTIVE',
    name: 'Block Destructive Operations',
    description:
      'Prevents deletion of user accounts, removing primary data, wiping configurations, or irreversible actions.',
    category: 'destructive_operations',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_SECURITY_CHANGES',
    name: 'Block Security & Credential Changes',
    description:
      'Prevents changing passwords, updating multi-factor authentication, security questions, or authorization settings.',
    category: 'security_account_changes',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_UNSUPPORTED_URL_SCHEMES',
    name: 'Enforce Safe URL Schemes',
    description:
      'Permits only http: and https: protocols; blocks javascript:, data:, file:, chrome:, and extension schemes.',
    category: 'unsupported_url_schemes',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_BLOCK_SENSITIVE_FIELDS',
    name: 'Block Sensitive Field Interactions',
    description:
      'Blocks targeting password inputs, OTP fields, CVV fields, or fields tagged with sensitive credentials.',
    category: 'sensitive_field_interaction',
    isMandatory: true,
    severity: 'critical',
  },
  {
    id: 'RULE_ENHANCED_CONFIRMATION_AMBIGUOUS',
    name: 'Enhanced Confirmation on Elevated Risk',
    description:
      'Requires explicit double-confirmation for ambiguous or potentially consequential state-changing clicks.',
    category: 'ambiguous_untrusted_click',
    isMandatory: false,
    severity: 'high',
  },
  {
    id: 'RULE_ALLOW_VISUAL_ACTIONS',
    name: 'Allow Non-Destructive Visual Actions',
    description:
      'Permits visual highlights, scrolling to page sections, and scrolling viewport without modification.',
    category: 'general',
    isMandatory: false,
    severity: 'low',
  },
  {
    id: 'RULE_STANDARD_APPROVAL_NAVIGATION',
    name: 'Standard Approval for Navigation & Search',
    description:
      'Requires standard single-step human approval before clicking ordinary navigation links or search triggers.',
    category: 'general',
    isMandatory: false,
    severity: 'medium',
  },
];
