# Changelog

All notable changes to the **Sahayak (सहायक)** Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-03

### Initial Production Release (Slices 1 through 17)

#### Added

- **Slice 1: Extension Shell, Side Panel & Settings**
  - Full Chrome Extension Manifest V3 baseline with Side Panel API integration.
  - Core header, tab navigation bar (Summary, Chat, Find, Agent, Skills, Memory, Settings).
  - Dark/light responsive theme system with Tailwind CSS and Lucide icons.
  - Chrome Storage API integration with type-safe state management.

- **Slice 2: Gemini Direct API Client & Latency Validation**
  - Direct REST client connecting to Google AI Studio endpoints (`gemini-2.5-flash-lite`, `gemini-2.5-flash`).
  - Secure local key storage in `chrome.storage.local`.
  - Latency test ping tool (⚡) with visual status indicators.

- **Slice 3: Article Extraction & Structured Summaries**
  - Content script readability parser using `@mozilla/readability`.
  - Three-part structured summaries: One-Line Verdict, Key Takeaways, and Deep Dive.
  - Chunking engine handling long-form articles with client-side deduplication.

- **Slice 4: Public YouTube Video Summarisation**
  - YouTube player detection and TimedText transcript scraper.
  - Interactive clickable timestamp seek links that scrub video playback in real time.
  - Structured chapter breakdowns and executive action summaries.

- **Slice 5: English & Hinglish Bilingual Language Engine**
  - Automatic language detection for English, Romanized Hinglish, and Hindi.
  - Text normalization handling code-mixed conversational inputs.
  - System prompt directives producing natural Latin-script Hinglish responses.

- **Slice 6: Grounded Page Chat with Streaming**
  - Real-time Server-Sent Events (SSE) streaming responses in the Side Panel.
  - Local TF-IDF section retrieval retrieving relevant webpage context.
  - Source grounding with citation badges referencing extracted sections.

- **Slice 7: Context-Menu AI Actions**
  - Native Chrome right-click context menus: _Explain_, _Summarize_, _Translate_, _Rewrite_, and _Ask Sahayak_.
  - Seamless handoff from context-menu selection directly into Side Panel with pre-populated prompt.

- **Slice 8: Screenshot-and-Ask (Multimodal Vision)**
  - Viewport capture via `chrome.tabs.captureVisibleTab`.
  - Client-side image downscaling and compression preventing excessive payload sizes.
  - Multimodal visual Q&A powered by Gemini 2.5 Flash.

- **Slice 9: Rate-Limit Resilience & Groq Fallback Cascade**
  - Exponential backoff with full jitter on HTTP 429 and temporary server errors.
  - Automatic failover cascade to Groq (Llama 3.3 70B Versatile).
  - Transparent UI banner indicating active fallback status and provider switching.

- **Slice 10: Interactive Element Scanner & Shadow DOM Badges**
  - Semantic DOM scanner identifying buttons, links, inputs, and interactive ARIA roles.
  - Non-intrusive numerical badges rendered inside style-isolated Shadow DOM.
  - Debounced dynamic MutationObserver with infinite-loop prevention.

- **Slice 11: Structured Element Selection ("Find It For Me")**
  - Natural-language element search in English and Romanized Hinglish.
  - Hybrid scoring combining fast local keyword heuristics with LLM re-ranking.
  - Multi-match navigation cycling and smooth viewport centering.

- **Slice 12: Single-Step Agent Loop & HITL Approval UI**
  - Strict human-in-the-loop agent cycle: Understand → Plan → Present Action → Request Approval → Execute.
  - Cryptographically secure single-use approval tokens preventing duplicate executions.
  - Visual approval card displaying action type, target label, reason, expected result, and risk badge.

- **Slice 13: Progress Persistence, Dry-Run Mode & Action Logs**
  - Tab-isolated session progress persistence in `chrome.storage.local`.
  - Safe restoration without execution authority; stale approvals cleared to `interrupted`.
  - Central Dry-Run simulation mode allowing preview without browser DOM mutations.
  - Searchable, filterable action audit logs with retention pruning.

- **Slice 14: Local Profile Memory**
  - Privacy-first on-device personal profile and preferences memory.
  - Structured taxonomy: Preferences, Work, Technical, Personal, and Communication.
  - Explicit confirmation cards for memory additions, updates, and diff conflict resolution.

- **Slice 15: One-Click Reusable Skills & JSON Import/Export**
  - 8 built-in immutable skills covering YouTube extraction, article briefs, and Hinglish explainers.
  - Safe non-eval mustache template engine (`{{variable}}`) with input sanitization.
  - Schema-validated portable JSON export and import (`sahayak-skills` format).

- **Slice 16: Deterministic Safety Rails & Consequential Gating**
  - Centralized safety policy engine evaluating risks (`low`, `medium`, `high`, `critical`) in TypeScript code.
  - Zero model delegation: AI risk claims ignored and overridden.
  - 9 mandatory blocked categories: payments, financial transfers, form submissions, messaging, publishing, deletions, credential modifications, sensitive inputs, and dangerous URL schemes.
  - Strict HTTP/HTTPS URL whitelist and embedded credential filter.
  - Dedicated privacy-preserving safety audit logging.

- **Slice 17: Production Packaging, Release ZIP & Landing Page**
  - Automated release packaging script generating `release/sahayak-v1.0.0.zip` and unpacked distribution.
  - Automated Manifest V3 validation script with security leak and dev server scanning.
  - Cryptographic SHA-256 integrity verification (`release/sahayak-v1.0.0.zip.sha256`) and release report JSON.
  - Modern, responsive public-facing landing page in `docs/` with interactive agent simulator.
  - Complete documentation suite: `INSTALLATION.md`, `RELEASE.md`, `PRIVACY.md`, and updated `README.md`.
