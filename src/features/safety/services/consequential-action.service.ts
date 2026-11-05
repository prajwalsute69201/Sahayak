/**
 * Sahayak Consequential Action Detection Service (Slice 16)
 * Deterministically identifies operations that cause meaningful external, financial,
 * or irreversible changes outside the local browser interface.
 * Evaluates semantic metadata, tag properties, and English + Hinglish keyword patterns.
 */

import { AgentAction } from '@/features/agent/types/agent.types';
import { ScannedElement } from '@/features/element-scanner';
import { BlockedActionCategory } from '../types/safety.types';

export interface ConsequentialDetectionResult {
  isConsequential: boolean;
  category?: BlockedActionCategory;
  reason?: string;
  matchedPatterns: string[];
  ruleId?: string;
}

export class ConsequentialActionService {
  /* -------------------------------------------------------------------------- */
  /* Keyword Pattern Dictionaries (English + Romanized Hinglish)                */
  /* -------------------------------------------------------------------------- */

  // Form submission patterns
  private static readonly SUBMIT_PATTERNS = [
    'submit',
    'submit form',
    'apply now',
    'register now',
    'sign up',
    'signup',
    'complete registration',
    'finish application',
    // Hinglish patterns
    'form submit karo',
    'submit karo',
    'jama karo',
    'darj karo',
    'aavedan karo',
  ];

  // Payments, Purchases & Checkout patterns
  private static readonly PAYMENT_PATTERNS = [
    'pay',
    'payment',
    'pay now',
    'checkout',
    'buy',
    'buy now',
    'purchase',
    'place order',
    'place your order',
    'confirm purchase',
    'complete order',
    'razorpay',
    'stripe',
    'paypal',
    'paytm',
    'upi',
    'credit card',
    'debit card',
    'cvv',
    'billing',
    'subscription charge',
    // Hinglish patterns
    'paise do',
    'paise bhugtan',
    'bhugtan karo',
    'khareedo',
    'kharidari karo',
    'order do',
    'order place karo',
  ];

  // Financial Transfers
  private static readonly FINANCIAL_TRANSFER_PATTERNS = [
    'transfer funds',
    'transfer money',
    'wire transfer',
    'send money',
    'withdraw balance',
    'bank transfer',
    'direct deposit',
    'wallet transfer',
    // Hinglish patterns
    'paise bhejo',
    'transfer karo',
    'bank me bhejo',
    'paisa transfer',
  ];

  // Outbound Messaging & Emails
  private static readonly MESSAGING_PATTERNS = [
    'send email',
    'send message',
    'direct message',
    'send dm',
    'compose email',
    'dispatch message',
    'broadcast message',
    'send invite',
    // Hinglish patterns
    'mail bhejo',
    'email bhejo',
    'message bhejo',
    'sandesh bhejo',
  ];

  // Content Publishing & Social Posting
  private static readonly PUBLISHING_PATTERNS = [
    'publish',
    'publish post',
    'publish article',
    'post comment',
    'tweet',
    'retweet',
    'share update',
    'upload video',
    'publish page',
    // Hinglish patterns
    'post karo',
    'publish karo',
    'comment post karo',
  ];

  // Destructive Operations
  private static readonly DESTRUCTIVE_PATTERNS = [
    'delete',
    'delete account',
    'delete profile',
    'delete user',
    'remove account',
    'remove profile',
    'remove user',
    'terminate account',
    'terminate profile',
    'erase data',
    'wipe data',
    'wipe organization data',
    'wipe',
    'drop table',
    'destroy data',
    'purge all',
    'purge',
    'cancel account',
    // Hinglish patterns
    'account delete karo',
    'account delete kar do',
    'hata do',
    'hatao',
    'mita do',
    'delete kar do',
    'delete karo',
    'sab hatao',
    'sab data mita do',
  ];

  // Security & Credential Changes
  private static readonly SECURITY_PATTERNS = [
    'password',
    'change password',
    'update password',
    'reset password',
    'modify password',
    'disable 2fa',
    'enable 2fa',
    'two-factor',
    'two factor',
    'mfa',
    'mfa settings',
    'security question',
    'security settings',
    'revoke access',
    'generate api key',
    // Hinglish patterns
    'password badlo',
    'password change karo',
    'security badlo',
  ];

