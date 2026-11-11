/**
 * Sahayak Landing Page Showcase Engine
 * Powers the interactive 7-tab browser preview demonstration:
 * 1. Summary  2. Chat  3. Find  4. Agent  5. Skills  6. Memory  7. Settings
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Showcase State & Demo Data
  // ---------------------------------------------------------------------------
  const state = {
    activeTab: 'summary', // 'summary' | 'chat' | 'find' | 'agent' | 'skills' | 'memory' | 'settings'

    summary: {
      mode: 'quick', // 'quick' | 'detailed'
      language: 'en', // 'en' | 'hi' | 'hinglish'
      isAnalyzing: false,
      copied: false,
    },

    chat: {
      messages: [
        {
          id: 1,
          sender: 'user',
          text: 'What are the main benefits of using Sahayak over autonomous AI browser agents?',
        },
        {
          id: 2,
          sender: 'assistant',
          text: 'Autonomous agents can hallucinate clicks, trigger unintended payments, or get stuck in infinite loops. Sahayak uses a **Single-Step Human-In-The-Loop** architecture: it plans one action at a time, shows you an **Approval Card**, and only executes once you click Approve. Plus, 9 critical categories (like payments and passwords) are completely blocked by code.',
        },
      ],
      isTyping: false,
    },

    find: {
      query: 'pricing section',
      selectedElementId: 'pricing-tier',
      isClarifying: false,
      clarificationList: [
        {
          id: 'signup-btn',
          tag: 'button.btn-primary',
          name: 'Start Free Trial CTA',
          desc: 'Hero section primary onboarding trigger',
        },
        {
          id: 'read-docs-btn',
          tag: 'a.btn-secondary',
          name: 'Read Documentation Link',
          desc: 'Navigation link to architecture docs',
        },
        {
          id: 'contact-sales-btn',
          tag: 'button.btn-outline',
          name: 'Contact Sales Button',
          desc: 'Enterprise inquiry form trigger',
        },
      ],
    },

    agent: {
      status: 'proposed', // 'proposed' | 'executing' | 'completed' | 'rejected'
      dryRun: true,
      lastAction: null,
      stepProgress: 0,
    },

    skills: {
      category: 'all',
      search: '',
      activeSkillId: 'quick-summary',
      isRunning: false,
      output: null,
    },

    memory: {
      personalization: true,
      suggestions: true,
      category: 'all',
      search: '',
      memories: [
        {
          id: 'm1',
          category: 'language',
          text: 'Prefer Hinglish for conversational and casual web explanations',
        },
        {
          id: 'm2',
          category: 'content',
          text: 'Always format article summaries with key takeaways and actionable next steps',
        },
        {
          id: 'm3',
          category: 'interaction',
          text: 'Default to concise bullet-point answers over lengthy paragraphs',
        },
        {
          id: 'm4',
          category: 'workflow',
          text: 'Target technical depth: Senior Software Engineer / Solutions Architect',
        },
      ],
      editingId: null,
      showClearConfirm: false,
    },

    settings: {
      activeSection: 'general', // 'general' | 'provider' | 'safety' | 'about'
      language: 'auto',
      theme: localStorage.getItem('sahayak_theme') || 'dark',
      summaryStyle: 'verdict',
      summaryLength: 'balanced',
      primaryProvider: 'gemini-2.5-flash',
      fallbackProvider: 'groq-llama-3.3-70b',
      autoFallback: true,
      personalization: true,
      memorySuggestions: true,
      dryRun: true,
      notifications: true,
      testStatus: null,
    },
  };

  // ---------------------------------------------------------------------------
  // Demo Data Constants
  // ---------------------------------------------------------------------------
  const SKILLS_CATALOG = [
    {
      id: 'quick-summary',
      name: 'Quick Article Summary',
      category: 'Content Analysis',
      badge: 'CONTENT_ANALYSIS',
      desc: 'Extracts a one-line verdict and 3 high-impact takeaways from lengthy articles.',
      promptTemplate: 'Analyze this article and extract: 1. Executive TL;DR 2. 3 Key Takeaways.',
      targetAction: 'SUMMARIZE',
      sampleOutput: `📌 **Executive TL;DR**: Single-step approval is essential for safe browser agents.\n\nKey Takeaways:\n• 1. Eliminates autonomous runaway loops.\n• 2. Deterministic rules block 9 sensitive categories.\n• 3. Dual-provider cascade prevents 429 rate limit failures.`,
    },
    {
      id: 'detailed-analysis',
      name: 'Detailed Article Analysis',
      category: 'Content Analysis',
      badge: 'CONTENT_ANALYSIS',
      desc: 'Generates a 3-tier deep dive covering architecture, security rails, and latency tradeoffs.',
      promptTemplate:
        'Produce an exhaustive architectural breakdown of this page with pros, cons, and performance scores.',
      targetAction: 'DEEP_DIVE',
      sampleOutput: `📑 **Architectural Breakdown**:\n\n1. **DOM Traversal**: Uses Mozilla Readability to strip ads and extract pure article text.\n2. **Security**: Enforces cryptographic single-use tokens expiring in 60s.\n3. **Latency**: Sub-140ms first-token streaming via Gemini Flash.`,
    },
    {
      id: 'explain-page',
      name: 'Explain This Page',
      category: 'Explanation',
      badge: 'EXPLANATION',
      desc: 'Breaks down complex technical jargon, contracts, or documentation into simple terms.',
      promptTemplate:
        'Explain what this page is offering as if talking to a non-technical founder.',
      targetAction: 'EXPLAIN',
      sampleOutput: `💡 **Plain English Explanation**:\nThis page is pitching high-performance cloud servers for enterprise software. Think of it like renting a dedicated private highway instead of sharing public roads with everyone else.`,
    },
    {
      id: 'extract-info',
      name: 'Extract Key Information',
      category: 'Data Extraction',
      badge: 'DATA_EXTRACTION',
      desc: 'Scans the active webpage for pricing tables, contact points, and technical specifications.',
      promptTemplate:
        'Locate all pricing tiers, features, and limits on this page and format them into structured JSON.',
      targetAction: 'EXTRACT_DATA',
      sampleOutput: `{\n  "tiers": [\n    { "name": "Developer", "price": "$0/mo", "sla": "Community" },\n    { "name": "Enterprise Cluster", "price": "$499/mo", "sla": "99.99%" }\n  ]\n}`,
    },
    {
      id: 'youtube-summary',
      name: 'YouTube Key Takeaways',
      category: 'Media',
      badge: 'MEDIA',
      desc: 'Parses public video transcripts and generates timestamped notes with clickable links.',
      promptTemplate: 'Summarize this video into timestamped sections and key conclusions.',
      targetAction: 'YOUTUBE_SUMMARY',
      sampleOutput: `🎬 **Video Breakdown**:\n\n• [00:15] Introduction to Manifest V3 Agents\n• [02:40] Why Autonomous Browsing Fails\n• [05:12] Single-Step HITL Architecture Demo\n• [08:35] Zero Telemetry & Local Storage Guarantee`,
    },
    {
      id: 'improve-text',
      name: 'Improve Selected Text',
      category: 'Writing',
      badge: 'TEXT_IMPROVEMENT',
      desc: 'Polishes selected text for clarity, conciseness, professional tone, and grammatical accuracy.',
      promptTemplate:
        'Rewrite this selected paragraph to sound professional, crisp, and persuasive.',
      targetAction: 'REWRITE',
      sampleOutput: `✨ **Polished Version**:\n"By integrating human-in-the-loop validation with deterministic safety controls, Sahayak eliminates autonomous failure modes while streamlining routine web research."`,
    },
  ];

  // ---------------------------------------------------------------------------
  // Main Showcase Init
  // ---------------------------------------------------------------------------
  function initShowcase() {
    const tabsContainer = document.getElementById('showcase-tabs');
    if (!tabsContainer) return;

    // Attach click listeners to tabs
    tabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.panel-tab');
      if (!btn) return;
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab && targetTab !== state.activeTab) {
        switchTab(targetTab);
      }
    });

    // Render initial state
    renderAll();
  }

  function switchTab(tabName) {
    state.activeTab = tabName;

    // Update active tab button
    const tabs = document.querySelectorAll('#showcase-tabs .panel-tab');
    tabs.forEach((tab) => {
      const match = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('active', match);
      tab.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    renderAll();
  }

  function renderAll() {
    renderAddressBar();
    renderWebpageViewport();
    renderSidepanelContent();
  }

  // ---------------------------------------------------------------------------
  // Browser Address Bar
  // ---------------------------------------------------------------------------
  function renderAddressBar() {
    const bar = document.getElementById('browser-address-bar');
    if (!bar) return;

    const urls = {
      summary: 'https://techpulse.dev/articles/rise-of-user-controlled-browser-agents',
      chat: 'https://techpulse.dev/articles/rise-of-user-controlled-browser-agents',
      find: 'https://techpulse.dev/articles/rise-of-user-controlled-browser-agents#pricing',
      agent: 'https://example.com/checkout-preview/order-summary',
      skills: 'https://sahayak.local/skills-catalog',
      memory: 'https://sahayak.local/user-profile-memory',
      settings: 'https://sahayak.local/settings',
    };

    bar.textContent =
      urls[state.activeTab] ||
      'https://techpulse.dev/articles/rise-of-user-controlled-browser-agents';
  }

  // ---------------------------------------------------------------------------
  // Simulated Webpage Viewport (Left Side)
  // ---------------------------------------------------------------------------
  function renderWebpageViewport() {
    const viewport = document.getElementById('showcase-webpage-viewport');
    if (!viewport) return;

    switch (state.activeTab) {
      case 'summary':
      case 'chat':
        renderArticleWebpage(viewport);
        break;
      case 'find':
        renderFindWebpage(viewport);
        break;
      case 'agent':
        renderAgentWebpage(viewport);
        break;
      case 'skills':
        renderSkillsWebpage(viewport);
        break;
      case 'memory':
        renderMemoryWebpage(viewport);
        break;
      case 'settings':
        renderSettingsWebpage(viewport);
        break;
      default:
        renderArticleWebpage(viewport);
    }
  }

  function renderArticleWebpage(viewport) {
    viewport.innerHTML = `
      <div class="demo-webpage-content">
        <div class="webpage-meta-badge">
          <span class="badge badge-blue">TechPulse Analysis</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">5 min read • Published Today</span>
        </div>
        <h3 class="webpage-headline">The Rise of User-Controlled AI Browser Agents</h3>
        <p class="webpage-subhead">Why unconstrained autonomous loops fail on the real web, and how Human-In-The-Loop architecture guarantees deterministic safety.</p>
        
        <div class="webpage-author-row">
          <div class="author-avatar">SC</div>
          <div>
            <strong>Sarah Chen</strong>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">Principal AI Systems Architect, TechPulse</div>
          </div>
        </div>

        <div class="webpage-body-para">
          Autonomous browser agents promised to browse the web for us. Yet on the live internet, unconstrained loops frequently hallucinate button clicks, submit incorrect forms, or trigger unintended checkout actions.
        </div>

        <div class="webpage-highlight-box ${state.activeTab === 'chat' ? 'chat-grounded-pulse' : ''}">
          <strong>💡 Core Architectural Breakthrough:</strong>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem;">
            Instead of executing multiple steps in a dark box, the <strong>Single-Step Loop</strong> presents an explicit <strong>Approval Card</strong> before every mutation, ensuring human control with zero runaway risks.
          </p>
        </div>

        <h4 style="margin: 1.25rem 0 0.5rem 0; font-size: 1.05rem;">Deterministic Safety Boundaries</h4>
        <div class="webpage-body-para">
          Sahayak enforces 9 deterministic blocked categories at the TypeScript AST layer. Payments, bank transfers, password inputs, and final checkout triggers cannot be automated, regardless of AI prompts.
        </div>

        <div id="pricing-tier" class="webpage-mock-card ${state.find.selectedElementId === 'pricing-tier' && state.activeTab === 'find' ? 'highlighted-element' : ''}" style="margin-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong style="color: var(--accent-blue);">Enterprise Dedicated Cluster</strong>
            <span class="badge badge-green">$499 / mo</span>
          </div>
          <p style="font-size: 0.8rem; margin: 0; color: var(--text-secondary);">
            Isolated VPC container, 99.99% uptime SLA, and human-supervised browser agent API access.
          </p>
        </div>
      </div>
    `;
  }

  function renderFindWebpage(viewport) {
    viewport.innerHTML = `
      <div class="demo-webpage-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge badge-blue">Live DOM Scanner Active</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Shadow DOM Traversal</span>
        </div>

        <h3 class="webpage-headline">Interactive Element Selection Target</h3>
        <p class="webpage-subhead">Sahayak scans and indexes interactive elements with CSS selectors and natural-language embeddings.</p>

        <!-- Element 1: Pricing Tier -->
        <div id="pricing-tier" class="webpage-mock-card ${state.find.selectedElementId === 'pricing-tier' ? 'highlighted-element' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong style="color: var(--accent-blue);">Enterprise Dedicated Cluster</strong>
            <span class="element-tag-badge">&lt;section#pricing&gt;</span>
          </div>
          <p style="font-size: 0.8rem; margin: 0; color: var(--text-secondary);">
            Targeted pricing table containing subscription specs and SLAs.
          </p>
        </div>

        <!-- Element 2: Primary CTA Button -->
        <div id="signup-btn" class="webpage-mock-card ${state.find.selectedElementId === 'signup-btn' ? 'highlighted-element' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong>Start 14-Day Free Trial</strong>
            <span class="element-tag-badge">&lt;button#signup-btn.btn-primary&gt;</span>
          </div>
          <p style="font-size: 0.8rem; margin: 0; color: var(--text-secondary);">
            Primary onboarding action button with mouseup trigger.
          </p>
        </div>

        <!-- Element 3: Documentation Link -->
        <div id="read-docs-btn" class="webpage-mock-card ${state.find.selectedElementId === 'read-docs-btn' ? 'highlighted-element' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong>Read Architecture Whitepaper</strong>
            <span class="element-tag-badge">&lt;a.btn-secondary&gt;</span>
          </div>
          <p style="font-size: 0.8rem; margin: 0; color: var(--text-secondary);">
            Technical documentation link pointing to Manifest V3 implementation specs.
          </p>
        </div>

        <!-- Element 4: Contact Sales Button -->
        <div id="contact-sales-btn" class="webpage-mock-card ${state.find.selectedElementId === 'contact-sales-btn' ? 'highlighted-element' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong>Contact Enterprise Sales</strong>
            <span class="element-tag-badge">&lt;button#contact-btn&gt;</span>
          </div>
          <p style="font-size: 0.8rem; margin: 0; color: var(--text-secondary);">
            Sales inquiry trigger with custom calendar scheduling overlay.
          </p>
        </div>
      </div>
    `;
  }

  function renderAgentWebpage(viewport) {
    const isCompleted = state.agent.status === 'completed';
    viewport.innerHTML = `
      <div class="demo-webpage-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge ${isCompleted ? 'badge-green' : 'badge-blue'}">
            ${isCompleted ? '✓ Mutation Executed & Verified' : 'Awaiting Human Approval'}
          </span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            ${state.agent.dryRun ? '🛡️ Dry-Run Mode Active' : 'Live Mode'}
          </span>
        </div>

        <h3 class="webpage-headline">SaaS Checkout & Configuration Page</h3>
        <p class="webpage-subhead">Simulated enterprise checkout preview with interactive form targets.</p>

        <div id="coupon-field-card" class="webpage-mock-card ${isCompleted ? 'highlighted-success' : 'highlighted-element'}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong>Target Input: Promo / Coupon Code</strong>
            <span class="element-tag-badge">&lt;input#promo-code&gt;</span>
          </div>
          <div class="mock-input-preview">
            <span style="color: ${isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'}; font-family: var(--font-mono);">
              ${isCompleted ? 'SAVE20' : 'Enter discount code...'}
            </span>
            ${isCompleted ? '<span class="badge badge-green" style="font-size: 0.7rem;">Applied (-20%)</span>' : ''}
          </div>
          <p style="font-size: 0.75rem; margin-top: 0.5rem; color: var(--text-secondary);">
            ${isCompleted ? '✅ Single-use token tok_8f91a27 consumed. Value populated in 38ms.' : '⏳ Pending approval on Approval Card.'}
          </p>
        </div>

        <div class="webpage-mock-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong>Enterprise Cluster Subscription</strong>
            <span>$499.00 / mo</span>
          </div>
          ${isCompleted ? '<div style="display:flex; justify-content:space-between; color:#10b981; font-size:0.85rem;"><span>Discount (SAVE20):</span><span>-$99.80</span></div>' : ''}
          <div style="border-top: 1px solid var(--border-color); margin-top: 0.5rem; padding-top: 0.5rem; display: flex; justify-content: space-between; font-weight: 700;">
            <span>Total:</span>
            <span>${isCompleted ? '$399.20 / mo' : '$499.00 / mo'}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSkillsWebpage(viewport) {
    const activeSkill =
      SKILLS_CATALOG.find((s) => s.id === state.skills.activeSkillId) || SKILLS_CATALOG[0];
    viewport.innerHTML = `
      <div class="demo-webpage-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge badge-blue">Reusable Skills Sandbox</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">JSON Skill Templates</span>
        </div>

        <h3 class="webpage-headline">${activeSkill.name}</h3>
        <p class="webpage-subhead">${activeSkill.desc}</p>

        <div class="webpage-mock-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong style="font-size: 0.85rem;">Skill Definition Manifest</strong>
            <span class="badge badge-indigo">${activeSkill.badge}</span>
          </div>
          <pre class="demo-code-block"><code>{
  "id": "${activeSkill.id}",
  "name": "${activeSkill.name}",
  "category": "${activeSkill.category}",
  "targetAction": "${activeSkill.targetAction}",
  "promptTemplate": "${activeSkill.promptTemplate}"
}</code></pre>
        </div>

        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 0.85rem;">
          <strong style="color: #a5b4fc; font-size: 0.85rem;">⚡ One-Click Execution Guarantee</strong>
          <p style="font-size: 0.8rem; margin: 0.25rem 0 0 0; color: var(--text-secondary);">
            Skills are composable JSON definitions stored in <code>chrome.storage.local</code>. Click <strong>Run Demo</strong> in the side panel to execute this skill against the current page.
          </p>
        </div>
      </div>
    `;
  }

  function renderMemoryWebpage(viewport) {
    viewport.innerHTML = `
      <div class="demo-webpage-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge badge-green">Profile Memory Active</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Zero Cloud Sync • Local-First</span>
        </div>

        <h3 class="webpage-headline">Personalized Web Assistant Experience</h3>
        <p class="webpage-subhead">Sahayak adapts summaries and conversations to your habits without transmitting tracking data.</p>

        <div class="webpage-highlight-box" style="border-color: rgba(16, 185, 129, 0.4);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span style="font-size: 1.1rem;">🧠</span>
            <strong style="color: #34d399;">Active Context Personalization:</strong>
          </div>
          <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.8rem; color: var(--text-secondary);">
            <li>Language style: <strong>Hinglish Code-Mixing</strong> enabled</li>
            <li>Summary depth: <strong>3 Key Takeaways + Action Items</strong></li>
            <li>Tone: <strong>Senior Software Engineer / Technical Depth</strong></li>
          </ul>
        </div>

        <div class="webpage-mock-card" style="margin-top: 1rem;">
          <strong>🔒 Privacy & Telemetry Guarantee</strong>
          <p style="font-size: 0.8rem; margin: 0.25rem 0 0 0; color: var(--text-secondary);">
            All extracted memories are kept exclusively inside your browser's <code>chrome.storage.local</code>. You can search, edit, disable, or delete them anytime.
          </p>
        </div>
      </div>
    `;
  }

  function renderSettingsWebpage(viewport) {
    viewport.innerHTML = `
      <div class="demo-webpage-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge badge-blue">Extension Control Plane</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Chrome MV3 • v1.0.0</span>
        </div>

        <h3 class="webpage-headline">Sahayak Diagnostic & Configuration</h3>
        <p class="webpage-subhead">Live status of your local AI providers, deterministic security gates, and storage allocation.</p>

        <div class="settings-diagnostics-grid">
          <div class="diag-card">
            <div class="diag-header">
              <span class="diag-title">Primary AI Model</span>
              <span class="badge badge-green">Online</span>
            </div>
            <div class="diag-val">Google Gemini 2.5 Flash</div>
            <div class="diag-meta">112ms round-trip ping • Streaming enabled</div>
          </div>

          <div class="diag-card">
            <div class="diag-header">
              <span class="diag-title">Fallback Provider</span>
              <span class="badge badge-indigo">Ready</span>
            </div>
            <div class="diag-val">Groq LLaMA 3.3 70B</div>
            <div class="diag-meta">Auto-failover on HTTP 429 rate limit</div>
          </div>

          <div class="diag-card">
            <div class="diag-header">
              <span class="diag-title">Local Storage</span>
              <span class="badge badge-blue">Optimal</span>
            </div>
            <div class="diag-val">14.2 KB / 5,120 KB</div>
            <div class="diag-meta">Encrypted in chrome.storage.local</div>
          </div>

          <div class="diag-card">
            <div class="diag-header">
              <span class="diag-title">Safety Boundaries</span>
              <span class="badge badge-green">9/9 Active</span>
            </div>
            <div class="diag-val">Code-Level AST Gates</div>
            <div class="diag-meta">Zero bypassable payment or checkout mutations</div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Side Panel Renderers (Right Side)
  // ---------------------------------------------------------------------------
  function renderSidepanelContent() {
    const container = document.getElementById('showcase-content');
    if (!container) return;

    switch (state.activeTab) {
      case 'summary':
        renderSummaryTab(container);
        break;
      case 'chat':
        renderChatTab(container);
        break;
      case 'find':
        renderFindTab(container);
        break;
      case 'agent':
        renderAgentTab(container);
        break;
      case 'skills':
        renderSkillsTab(container);
        break;
      case 'memory':
        renderMemoryTab(container);
        break;
      case 'settings':
        renderSettingsTab(container);
        break;
      default:
        renderSummaryTab(container);
    }
  }

  // ===========================================================================
  // 1. SUMMARY TAB
  // ===========================================================================
  function renderSummaryTab(container) {
    const { mode, language, isAnalyzing, copied } = state.summary;

    if (isAnalyzing) {
      container.innerHTML = `
        <div class="demo-loading-state">
          <div class="demo-spinner"></div>
          <strong>Re-analyzing page with Gemini Flash...</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Extracting readability nodes & computing takeaways...</span>
        </div>
      `;
      return;
    }

    // Texts for languages
    const content = {
      en: {
        verdict:
          'Autonomous browser agents fail without strict guardrails; Sahayak’s single-step Human-In-The-Loop architecture provides safe automation with zero unintended actions.',
        takeaways: [
          {
            icon: '⚡',
            title: 'Single-Step Loop',
            text: 'Proposes one verifiable action with single-use cryptographic tokens.',
          },
          {
            icon: '🛡️',
            title: 'Deterministic Safety',
            text: '9 categories (payments, passwords, checkout) are hard-blocked by code.',
          },
          {
            icon: '🧠',
            title: 'Local Profile Memory',
            text: 'Stores user preferences strictly in local browser storage with zero telemetry.',
          },
          {
            icon: '🔄',
            title: 'Dual Provider Cascade',
            text: 'Auto-fallback to Groq LLaMA prevents 429 rate limit outages.',
          },
        ],
        deepDive:
          'By stripping noisy DOM markup via Mozilla Readability, Sahayak reduces context token overhead by 68% while delivering structured, verifiable action proposals.',
      },
      hi: {
        verdict:
          'बिना मानवीय नियंत्रण के स्वायत्त एजेंट जोखिम भरे हैं; सहायक का सिंगल-स्टेप अप्रूवल आर्किटेक्चर सुरक्षित स्वचालन सुनिश्चित करता है।',
        takeaways: [
          {
            icon: '⚡',
            title: 'सिंगल-स्टेप लूप',
            text: 'एक समय में केवल एक सत्यापित क्रिया ही उपयोगकर्ता की अनुमति से निष्पादित होती है।',
          },
          {
            icon: '🛡️',
            title: 'कोड-स्तरीय सुरक्षा',
            text: 'भुगतान और संवेदनशील इनपुट फ़ील्ड को प्रोग्रामेटिक रूप से ब्लॉक किया गया है।',
          },
          {
            icon: '🧠',
            title: 'स्थानीय मेमोरी',
            text: 'सभी प्राथमिकताएं पूरी तरह से आपके डिवाइस में सुरक्षित रहती हैं।',
          },
          {
            icon: '🔄',
            title: 'डुअल प्रोवाइडर',
            text: 'जेमिनी में दर सीमा होने पर ग्रोक पर स्वचालित निर्बाध स्विचिंग।',
          },
        ],
        deepDive:
          'मोज़िला रीडेबिलिटी के माध्यम से लेख का मुख्य भाग निकाल कर सहायक 68% टोकन बचाता है और सटीक सारांश प्रस्तुत करता है।',
      },
      hinglish: {
        verdict:
          'Real web par autonomous agents bina human approval ke risky hain; Sahayak ka single-step approval model har action verify karwake total control provide karta hai.',
        takeaways: [
          {
            icon: '⚡',
            title: 'Single-Step Execution',
            text: 'Ek time pe ek action propose hota hai with single-use cryptographic token.',
          },
          {
            icon: '🛡️',
            title: 'Deterministic Safety',
            text: 'Payments aur checkout jaise 9 critical categories code-level pe locked hain.',
          },
          {
            icon: '🧠',
            title: 'Local Memory',
            text: 'User preferences purely aapke browser me rehti hain with zero cloud sync.',
          },
          {
            icon: '🔄',
            title: 'Dual-Provider Cascade',
            text: 'Gemini rate-limit hote hi Groq LLaMA models pe instant fallback.',
          },
        ],
        deepDive:
          'Noisy DOM ko Mozilla Readability se filter karke Sahayak 68% context tokens save karta hai aur accurate summaries generate karta hai.',
      },
    };

    const current = content[language] || content.en;

    container.innerHTML = `
      <!-- Controls Bar -->
      <div class="summary-controls-bar">
        <div class="demo-pill-group">
          <button type="button" class="demo-pill-btn ${mode === 'quick' ? 'active' : ''}" id="btn-mode-quick">⚡ Quick Summary</button>
          <button type="button" class="demo-pill-btn ${mode === 'detailed' ? 'active' : ''}" id="btn-mode-detailed">📋 Detailed Analysis</button>
        </div>

        <div class="demo-lang-select-wrap">
          <label for="summary-lang-select" class="sr-only">Summary Language</label>
          <select id="summary-lang-select" class="demo-select-sm">
            <option value="en" ${language === 'en' ? 'selected' : ''}>🇺🇸 English</option>
            <option value="hi" ${language === 'hi' ? 'selected' : ''}>🇮🇳 हिंदी</option>
            <option value="hinglish" ${language === 'hinglish' ? 'selected' : ''}>🗣️ Hinglish</option>
          </select>
        </div>
      </div>

      <!-- Verdict Box -->
      <div class="summary-verdict-box">
        <div class="summary-verdict-label">📌 Executive TL;DR</div>
        <p class="summary-verdict-text">${current.verdict}</p>
      </div>

      <!-- Key Takeaways -->
      <div class="summary-takeaways-wrap">
        <div class="summary-section-title">Key Takeaways (${current.takeaways.length})</div>
        <div class="summary-takeaways-list">
          ${current.takeaways
            .map(
              (t) => `
            <div class="takeaway-item">
              <span class="takeaway-icon">${t.icon}</span>
              <div>
                <strong>${t.title}:</strong> <span>${t.text}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Detailed Breakdown (Visible if mode === 'detailed') -->
      ${
        mode === 'detailed'
          ? `
        <div class="summary-deepdive-box">
          <div class="summary-section-title">Deep Dive & Technical Insights</div>
          <p style="font-size: 0.8rem; line-height: 1.5; margin: 0; color: var(--text-secondary);">${current.deepDive}</p>
        </div>
      `
          : ''
      }

      <!-- Action Footer -->
      <div class="summary-actions-footer">
        <button type="button" class="btn btn-primary btn-sm ${copied ? 'btn-copied' : ''}" id="btn-copy-summary">
          ${copied ? '✓ Copied to Clipboard!' : '📋 Copy Summary'}
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-reanalyze-summary">
          🔄 Re-analyze Page
        </button>
      </div>
    `;

    // Event Bindings
    document.getElementById('btn-mode-quick')?.addEventListener('click', () => {
      state.summary.mode = 'quick';
      renderSummaryTab(container);
    });

    document.getElementById('btn-mode-detailed')?.addEventListener('click', () => {
      state.summary.mode = 'detailed';
      renderSummaryTab(container);
    });

    document.getElementById('summary-lang-select')?.addEventListener('change', (e) => {
      state.summary.language = e.target.value;
      renderSummaryTab(container);
    });

    document.getElementById('btn-copy-summary')?.addEventListener('click', () => {
      const textToCopy = `Summary: ${current.verdict}\n\nTakeaways:\n${current.takeaways.map((t) => `• ${t.title}: ${t.text}`).join('\n')}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).catch(() => {});
      }
      state.summary.copied = true;
      renderSummaryTab(container);
      setTimeout(() => {
        state.summary.copied = false;
        renderSummaryTab(container);
      }, 2000);
    });

    document.getElementById('btn-reanalyze-summary')?.addEventListener('click', () => {
      state.summary.isAnalyzing = true;
      renderSummaryTab(container);
      setTimeout(() => {
        state.summary.isAnalyzing = false;
        renderSummaryTab(container);
      }, 700);
    });
  }

  // ===========================================================================
  // 2. CHAT TAB
  // ===========================================================================
  function renderChatTab(container) {
    const { messages, isTyping } = state.chat;

    container.innerHTML = `
      <!-- Chat Header Context -->
      <div class="chat-header-banner">
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="font-size: 0.9rem;">📄</span>
          <span style="font-size: 0.775rem; color: var(--text-secondary); font-weight: 500;">
            Grounded on: <strong>TechPulse Article</strong> (1,420 words)
          </span>
        </div>
        <button type="button" class="btn-text-action" id="btn-clear-chat" title="Clear Conversation">
          🗑️ Clear
        </button>
      </div>

      <!-- Quick Suggestion Chips -->
      <div class="chat-prompt-chips">
        <button type="button" class="prompt-chip" data-prompt="What is human-in-the-loop?">What is human-in-the-loop?</button>
        <button type="button" class="prompt-chip" data-prompt="Explain this in Hinglish">Explain in Hinglish</button>
        <button type="button" class="prompt-chip" data-prompt="Are my API keys private?">Are API keys private?</button>
      </div>

      <!-- Message History Scroll Area -->
      <div class="chat-messages-container" id="chat-messages-scroll">
        ${messages
          .map(
            (msg) => `
          <div class="chat-message-row ${msg.sender}">
            ${msg.sender === 'assistant' ? '<div class="chat-avatar">S</div>' : ''}
            <div class="chat-bubble ${msg.sender}">
              ${formatChatMarkdown(msg.text)}
            </div>
            ${msg.sender === 'user' ? '<div class="chat-avatar user">U</div>' : ''}
          </div>
        `
          )
          .join('')}

        ${
          isTyping
            ? `
          <div class="chat-message-row assistant">
            <div class="chat-avatar">S</div>
            <div class="chat-bubble assistant typing-bubble">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">Sahayak is thinking...</span>
            </div>
          </div>
        `
            : ''
        }
      </div>

      <!-- Chat Input Form -->
      <form class="chat-input-form" id="chat-submit-form">
        <input
          type="text"
          id="chat-user-input"
          class="chat-text-input"
          placeholder="Ask a question about this page..."
          autocomplete="off"
          ${isTyping ? 'disabled' : ''}
        />
        <button type="submit" class="btn btn-primary btn-sm btn-send" ${isTyping ? 'disabled' : ''}>
          <span>Send</span>
          <span>➤</span>
        </button>
      </form>
    `;

    // Scroll to bottom
    const scrollBox = document.getElementById('chat-messages-scroll');
    if (scrollBox) {
      scrollBox.scrollTop = scrollBox.scrollHeight;
    }

    // Bind prompt chips
    container.querySelectorAll('.prompt-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt');
        if (text) {
          sendChatMessage(text);
        }
      });
    });

    // Bind form submit
    const form = document.getElementById('chat-submit-form');
    const input = document.getElementById('chat-user-input');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input?.value.trim();
      if (val) {
        sendChatMessage(val);
        input.value = '';
      }
    });

    // Bind clear chat
    document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
      state.chat.messages = [
        {
          id: Date.now(),
          sender: 'assistant',
          text: 'Conversation cleared. What would you like to know about this page?',
        },
      ];
      renderChatTab(container);
    });
  }

  function sendChatMessage(text) {
    state.chat.messages.push({
      id: Date.now(),
      sender: 'user',
      text,
    });
    state.chat.isTyping = true;
    renderSidepanelContent();

    setTimeout(() => {
      const response = generateSmartAIResponse(text);
      state.chat.messages.push({
        id: Date.now() + 1,
        sender: 'assistant',
        text: response,
      });
      state.chat.isTyping = false;
      renderSidepanelContent();
    }, 700);
  }

  function generateSmartAIResponse(query) {
    const q = query.toLowerCase();

    if (q.includes('human') || q.includes('loop') || q.includes('approval') || q.includes('hitl')) {
      return 'Under the **Human-In-The-Loop** model, Sahayak never mutates browser state autonomously. It prepares an **Approval Card** showing the action name, target CSS selector, reason, and risk level. Execution only occurs after your explicit click, using a cryptographic single-use token.';
    }

    if (q.includes('hinglish') || q.includes('hindi') || q.includes('batao') || q.includes('kya')) {
      return 'Haan bilkul! Sahayak automatically detect kar leta hai jab aap Hinglish me prompt karte ho. Is page me main point ye hai ki autonomous browser agents risky hote hain, isliye Sahayak har step pe aapse confirmation leta hai through Approval Cards.';
    }

    if (
      q.includes('private') ||
      q.includes('key') ||
      q.includes('telemetry') ||
      q.includes('security')
    ) {
      return 'All preferences, action logs, profile memories, and API keys reside strictly inside your browser’s local `chrome.storage.local`. Sahayak collects **zero telemetry** and has zero intermediary proxy servers.';
    }

    if (
      q.includes('pricing') ||
      q.includes('cost') ||
      q.includes('tier') ||
      q.includes('enterprise')
    ) {
      return 'According to this article’s highlighted section, the Enterprise Dedicated Cluster is priced at **$499/mo** and includes isolated VPC deployments, 99.99% uptime SLA, and human-supervised browser agent API access.';
    }

    if (q.includes('takeaway') || q.includes('summary') || q.includes('points')) {
      return 'Here are the 3 main takeaways from this article:\n1. Autonomous unconstrained browsing causes runaway errors.\n2. Single-step approval cards ensure complete user control.\n3. Hardcoded AST safety filters block all payment and credential tampering.';
    }

    return `Based on this page, Sahayak emphasizes **deterministic safety** and **human agency**. It indexes the DOM structure locally and assists you with reading, element finding, and single-step approved automation. Is there a specific section you’d like me to explain?`;
  }

  function formatChatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }

  // ===========================================================================
  // 3. FIND TAB
  // ===========================================================================
  function renderFindTab(container) {
    const { query, selectedElementId, isClarifying, clarificationList } = state.find;

    container.innerHTML = `
      <!-- Search Input Form -->
      <form class="find-search-form" id="find-search-form">
        <div class="find-input-wrap">
          <span class="find-search-icon">🔍</span>
          <input
            type="text"
            id="find-query-input"
            class="find-query-input"
            value="${escapeHtml(query)}"
            placeholder="Describe an element (e.g. 'pricing section')..."
          />
        </div>
        <button type="submit" class="btn btn-primary btn-sm">Find</button>
      </form>

      <!-- Quick Chips -->
      <div class="find-chips-row">
        <button type="button" class="find-chip ${selectedElementId === 'pricing-tier' ? 'active' : ''}" data-target="pricing-tier" data-query="pricing section">Pricing Section</button>
        <button type="button" class="find-chip ${selectedElementId === 'signup-btn' ? 'active' : ''}" data-target="signup-btn" data-query="sign up button">Sign Up CTA</button>
        <button type="button" class="find-chip ${isClarifying ? 'active' : ''}" id="btn-multi-matches">Multiple Matches (Demo)</button>
      </div>

      <!-- Results Area -->
      <div class="find-results-container">
        ${
          isClarifying
            ? `
          <!-- Clarification State -->
          <div class="find-clarification-banner">
            <div style="font-weight: 700; color: #f59e0b; margin-bottom: 0.25rem;">⚠️ Multiple Matches Detected (3 buttons)</div>
            <p style="font-size: 0.775rem; color: var(--text-secondary); margin: 0;">
              Several clickable buttons match your request. Please select which target you want to inspect:
            </p>
          </div>

          <div class="find-matches-list">
            ${clarificationList
              .map(
                (item) => `
              <div class="find-match-card ${selectedElementId === item.id ? 'active' : ''}" data-target="${item.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                  <strong style="font-size: 0.85rem;">${item.name}</strong>
                  <span class="element-tag-badge">${item.tag}</span>
                </div>
                <div style="font-size: 0.775rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${item.desc}</div>
                <button type="button" class="btn btn-secondary btn-sm btn-inspect-element" data-target="${item.id}" style="width: 100%;">
                  Scroll & Inspect
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : `
          <!-- Single Match State -->
          <div class="find-status-header">
            <span class="badge badge-green">1 Exact Match Found (98% confidence)</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Element Scanner v1</span>
          </div>

          <div class="find-match-card active" style="margin-top: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <strong style="font-size: 0.9rem; color: var(--accent-blue);">Enterprise Dedicated Cluster</strong>
              <span class="element-tag-badge">&lt;section#pricing-tier&gt;</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.65rem;">
              Target element matched query "${query}". Contains subscription specifications, cloud SLA, and pricing metrics.
            </p>
            <div class="find-element-attributes">
              <div><strong>Selector:</strong> <code>#pricing-tier.webpage-mock-card</code></div>
              <div><strong>Visibility:</strong> 100% in viewport coordinates</div>
              <div><strong>Semantic Role:</strong> Region / Section</div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-scroll-target" style="width: 100%; margin-top: 0.75rem;">
              👁️ Highlight & Scroll to View
            </button>
          </div>
        `
        }
      </div>
    `;

    // Event Bindings
    container.querySelector('#find-search-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = container.querySelector('#find-query-input')?.value.trim();
      if (val) {
        state.find.query = val;
        state.find.isClarifying = false;
        state.find.selectedElementId = 'pricing-tier';
        renderAll();
      }
    });

    container.querySelectorAll('.find-chip[data-target]').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.find.selectedElementId = chip.getAttribute('data-target');
        state.find.query = chip.getAttribute('data-query');
        state.find.isClarifying = false;
        renderAll();
        scrollLeftMockTo(state.find.selectedElementId);
      });
    });

    container.querySelector('#btn-multi-matches')?.addEventListener('click', () => {
      state.find.isClarifying = !state.find.isClarifying;
      renderFindTab(container);
    });

    container.querySelectorAll('.btn-inspect-element').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-target');
        state.find.selectedElementId = id;
        renderAll();
        scrollLeftMockTo(id);
      });
    });

    container.querySelector('#btn-scroll-target')?.addEventListener('click', () => {
      scrollLeftMockTo(state.find.selectedElementId);
    });
  }

  function scrollLeftMockTo(targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlighted-element');
      setTimeout(() => {
        el.classList.remove('highlighted-element');
      }, 1800);
    }
  }

  // ===========================================================================
  // 4. AGENT TAB
  // ===========================================================================
  function renderAgentTab(container) {
    const { status, dryRun, stepProgress } = state.agent;

    container.innerHTML = `
      <!-- Dry Run & Safety Header -->
      <div class="agent-safety-banner">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-size: 0.95rem;">🛡️</span>
            <strong style="font-size: 0.825rem;">Deterministic Human-In-The-Loop</strong>
          </div>
          <label class="demo-toggle-label" title="Toggle Dry-Run Simulation">
            <span style="font-size: 0.725rem; color: var(--text-secondary); margin-right: 0.35rem;">Dry-Run:</span>
            <input type="checkbox" id="agent-dryrun-toggle" ${dryRun ? 'checked' : ''} />
            <span class="demo-toggle-slider"></span>
          </label>
        </div>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">
          ${dryRun ? 'Active: Visual simulation only. Zero actual browser state mutations.' : 'Live Mode Demonstration (Mock Environment)'}
        </p>
      </div>

      <!-- User Instruction -->
      <div class="agent-instruction-box">
        <strong>User Instruction:</strong> "Apply coupon code SAVE20 in checkout preview."
      </div>

      <!-- Action Card Area -->
      <div class="agent-action-area">
        ${
          status === 'proposed'
            ? `
          <!-- Proposed Approval Card -->
          <div class="approval-card-mock">
            <div class="approval-card-header">
              <span class="approval-card-title">Proposed Action #act_7294</span>
              <span class="badge badge-green">LOW RISK</span>
            </div>

            <div class="approval-meta-row">
              <div><strong>Action:</strong> Fill Input (<code>fill_input</code>)</div>
              <div><strong>Target:</strong> &lt;input#promo-code&gt; • "Coupon Field"</div>
              <div><strong>Value:</strong> <code>"SAVE20"</code></div>
              <div><strong>Reason:</strong> User explicitly instructed coupon application.</div>
              <div><strong>Expected:</strong> Promo field populated; discount calculated.</div>
              <div><strong>Token:</strong> <code>tok_8f91a27e...</code> (Single-use, expires in 60s)</div>
            </div>

            <div style="font-size: 0.725rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              🔒 Action strictly isolated. Will not click submit or purchase buttons.
            </div>

            <div class="approval-actions">
              <button type="button" class="btn btn-primary btn-sm" id="btn-approve-action" style="flex: 1;">
                ✓ Approve & Execute
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-reject-action">
                ✕ Reject
              </button>
            </div>
          </div>
        `
            : status === 'executing'
              ? `
          <!-- Executing State -->
          <div class="agent-executing-card">
            <div class="demo-spinner"></div>
            <strong style="margin-top: 0.5rem; font-size: 0.9rem;">Executing Single-Step Action...</strong>
            <div class="agent-progress-steps">
              <div class="step-check ${stepProgress >= 1 ? 'done' : 'active'}">1. Validating single-use cryptographic token...</div>
              <div class="step-check ${stepProgress >= 2 ? 'done' : 'active'}">2. Dispatching fill_input to target DOM node...</div>
              <div class="step-check ${stepProgress >= 3 ? 'done' : 'active'}">3. Verifying post-mutation DOM state...</div>
            </div>
          </div>
        `
              : status === 'completed'
                ? `
          <!-- Success Result State -->
          <div class="agent-success-card">
            <div style="font-size: 1.75rem; margin-bottom: 0.25rem;">🎉</div>
            <h4 style="color: #34d399; margin-bottom: 0.25rem;">Action Executed Successfully</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Value <code>"SAVE20"</code> populated into <code>&lt;input#promo-code&gt;</code> in 38ms. Single-use token consumed.
            </p>

            <div class="agent-log-record">
              <div><strong>Status:</strong> COMMITTED (Verified)</div>
              <div><strong>Audit Hash:</strong> sha256:4b91...</div>
              <div><strong>Action Log:</strong> Recorded in chrome.storage.local</div>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-agent" style="width: 100%; margin-top: 0.75rem;">
              🔄 Reset Agent Simulation
            </button>
          </div>
        `
                : `
          <!-- Rejected State -->
          <div class="agent-rejected-card">
            <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🚫</div>
            <h4 style="color: #ef4444; margin-bottom: 0.25rem;">Action Cancelled by User</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Token <code>tok_8f91a27e</code> invalidated immediately. No changes were made to the webpage.
            </p>
            <button type="button" class="btn btn-primary btn-sm" id="btn-propose-again" style="width: 100%;">
              Propose Action Again
            </button>
          </div>
        `
        }
      </div>

      <div style="font-size: 0.725rem; color: var(--text-muted); text-align: center; margin-top: 0.75rem;">
        🛡️ Interactive Demo: No actual browser mutations dispatched to your machine.
      </div>
    `;

    // Event Bindings
    document.getElementById('agent-dryrun-toggle')?.addEventListener('change', (e) => {
      state.agent.dryRun = e.target.checked;
      renderAll();
    });

    document.getElementById('btn-approve-action')?.addEventListener('click', () => {
      state.agent.status = 'executing';
      state.agent.stepProgress = 1;
      renderAgentTab(container);

      setTimeout(() => {
        state.agent.stepProgress = 2;
        renderAgentTab(container);
      }, 350);

      setTimeout(() => {
        state.agent.stepProgress = 3;
        renderAgentTab(container);
      }, 700);

      setTimeout(() => {
        state.agent.status = 'completed';
        renderAll();
      }, 1050);
    });

    document.getElementById('btn-reject-action')?.addEventListener('click', () => {
      state.agent.status = 'rejected';
      renderAgentTab(container);
    });

    document.getElementById('btn-reset-agent')?.addEventListener('click', () => {
      state.agent.status = 'proposed';
      renderAll();
    });

    document.getElementById('btn-propose-again')?.addEventListener('click', () => {
      state.agent.status = 'proposed';
      renderAll();
    });
  }

  // ===========================================================================
  // 5. SKILLS TAB
  // ===========================================================================
  function renderSkillsTab(container) {
    const { category, search, activeSkillId, isRunning, output } = state.skills;

    const filtered = SKILLS_CATALOG.filter((skill) => {
      const matchCat =
        category === 'all' || skill.category.toLowerCase().includes(category.toLowerCase());
      const matchSearch =
        !search ||
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.desc.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    const activeSkill = SKILLS_CATALOG.find((s) => s.id === activeSkillId) || SKILLS_CATALOG[0];

    container.innerHTML = `
      <!-- Search & Filters -->
      <div class="skills-filter-wrap">
        <input
          type="text"
          id="skills-search-input"
          class="skills-search-input"
          placeholder="Search 6 built-in skills..."
          value="${escapeHtml(search)}"
        />
        <div class="skills-category-pills">
          <button type="button" class="skill-cat-pill ${category === 'all' ? 'active' : ''}" data-cat="all">All</button>
          <button type="button" class="skill-cat-pill ${category === 'content' ? 'active' : ''}" data-cat="content">Content</button>
          <button type="button" class="skill-cat-pill ${category === 'explanation' ? 'active' : ''}" data-cat="explanation">Explanation</button>
          <button type="button" class="skill-cat-pill ${category === 'media' ? 'active' : ''}" data-cat="media">Media</button>
          <button type="button" class="skill-cat-pill ${category === 'writing' ? 'active' : ''}" data-cat="writing">Writing</button>
        </div>
      </div>

      <!-- Skills Grid -->
      <div class="skills-cards-list">
        ${filtered
          .map(
            (skill) => `
          <div class="skill-item-card ${skill.id === activeSkillId ? 'active' : ''}" data-skill-id="${skill.id}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <strong style="font-size: 0.85rem;">${skill.name}</strong>
              <span class="element-tag-badge">${skill.badge}</span>
            </div>
            <p style="font-size: 0.775rem; color: var(--text-secondary); margin: 0;">${skill.desc}</p>
          </div>
        `
          )
          .join('')}
      </div>

      <!-- Active Skill Execution Panel -->
      <div class="skill-run-panel">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <strong style="font-size: 0.85rem; color: var(--accent-blue);">${activeSkill.name}</strong>
          <button type="button" class="btn btn-primary btn-sm btn-run-skill" id="btn-run-skill" ${isRunning ? 'disabled' : ''}>
            ${isRunning ? '⏳ Running...' : '▶ Run Demo'}
          </button>
        </div>

        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          Target Action: <code>${activeSkill.targetAction}</code>
        </div>

        ${
          isRunning
            ? `
          <div class="demo-loading-state" style="padding: 1rem 0;">
            <div class="demo-spinner"></div>
            <span style="font-size: 0.8rem; margin-top: 0.5rem;">Executing skill against sample page...</span>
          </div>
        `
            : output
              ? `
          <div class="skill-output-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <span style="font-size: 0.725rem; font-weight: 700; color: #34d399;">Execution Result:</span>
              <button type="button" class="btn-text-action" id="btn-copy-skill-output">📋 Copy</button>
            </div>
            <div style="font-size: 0.775rem; line-height: 1.45; white-space: pre-wrap; color: var(--text-primary); font-family: var(--font-mono);">${output}</div>
          </div>
        `
              : `
          <div style="font-size: 0.775rem; color: var(--text-secondary); background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: 6px; padding: 0.65rem;">
            Click <strong>Run Demo</strong> above to simulate running this skill against the current webpage.
          </div>
        `
        }
      </div>
    `;

    // Event Bindings
    container.querySelector('#skills-search-input')?.addEventListener('input', (e) => {
      state.skills.search = e.target.value;
      renderSkillsTab(container);
    });

    container.querySelectorAll('.skill-cat-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        state.skills.category = pill.getAttribute('data-cat');
        renderSkillsTab(container);
      });
    });

    container.querySelectorAll('.skill-item-card').forEach((card) => {
      card.addEventListener('click', () => {
        state.skills.activeSkillId = card.getAttribute('data-skill-id');
        state.skills.output = null;
        renderAll();
      });
    });

    container.querySelector('#btn-run-skill')?.addEventListener('click', () => {
      state.skills.isRunning = true;
      renderSkillsTab(container);
      setTimeout(() => {
        state.skills.isRunning = false;
        state.skills.output = activeSkill.sampleOutput;
        renderSkillsTab(container);
      }, 650);
    });

    container.querySelector('#btn-copy-skill-output')?.addEventListener('click', async () => {
      if (output) {
        try {
          await navigator.clipboard.writeText(output);
          alert('Skill output copied to clipboard!');
        } catch {
          // ignore
        }
      }
    });
  }

  // ===========================================================================
  // 6. MEMORY TAB
  // ===========================================================================
  function renderMemoryTab(container) {
    const {
      personalization,
      suggestions,
      category,
      search,
      memories,
      editingId,
      showClearConfirm,
    } = state.memory;

    const filtered = memories.filter((m) => {
      const matchCat = category === 'all' || m.category === category;
      const matchSearch = !search || m.text.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    container.innerHTML = `
      <!-- Global Switches -->
      <div class="memory-toggles-card">
        <label class="demo-toggle-row">
          <span>Personalization Enabled</span>
          <input type="checkbox" id="mem-toggle-personalization" ${personalization ? 'checked' : ''} />
          <span class="demo-toggle-slider"></span>
        </label>
        <label class="demo-toggle-row">
          <span>Memory Suggestions</span>
          <input type="checkbox" id="mem-toggle-suggestions" ${suggestions ? 'checked' : ''} />
          <span class="demo-toggle-slider"></span>
        </label>
      </div>

      <!-- Search & Filters -->
      <div style="margin-bottom: 0.5rem;">
        <input
          type="text"
          id="mem-search-input"
          class="skills-search-input"
          style="margin-bottom: 0.35rem;"
          placeholder="Search saved memories..."
          value="${escapeHtml(search)}"
        />
        <div class="memory-pills-row">
          <button type="button" class="demo-pill-btn ${category === 'all' ? 'active' : ''}" data-cat="all">All (${memories.length})</button>
          <button type="button" class="demo-pill-btn ${category === 'language' ? 'active' : ''}" data-cat="language">Language</button>
          <button type="button" class="demo-pill-btn ${category === 'content' ? 'active' : ''}" data-cat="content">Content</button>
          <button type="button" class="demo-pill-btn ${category === 'interaction' ? 'active' : ''}" data-cat="interaction">Interaction</button>
        </div>
      </div>

      <!-- Add Memory Form -->
      <form class="add-memory-form" id="add-memory-form">
        <div style="display: flex; gap: 0.35rem;">
          <input
            type="text"
            id="new-memory-text"
            class="add-memory-input"
            placeholder="Add a preference (e.g., 'Prefer dark theme summaries')..."
            required
          />
          <select id="new-memory-category" class="demo-select-sm" style="max-width: 100px;">
            <option value="language">Language</option>
            <option value="content">Content</option>
            <option value="interaction">Interaction</option>
            <option value="workflow">Workflow</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 0.35rem;">+ Add Memory</button>
      </form>

      <!-- Memories List -->
      <div class="memories-scroll-list">
        ${
          filtered.length === 0
            ? `
          <div style="text-align: center; padding: 1.5rem 0; color: var(--text-muted); font-size: 0.8rem;">
            No memories match the filter. Add one above!
          </div>
        `
            : filtered
                .map((m) => {
                  const isEditing = editingId === m.id;
                  return `
            <div class="memory-item-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <span class="memory-cat-tag ${m.category}">${m.category.toUpperCase()}</span>
                <div class="memory-item-actions">
                  ${
                    isEditing
                      ? `<button type="button" class="btn-text-action btn-save-edit" data-id="${m.id}">Save</button>
                         <button type="button" class="btn-text-action btn-cancel-edit">Cancel</button>`
                      : `<button type="button" class="btn-text-action btn-edit-mem" data-id="${m.id}" title="Edit">✏️</button>
                         <button type="button" class="btn-text-action btn-delete-mem" data-id="${m.id}" title="Delete">🗑️</button>`
                  }
                </div>
              </div>

              ${
                isEditing
                  ? `<input type="text" id="edit-mem-input-${m.id}" class="memory-edit-input" value="${escapeHtml(m.text)}" />`
                  : `<p class="memory-text">${escapeHtml(m.text)}</p>`
              }
            </div>
          `;
                })
                .join('')
        }
      </div>

      <!-- Clear Memories Button -->
      <div style="margin-top: 0.5rem; text-align: center;">
        ${
          showClearConfirm
            ? `
          <div class="clear-confirm-box">
            <span style="font-size: 0.775rem; color: #ef4444; font-weight: 600;">Clear all demo memories?</span>
            <div style="display: flex; gap: 0.35rem; justify-content: center; margin-top: 0.35rem;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-confirm-clear-mem" style="background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #fca5a5;">Yes, Clear</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-clear-mem">Cancel</button>
            </div>
          </div>
        `
            : `
          <button type="button" class="btn-text-action" id="btn-show-clear-mem" style="color: var(--text-muted); font-size: 0.75rem;">
            🗑️ Clear All Demo Memories
          </button>
        `
        }
      </div>
    `;

    // Event Bindings
    document.getElementById('mem-toggle-personalization')?.addEventListener('change', (e) => {
      state.memory.personalization = e.target.checked;
    });

    document.getElementById('mem-toggle-suggestions')?.addEventListener('change', (e) => {
      state.memory.suggestions = e.target.checked;
    });

    container.querySelector('#mem-search-input')?.addEventListener('input', (e) => {
      state.memory.search = e.target.value;
      renderMemoryTab(container);
    });

    container.querySelector('#add-memory-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = container.querySelector('#new-memory-text')?.value.trim();
      const cat = container.querySelector('#new-memory-category')?.value || 'workflow';
      if (txt) {
        state.memory.memories.unshift({
          id: 'm_' + Date.now(),
          category: cat,
          text: txt,
        });
        renderMemoryTab(container);
      }
    });

    container.querySelectorAll('.demo-pill-btn[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.memory.category = btn.getAttribute('data-cat');
        renderMemoryTab(container);
      });
    });

    container.querySelectorAll('.btn-edit-mem').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.memory.editingId = btn.getAttribute('data-id');
        renderMemoryTab(container);
      });
    });

    container.querySelectorAll('.btn-cancel-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.memory.editingId = null;
        renderMemoryTab(container);
      });
    });

    container.querySelectorAll('.btn-save-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const input = container.querySelector(`#edit-mem-input-${id}`);
        if (input && input.value.trim()) {
          const target = state.memory.memories.find((m) => m.id === id);
          if (target) {
            target.text = input.value.trim();
          }
        }
        state.memory.editingId = null;
        renderMemoryTab(container);
      });
    });

    container.querySelectorAll('.btn-delete-mem').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        state.memory.memories = state.memory.memories.filter((m) => m.id !== id);
        renderMemoryTab(container);
      });
    });

    container.querySelector('#btn-show-clear-mem')?.addEventListener('click', () => {
      state.memory.showClearConfirm = true;
      renderMemoryTab(container);
    });

    container.querySelector('#btn-cancel-clear-mem')?.addEventListener('click', () => {
      state.memory.showClearConfirm = false;
      renderMemoryTab(container);
    });

    container.querySelector('#btn-confirm-clear-mem')?.addEventListener('click', () => {
      state.memory.memories = [];
      state.memory.showClearConfirm = false;
      renderMemoryTab(container);
    });
  }

  // ===========================================================================
  // 7. SETTINGS TAB
  // ===========================================================================
  function renderSettingsTab(container) {
    const s = state.settings;

    container.innerHTML = `
      <!-- Sub Navigation -->
      <div class="settings-subnav">
        <button type="button" class="settings-subtab ${s.activeSection === 'general' ? 'active' : ''}" data-sec="general">General</button>
        <button type="button" class="settings-subtab ${s.activeSection === 'provider' ? 'active' : ''}" data-sec="provider">AI Provider</button>
        <button type="button" class="settings-subtab ${s.activeSection === 'safety' ? 'active' : ''}" data-sec="safety">Privacy & Safety</button>
        <button type="button" class="settings-subtab ${s.activeSection === 'about' ? 'active' : ''}" data-sec="about">Application</button>
      </div>

      <!-- Settings Body -->
      <div class="settings-body-wrap">
        ${
          s.activeSection === 'general'
            ? `
          <div class="settings-group">
            <div class="settings-field">
              <label for="set-lang">Interface Language</label>
              <select id="set-lang" class="demo-select-sm">
                <option value="auto" ${s.language === 'auto' ? 'selected' : ''}>Auto-Detect (Recommended)</option>
                <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
                <option value="hi" ${s.language === 'hi' ? 'selected' : ''}>Hindi / Hinglish (हिंदी)</option>
              </select>
            </div>

            <div class="settings-field">
              <label for="set-theme">Theme Mode</label>
              <select id="set-theme" class="demo-select-sm">
                <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light Mode</option>
                <option value="system" ${s.theme === 'system' ? 'selected' : ''}>System Preference</option>
              </select>
            </div>

            <div class="settings-field">
              <label for="set-summary-style">Default Summary Style</label>
              <select id="set-summary-style" class="demo-select-sm">
                <option value="verdict" ${s.summaryStyle === 'verdict' ? 'selected' : ''}>One-Line Verdict + Takeaways</option>
                <option value="detailed" ${s.summaryStyle === 'detailed' ? 'selected' : ''}>Detailed Technical Deep Dive</option>
              </select>
            </div>

            <div class="settings-field">
              <label for="set-summary-len">Default Summary Length</label>
              <select id="set-summary-len" class="demo-select-sm">
                <option value="concise" ${s.summaryLength === 'concise' ? 'selected' : ''}>Concise</option>
                <option value="balanced" ${s.summaryLength === 'balanced' ? 'selected' : ''}>Balanced</option>
                <option value="exhaustive" ${s.summaryLength === 'exhaustive' ? 'selected' : ''}>Exhaustive</option>
              </select>
            </div>
          </div>
        `
            : s.activeSection === 'provider'
              ? `
          <div class="settings-group">
            <div class="settings-field">
              <label for="set-primary-model">Primary Model (Google AI Studio)</label>
              <select id="set-primary-model" class="demo-select-sm">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
              </select>
            </div>

            <div class="settings-field">
              <label for="set-fallback-model">Fallback Provider (Groq API)</label>
              <select id="set-fallback-model" class="demo-select-sm">
                <option value="groq-llama-3.3-70b">LLaMA 3.3 70B Versatile</option>
                <option value="groq-mixtral-8x7b">Mixtral 8x7B</option>
              </select>
            </div>

            <label class="demo-toggle-row" style="margin-top: 0.5rem;">
              <span>Auto-Fallback on Rate Limit (429)</span>
              <input type="checkbox" id="set-auto-fallback" ${s.autoFallback ? 'checked' : ''} />
              <span class="demo-toggle-slider"></span>
            </label>

            <button type="button" class="btn btn-secondary btn-sm" id="btn-test-cascade" style="width: 100%; margin-top: 0.75rem;">
              ⚡ Test Cascade Ping
            </button>

            ${
              s.testStatus
                ? `
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 0.5rem; font-size: 0.75rem; color: #34d399; margin-top: 0.5rem;">
                ${s.testStatus}
              </div>
            `
                : ''
            }

            <div style="font-size: 0.725rem; color: var(--text-muted); margin-top: 0.5rem;">
              🔒 Showcase Demo: No actual API keys required or collected on this website.
            </div>
          </div>
        `
              : s.activeSection === 'safety'
                ? `
          <div class="settings-group">
            <label class="demo-toggle-row">
              <span>Personalization Toggle</span>
              <input type="checkbox" id="set-pers" ${s.personalization ? 'checked' : ''} />
              <span class="demo-toggle-slider"></span>
            </label>

            <label class="demo-toggle-row">
              <span>Memory Suggestions Toggle</span>
              <input type="checkbox" id="set-mem-sugg" ${s.memorySuggestions ? 'checked' : ''} />
              <span class="demo-toggle-slider"></span>
            </label>

            <label class="demo-toggle-row">
              <span>Dry-Run Mode Toggle (Preview Only)</span>
              <input type="checkbox" id="set-dryrun" ${s.dryRun ? 'checked' : ''} />
              <span class="demo-toggle-slider"></span>
            </label>

            <div style="margin-top: 0.5rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 6px; padding: 0.65rem;">
              <strong style="font-size: 0.775rem; color: #60a5fa;">Human Approval Requirement:</strong>
              <div style="font-size: 0.725rem; color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.4;">
                Every web action requires an explicit Approval Card click. Cryptographic single-use tokens prevent autonomous rogue execution.
              </div>
            </div>

            <div style="margin-top: 0.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem;">
              <strong style="font-size: 0.775rem; color: #34d399;">9 Deterministic Blocked Categories:</strong>
              <div style="font-size: 0.725rem; color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.4;">
                Payments, banking transfers, passwords, credit card inputs, order confirmation buttons, and account deletion gates cannot be automated under any prompt.
              </div>
            </div>
          </div>
        `
                : `
          <!-- Application -->
          <div class="settings-group">
            <div style="text-align: center; margin-bottom: 0.5rem;">
              <img src="assets/icons/icon-48.png" alt="logo" style="width: 32px; height: 32px; margin-bottom: 0.25rem;" />
              <h4 style="font-size: 0.95rem; margin: 0;">Sahayak (सहायक)</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Version 1.0.0 • Chrome Manifest V3</span>
            </div>

            <label class="demo-toggle-row">
              <span>Notification Preferences</span>
              <input type="checkbox" id="set-notif" ${s.notifications ? 'checked' : ''} />
              <span class="demo-toggle-slider"></span>
            </label>

            <div style="font-size: 0.775rem; color: var(--text-secondary); line-height: 1.45; margin-top: 0.25rem;">
              User-controlled, context-aware browser agent companion. Built with strict Human-In-The-Loop safety, zero telemetry, and dual Gemini + Groq intelligence.
            </div>

            <div style="border-top: 1px solid var(--border-color); margin-top: 0.75rem; padding-top: 0.75rem; display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>License: MIT</span>
              <a href="https://github.com/prajwalsute69201/Sahayak" target="_blank" style="color: var(--accent-blue);">GitHub Repo ↗</a>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-demo-settings" style="width: 100%; margin-top: 0.75rem;">
              ↻ Reset Demo Settings
            </button>
          </div>
        `
        }
      </div>
    `;

    // Event Bindings
    container.querySelectorAll('.settings-subtab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.settings.activeSection = tab.getAttribute('data-sec');
        renderSettingsTab(container);
      });
    });

    container.querySelector('#set-lang')?.addEventListener('change', (e) => {
      state.settings.language = e.target.value;
    });

    container.querySelector('#set-summary-style')?.addEventListener('change', (e) => {
      state.settings.summaryStyle = e.target.value;
    });

    container.querySelector('#set-summary-len')?.addEventListener('change', (e) => {
      state.settings.summaryLength = e.target.value;
    });

    container.querySelector('#set-primary-model')?.addEventListener('change', (e) => {
      state.settings.primaryProvider = e.target.value;
    });

    container.querySelector('#set-fallback-model')?.addEventListener('change', (e) => {
      state.settings.fallbackProvider = e.target.value;
    });

    container.querySelector('#set-auto-fallback')?.addEventListener('change', (e) => {
      state.settings.autoFallback = e.target.checked;
    });

    container.querySelector('#set-pers')?.addEventListener('change', (e) => {
      state.settings.personalization = e.target.checked;
    });

    container.querySelector('#set-mem-sugg')?.addEventListener('change', (e) => {
      state.settings.memorySuggestions = e.target.checked;
    });

    container.querySelector('#set-dryrun')?.addEventListener('change', (e) => {
      state.settings.dryRun = e.target.checked;
      state.agent.dryRun = e.target.checked;
    });

    container.querySelector('#set-notif')?.addEventListener('change', (e) => {
      state.settings.notifications = e.target.checked;
    });

    container.querySelector('#set-theme')?.addEventListener('change', (e) => {
      const nextTheme = e.target.value;
      state.settings.theme = nextTheme;
      const effectiveTheme =
        nextTheme === 'system'
          ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : nextTheme;
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      localStorage.setItem('sahayak_theme', nextTheme);
      // update navbar icon if function exists
      if (typeof window.updateThemeIcon === 'function') {
        window.updateThemeIcon(effectiveTheme);
      }
    });

    container.querySelector('#btn-test-cascade')?.addEventListener('click', () => {
      state.settings.testStatus = 'Testing provider connection...';
      renderSettingsTab(container);
      setTimeout(() => {
        state.settings.testStatus =
          '✅ Gemini 2.5 Flash: OK (114ms) | Groq LLaMA: Standby Ready (78ms)';
        renderSettingsTab(container);
      }, 550);
    });

    container.querySelector('#btn-reset-demo-settings')?.addEventListener('click', () => {
      state.settings = {
        activeSection: 'general',
        language: 'auto',
        theme: 'dark',
        summaryStyle: 'verdict',
        summaryLength: 'balanced',
        primaryProvider: 'gemini-2.5-flash',
        fallbackProvider: 'groq-llama-3.3-70b',
        autoFallback: true,
        personalization: true,
        memorySuggestions: true,
        dryRun: true,
        notifications: true,
        testStatus: null,
      };
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('sahayak_theme', 'dark');
      renderSettingsTab(container);
    });
  }

  // ---------------------------------------------------------------------------
  // Helper Utilities
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Auto-boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShowcase);
  } else {
    initShowcase();
  }

  // Expose for external calls if needed
  window.SahayakShowcase = {
    state,
    switchTab,
    initShowcase,
  };
})();
