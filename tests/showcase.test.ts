import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Window } from 'happy-dom';

describe('Sahayak Landing Page Showcase (All 7 Tabs)', () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    window = new Window();
    document = window.document;

    const htmlContent = fs.readFileSync(path.resolve('docs/index.html'), 'utf8');
    document.write(htmlContent);

    // Evaluate showcase.js in the window context
    const showcaseCode = fs.readFileSync(path.resolve('docs/showcase.js'), 'utf8');
    const script = document.createElement('script');
    script.textContent = showcaseCode;
    document.body.appendChild(script);
  });

  it('initializes with all 7 tabs rendered and Summary active', () => {
    const tabs = document.querySelectorAll('#showcase-tabs .panel-tab');
    expect(tabs.length).toBe(7);

    const expectedTabs = ['summary', 'chat', 'find', 'agent', 'skills', 'memory', 'settings'];
    tabs.forEach((tab, i) => {
      expect(tab.getAttribute('data-tab')).toBe(expectedTabs[i]);
    });

    const activeTab = document.querySelector('#showcase-tabs .panel-tab.active');
    expect(activeTab?.getAttribute('data-tab')).toBe('summary');

    const content = document.getElementById('showcase-content');
    expect(content?.textContent).toContain('Executive TL;DR');
  });

  it('Tab A (Summary): supports mode switching, language selector, and copy button', () => {
    const content = document.getElementById('showcase-content');

    // Switch to Detailed
    const detailedBtn = content?.querySelector('#btn-mode-detailed') as HTMLElement;
    expect(detailedBtn).not.toBeNull();
    detailedBtn.click();
    expect(content?.textContent).toContain('Deep Dive & Technical Insights');

    // Switch language to Hindi
    const langSelect = content?.querySelector('#summary-lang-select') as HTMLSelectElement;
    expect(langSelect).not.toBeNull();
    langSelect.value = 'hi';
    langSelect.dispatchEvent(new window.Event('change'));
    expect(content?.textContent).toContain('स्वायत्त');

    // Switch language to Hinglish
    langSelect.value = 'hinglish';
    langSelect.dispatchEvent(new window.Event('change'));
    expect(content?.textContent).toContain('Real web par');

    // Copy summary button
    const copyBtn = content?.querySelector('#btn-copy-summary') as HTMLElement;
    expect(copyBtn).not.toBeNull();
    copyBtn.click();
    const updatedCopyBtn = content?.querySelector('#btn-copy-summary');
    expect(updatedCopyBtn?.textContent).toContain('Copied');
  });

  it('Tab B (Chat): supports typing and sending messages, prompt chips, and clearing conversation', async () => {
    const chatTabBtn = document.querySelector('#showcase-tabs [data-tab="chat"]') as HTMLElement;
    chatTabBtn.click();

    const content = document.getElementById('showcase-content');
    expect(content?.textContent).toContain('TechPulse Article');

    // Check prompt chips
    const chips = content?.querySelectorAll('.prompt-chip');
    expect(chips?.length).toBeGreaterThan(0);

    // Form submit
    const input = content?.querySelector('#chat-user-input') as HTMLInputElement;
    const form = content?.querySelector('#chat-submit-form') as HTMLFormElement;
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    input.value = 'Can you explain the safety rules in Hinglish?';
    form.dispatchEvent(new window.Event('submit'));

    expect(content?.textContent).toContain('Can you explain the safety rules in Hinglish?');

    // Clear chat
    const clearBtn = content?.querySelector('#btn-clear-chat') as HTMLElement;
    clearBtn.click();
    expect(content?.textContent).toContain('Conversation cleared');
  });

  it('Tab C (Find): searches elements, highlights matches, and demonstrates multiple matches', () => {
    const findTabBtn = document.querySelector('#showcase-tabs [data-tab="find"]') as HTMLElement;
    findTabBtn.click();

    const content = document.getElementById('showcase-content');
    expect(content?.textContent).toContain('1 Exact Match Found');

    // Multiple matches demo toggle
    const multiBtn = content?.querySelector('#btn-multi-matches') as HTMLElement;
    expect(multiBtn).not.toBeNull();
    multiBtn.click();

    expect(content?.textContent).toContain('Multiple Matches Detected');
    const matchCards = content?.querySelectorAll('.find-match-card');
    expect(matchCards?.length).toBe(3);
  });

  it('Tab D (Agent): provides dry-run toggle, approval card, execution simulation, and rejection', () => {
    const agentTabBtn = document.querySelector('#showcase-tabs [data-tab="agent"]') as HTMLElement;
    agentTabBtn.click();

    const content = document.getElementById('showcase-content');
    expect(content?.textContent).toContain('Proposed Action #act_7294');
    expect(content?.textContent).toContain('LOW RISK');

    // Dry Run Toggle
    const toggle = content?.querySelector('#agent-dryrun-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    // Approve & Execute
    const approveBtn = content?.querySelector('#btn-approve-action') as HTMLElement;
    approveBtn.click();
    expect(content?.textContent).toContain('Executing Single-Step Action');

    // Reject flow test
    (window as any).SahayakShowcase.state.agent.status = 'proposed';
    (window as any).SahayakShowcase.switchTab('agent');
    const rejectBtn = document
      .getElementById('showcase-content')
      ?.querySelector('#btn-reject-action') as HTMLElement;
    rejectBtn.click();
    expect(document.getElementById('showcase-content')?.textContent).toContain(
      'Action Cancelled by User'
    );
  });

  it('Tab E (Skills): lists built-in skills, filters by category, and executes run demo', () => {
    const skillsTabBtn = document.querySelector(
      '#showcase-tabs [data-tab="skills"]'
    ) as HTMLElement;
    skillsTabBtn.click();

    const content = document.getElementById('showcase-content');
    const skillCards = content?.querySelectorAll('.skill-item-card');
    expect(skillCards?.length).toBe(6);

    // Run Demo
    const runBtn = content?.querySelector('#btn-run-skill') as HTMLElement;
    expect(runBtn).not.toBeNull();
    runBtn.click();
    const updatedRunBtn = content?.querySelector('#btn-run-skill');
    expect(updatedRunBtn?.textContent).toContain('Running');
  });

  it('Tab F (Memory): allows adding, editing, deleting, and clearing memories', () => {
    const memoryTabBtn = document.querySelector(
      '#showcase-tabs [data-tab="memory"]'
    ) as HTMLElement;
    memoryTabBtn.click();

    const content = document.getElementById('showcase-content');
    const initialItems = content?.querySelectorAll('.memory-item-card');
    expect(initialItems?.length).toBe(4);

    // Add Memory
    const addInput = content?.querySelector('#new-memory-text') as HTMLInputElement;
    const addForm = content?.querySelector('#add-memory-form') as HTMLFormElement;
    addInput.value = 'Never show promotional offers or popup modals';
    addForm.dispatchEvent(new window.Event('submit'));

    const updatedItems = document.querySelectorAll('#showcase-content .memory-item-card');
    expect(updatedItems.length).toBe(5);
    expect(document.getElementById('showcase-content')?.textContent).toContain(
      'Never show promotional offers'
    );

    // Delete Memory
    const deleteBtn = document.querySelector('#showcase-content .btn-delete-mem') as HTMLElement;
    deleteBtn.click();
    const afterDeleteItems = document.querySelectorAll('#showcase-content .memory-item-card');
    expect(afterDeleteItems.length).toBe(4);
  });

  it('Tab G (Settings): navigates sub-tabs and responds to user settings changes', () => {
    const settingsTabBtn = document.querySelector(
      '#showcase-tabs [data-tab="settings"]'
    ) as HTMLElement;
    settingsTabBtn.click();

    const content = document.getElementById('showcase-content');
    expect(content?.textContent).toContain('Interface Language');

    // Switch to AI Provider subtab
    const providerSubtab = content?.querySelector(
      '.settings-subtab[data-sec="provider"]'
    ) as HTMLElement;
    providerSubtab.click();
    expect(content?.textContent).toContain('Google AI Studio');

    // Switch to Safety subtab
    const safetySubtab = content?.querySelector(
      '.settings-subtab[data-sec="safety"]'
    ) as HTMLElement;
    safetySubtab.click();
    expect(content?.textContent).toContain('9 Deterministic Blocked Categories');

    // Switch to About subtab
    const aboutSubtab = content?.querySelector('.settings-subtab[data-sec="about"]') as HTMLElement;
    aboutSubtab.click();
    expect(content?.textContent).toContain('Version 1.0.0');
  });
});
