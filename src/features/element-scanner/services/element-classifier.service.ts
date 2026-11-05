/**
 * Sahayak Element Classification Service
 * Analyzes semantic HTML, WAI-ARIA roles, attributes, surrounding context,
 * and text cues to categorize interactive elements into functional buckets.
 */

import { ElementCategory } from '../types/element-scanner.types';

export class ElementClassifierService {
  private readonly PRIMARY_KEYWORDS = [
    'submit',
    'sign in',
    'signin',
    'log in',
    'login',
    'sign up',
    'signup',
    'register',
    'save',
    'confirm',
    'continue',
    'next',
    'checkout',
    'buy now',
    'pay',
    'apply',
    'start',
    'create',
    'post',
    'send',
    'publish',
    'proceed',
    'book',
    'download',
    'complete',
    'order',
    'join',
  ];

  private readonly SECONDARY_KEYWORDS = [
    'cancel',
    'dismiss',
    'close',
    'reset',
    'reject',
    'decline',
    'skip',
    'clear',
    'back',
    'return',
    'undo',
    'no thanks',
    'not now',
  ];

  private readonly SEARCH_KEYWORDS = ['search', 'query', 'find', 'khoj', 'dhoondho', 'lookup'];

  private readonly MEDIA_KEYWORDS = [
    'play',
    'pause',
    'mute',
    'unmute',
    'volume',
    'fullscreen',
    'seek',
    'scrub',
    'rewind',
    'forward',
    'replay',
    'playback',
    'caption',
    'subtitles',
  ];

  /**
   * Classifies an element based on tag, attributes, text, and contextual DOM ancestors.
   */
  public classifyElement(element: Element, label: string): ElementCategory {
    const tag = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    const role = (element.getAttribute('role') || '').toLowerCase();
    const lowerLabel = label.toLowerCase();
    const name = (element.getAttribute('name') || '').toLowerCase();
    const id = (element.getAttribute('id') || '').toLowerCase();
    const className = (
      typeof element.className === 'string' ? element.className : ''
    ).toLowerCase();

    // 1. Check Search Fields
    if (this.isSearchField(element, tag, type, role, lowerLabel, name, id, className)) {
      return 'search-field';
    }

    // 2. Check Media Controls
    if (this.isMediaControl(element, tag, role, lowerLabel, className)) {
      return 'media-control';
    }

    // 3. Check Form Inputs (excluding search fields already filtered)
    if (this.isFormInput(element, tag, type, role)) {
      return 'form-input';
    }

    // 4. Check Navigation
    if (this.isNavigation(element, tag, role, lowerLabel, className)) {
      return 'navigation';
    }

    // 5. Check Secondary Actions (cancel, reset, dismiss, close)
    if (this.isSecondaryAction(type, role, lowerLabel, className)) {
      return 'secondary-action';
    }

    // 6. Check Primary Actions (submit, CTA, save, purchase)
    if (this.isPrimaryAction(type, role, lowerLabel, className)) {
      return 'primary-action';
    }

    // 7. General button fallback: buttons without primary/secondary keywords
    if (tag === 'button' || role === 'button' || type === 'button') {
      return 'primary-action';
    }

    return 'other';
  }

  private isSearchField(
    element: Element,
    tag: string,
    type: string,
    role: string,
    label: string,
    name: string,
    id: string,
    className: string
  ): boolean {
    if (type === 'search' || role === 'searchbox') {
      return true;
    }

    if (tag === 'input') {
      const matchKeywords = (str: string) => this.SEARCH_KEYWORDS.some((kw) => str.includes(kw));

      if (matchKeywords(name) || matchKeywords(id) || matchKeywords(label)) {
        return true;
      }

      // Check placeholder or aria-label
      const placeholder = (element.getAttribute('placeholder') || '').toLowerCase();
      if (matchKeywords(placeholder)) {
        return true;
      }

      // Check enclosing search form
      if (element.closest('form[role="search"], form.search-form, .search-container, .searchbox')) {
        return true;
      }
    }

    // Buttons dedicated to search
    if (
      (tag === 'button' || role === 'button') &&
      this.SEARCH_KEYWORDS.some((kw) => label === kw)
    ) {
      if (className.includes('search') || element.closest('form[role="search"]')) {
        return true;
      }
    }

    return false;
  }

  private isMediaControl(
    element: Element,
    tag: string,
    role: string,
    label: string,
    className: string
  ): boolean {
    // Inside video or audio player container
    const isInsidePlayer = Boolean(
      element.closest(
        'video, audio, .video-js, .player, [data-media-player], .ytp-chrome-controls, .media-player'
      )
    );

    const matchesMediaKeyword = this.MEDIA_KEYWORDS.some((kw) => label.includes(kw));

    if (isInsidePlayer && (tag === 'button' || role === 'button' || role === 'slider')) {
      return true;
    }

    if (
      matchesMediaKeyword &&
      (tag === 'button' || role === 'button' || className.includes('play'))
    ) {
      return true;
    }

    return false;
  }

  private isFormInput(element: Element, tag: string, type: string, role: string): boolean {
    if (tag === 'textarea' || tag === 'select') {
      return true;
    }

    if (tag === 'input') {
      // Exclude button inputs which are action elements
      if (['button', 'submit', 'reset', 'image'].includes(type)) {
        return false;
      }
      return true;
    }

    if (
      [
        'textbox',
        'combobox',
        'checkbox',
        'radio',
        'switch',
        'listbox',
        'slider',
        'spinbutton',
      ].includes(role)
    ) {
      return true;
    }

    if (element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    return false;
  }

  private isNavigation(
    element: Element,
    tag: string,
    role: string,
    label: string,
    className: string
  ): boolean {
    if (tag === 'a' && element.hasAttribute('href')) {
      return true;
    }

    if (role === 'link' || role === 'tab') {
      return true;
    }

    // Elements inside <nav>, navigation menus, breadcrumbs, or pagination
    if (element.closest('nav, [role="navigation"], .navbar, .pagination, .breadcrumb, .nav-menu')) {
      // If it's a link or clickable nav item
      if (tag === 'a' || role === 'button' || role === 'menuitem' || tag === 'button') {
        return true;
      }
    }

    if (
      className.includes('nav-item') ||
      className.includes('pagination') ||
      className.includes('breadcrumb')
    ) {
      return true;
    }

    if (['next page', 'previous page', 'prev', 'next', 'back to top'].includes(label)) {
      return true;
    }

    return false;
  }

  private isSecondaryAction(
    type: string,
    _role: string,
    label: string,
    className: string
  ): boolean {
    if (type === 'reset') {
      return true;
    }

    if (this.SECONDARY_KEYWORDS.some((kw) => label.includes(kw))) {
      return true;
    }

    if (
      className.includes('btn-secondary') ||
      className.includes('btn-outline') ||
      className.includes('btn-cancel') ||
      className.includes('btn-ghost') ||
      className.includes('secondary')
    ) {
      return true;
    }

    return false;
  }

  private isPrimaryAction(type: string, _role: string, label: string, className: string): boolean {
    if (type === 'submit') {
      return true;
    }

    if (this.PRIMARY_KEYWORDS.some((kw) => label.includes(kw))) {
      return true;
    }

    if (
      className.includes('btn-primary') ||
      className.includes('cta') ||
      className.includes('btn-main') ||
      className.includes('action-primary') ||
      className.includes('btn-success')
    ) {
      return true;
    }

    return false;
  }
}

export const elementClassifierService = new ElementClassifierService();