  /**
   * Deterministically evaluates whether an action or targeted element is consequential.
   */
  public evaluateConsequentialAction(
    action: AgentAction,
    element?: ScannedElement
  ): ConsequentialDetectionResult {
    // Combine all textual identifiers safely for keyword pattern matching
    const searchTokens: string[] = [];
    if (action.title) searchTokens.push(action.title);
    if (action.description) searchTokens.push(action.description);
    if (action.reason) searchTokens.push(action.reason);
    if ('targetElementLabel' in action && action.targetElementLabel) {
      searchTokens.push(action.targetElementLabel);
    }
    if (element) {
      if (element.label) searchTokens.push(element.label);
      if (element.ariaLabel) searchTokens.push(element.ariaLabel);
      if (element.placeholder) searchTokens.push(element.placeholder);
      if (element.name) searchTokens.push(element.name);
      if (element.elementId) searchTokens.push(element.elementId);
    }

    const combinedText = searchTokens.join(' ').toLowerCase();

    // 1. Check Sensitive Field Interaction (e.g. targeting password/OTP/CVV inputs)
    if (element?.safetyMetadata?.isPasswordOrSensitiveField || this.isSensitiveField(element)) {
      return {
        isConsequential: true,
        category: 'sensitive_field_interaction',
        ruleId: 'RULE_BLOCK_SENSITIVE_FIELDS',
        reason:
          'Interacting with password inputs, OTP fields, or sensitive credential elements is strictly blocked.',
        matchedPatterns: ['sensitive_field_detected'],
      };
    }

    // 2. Check Payments & Purchases (Takes precedence over generic submit)
    const paymentMatches = this.extractMatches(
      combinedText,
      ConsequentialActionService.PAYMENT_PATTERNS
    );
    if (paymentMatches.length > 0) {
      return {
        isConsequential: true,
        category: 'payments_and_purchases',
        ruleId: 'RULE_BLOCK_PAYMENTS',
        reason:
          'Financial purchases, orders, checkout, and payment actions are blocked deterministically.',
        matchedPatterns: paymentMatches,
      };
    }

    // 3. Check Financial Transfers
    const transferMatches = this.extractMatches(
      combinedText,
      ConsequentialActionService.FINANCIAL_TRANSFER_PATTERNS
    );
    if (transferMatches.length > 0) {
      return {
        isConsequential: true,
        category: 'financial_transfers',
        ruleId: 'RULE_BLOCK_FINANCIAL_TRANSFERS',
        reason: 'Fund transfers, banking transactions, and money movements are strictly blocked.',
        matchedPatterns: transferMatches,
      };
    }

    // 4. Check Destructive Operations
    const destructiveMatches = this.extractMatches(
      combinedText,
      ConsequentialActionService.DESTRUCTIVE_PATTERNS
    );
    if (destructiveMatches.length > 0 || element?.safetyMetadata?.isDestructive) {
      return {
        isConsequential: true,
        category: 'destructive_operations',
        ruleId: 'RULE_BLOCK_DESTRUCTIVE',
        reason:
          'Destructive actions such as deleting accounts, clearing critical data, or terminating profiles are blocked.',
        matchedPatterns:
          destructiveMatches.length > 0 ? destructiveMatches : ['element_destructive_styling'],
      };
    }

    // 5. Check Security & Credential Changes
    const securityMatches = this.extractMatches(
      combinedText,
      ConsequentialActionService.SECURITY_PATTERNS
    );
    if (securityMatches.length > 0) {
      return {
        isConsequential: true,
        category: 'security_account_changes',
        ruleId: 'RULE_BLOCK_SECURITY_CHANGES',
        reason: 'Security modifications, password changes, and authentication updates are blocked.',
        matchedPatterns: securityMatches,
      };
    }

    // 6. Check Outbound Messaging & Emails
    const messagingMatches = this.extractMatches(
      combinedText,
      ConsequentialActionService.MESSAGING_PATTERNS
    );
    if (messagingMatches.length > 0) {
      return {
        isConsequential: true,
        category: 'messaging_and_emails',
        ruleId: 'RULE_BLOCK_MESSAGING',
        reason:
          'Dispatching emails, chat messages, or public correspondence is blocked for safety.',
        matchedPatterns: messagingMatches,
      };
    }

    // 7. Check Content Publishing
    const publishingMatches = this.extractMatches(
      combinedText,
      ConsequentialActionService.PUBLISHING_PATTERNS
    );
    if (publishingMatches.length > 0) {
      return {
        isConsequential: true,
        category: 'publishing_content',
        ruleId: 'RULE_BLOCK_PUBLISHING',
        reason: 'Broadcasting updates, publishing articles, or posting public media is blocked.',
        matchedPatterns: publishingMatches,
      };
    }

    // 8. Check Form Submission Controls
    const submitMatches = this.extractMatches(
      combinedText,
      ConsequentialActionService.SUBMIT_PATTERNS
    );
    if (
      element?.safetyMetadata?.isSubmitControl ||
      this.isSubmitControl(element, combinedText) ||
      (action.type === 'click_element' && submitMatches.length > 0)
    ) {
      return {
        isConsequential: true,
        category: 'form_submission',
        ruleId: 'RULE_BLOCK_FORM_SUBMISSION',
        reason:
          'Form submission is a consequential action that transmits user or page data and is blocked.',
        matchedPatterns: submitMatches.length > 0 ? submitMatches : ['submit_control_detected'],
      };
    }

    return {
      isConsequential: false,
      matchedPatterns: [],
    };
  }

  /**
   * Evaluates if an element functions as a form submit button
   */
  private isSubmitControl(element?: ScannedElement, text?: string): boolean {
    if (!element) return false;

    // Type attribute check
    if (element.type?.toLowerCase() === 'submit') {
      return true;
    }

    // Tag and form association
    if (
      element.tagName === 'button' &&
      element.safetyMetadata?.isInsideForm &&
      (!element.type || element.type === 'submit')
    ) {
      return true;
    }

    // ARIA role button inside form with submit text
    if (element.role === 'button' && element.safetyMetadata?.isInsideForm) {
      if (text && /(submit|sign in|login|register|checkout|apply)/i.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluates if element is a sensitive field (password, OTP, CVV, SSN)
   */
  private isSensitiveField(element?: ScannedElement): boolean {
    if (!element) return false;

    if (element.type?.toLowerCase() === 'password') {
      return true;
    }

    const testStr =
      `${element.name || ''} ${element.elementId || ''} ${element.placeholder || ''}`.toLowerCase();
    return /(password|passwd|otp|pin|cvv|cvc|ssn|credit[-_]?card|card[-_]?number)/i.test(testStr);
  }

  /**
   * Helper that extracts matching keywords from text
   */
  private extractMatches(text: string, patterns: string[]): string[] {
    const normText = text.toLowerCase();
    const matches: string[] = [];
    for (const pattern of patterns) {
      const normPattern = pattern.toLowerCase();
      if (normText.includes(normPattern)) {
        matches.push(pattern);
      }
    }
    return matches;
  }
}

export const consequentialActionService = new ConsequentialActionService();
