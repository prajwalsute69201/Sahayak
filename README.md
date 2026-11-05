# Sahayak (सहायक) — User-Controlled, Context-Aware Browser Agent

> **Google Chrome Extension (Manifest V3)**  
> _Read, Explain, See, Remember, and Act — With Explicit Human Approval at Every Step._

---

## 1. Overview

Sahayak is a context-aware Chrome browser extension designed to assist users with article summarization, grounded page question-answering, multimodal vision queries, and step-by-step browser tasks under strict Human-In-The-Loop (HITL) approval.

This release includes:

- **Slice 1**: Extension Shell, Side Panel & Settings
- **Slice 2**: Gemini Direct API Client & Text Call
- **Slice 3**: Article Extraction & Structured Summaries (Mozilla Readability + Gemini Flash-Lite)
- **Slice 4**: Public YouTube Video Summarisation (TimedText Transcripts + Interactive Timestamp Seek)
- **Slice 5**: English & Hinglish Language Engine (Bilingual Detection, Normalization & Prompt Directives)
- **Slice 6**: Grounded Page Chat with Streaming (Real-Time SSE Streaming, Section-Based TF-IDF Retrieval & Grounded Q&A)
- **Slice 7**: Context-Menu AI Actions (Explain, Summarize, Translate, Rewrite & Ask Sahayak with Side Panel Handoff)
- **Slice 8**: Screenshot-and-Ask (Multimodal Vision, Viewport Capture, Image Optimization & Visual Q&A)
- **Slice 9**: Rate-Limit Resilience & Groq Fallback Cascade (Exponential Backoff with Jitter, HTTP 429 & Quota Detection, Groq Llama 3.3 Integration & Auto-Failover)
- **Slice 10**: Interactive Element Scanner & Shadow DOM Badges (DOM Analysis, WAI-ARIA Label Extraction, Category Classification, Isolated Shadow DOM Overlay & Bi-directional Highlighting)
- **Slice 11**: Structured Element Selection ("Find It For Me") (Natural-Language Search in English & Hinglish, Local Heuristics + Gemini/Groq Hybrid Ranking, Multi-Match Navigation & Shadow DOM Focusing)
- **Slice 12**: Single-Step Agent Loop & HITL Approval UI (Controlled Understand-Plan-Approve-Execute Cycle, Strongly-Typed Action Schemas, Single-Use Approval Tokens, High-Risk Action Guards, Safe DOM Execution & Tab-Isolated Sessions)
- **Slice 13**: Progress Persistence, Dry-Run Mode & Action Logs (Tab-Specific Session Persistence, Safe Restoration Without Execution Authority, Interrupted State Handling, Central Dry-Run Simulation Guard & Filterable Action Audit History)
- **Slice 14**: Local Profile Memory (Privacy-First On-Device Personalization, Multi-Category Taxonomy, English & Hinglish Intent Detection, Conflict/Update Diff Proposals & Untrusted Context Grounding)
- **Slice 15**: One-Click Reusable Skills & JSON Import/Export (Predefined Built-in Workflows, Custom Template Authoring, Safe Non-Eval Variable Substitution, One-Click Feature Routing, HITL Action Integration & Portable Schema-Validated JSON Transfers)
- **Slice 16**: Deterministic Safety Rails & Consequential Gating (Centralized Policy Engine, Zero AI Model Delegation, 9 Mandatory Blocked Categories, Bilingual English & Hinglish Keyword Matching, Strict HTTP/HTTPS URL Whitelist & Embedded Credential Prevention, Enhanced Confirmation Double-Acknowledgement & Privacy-Preserving Safety Audit Logs)
- **Slice 17**: Production Packaging, Release ZIP & Landing Page (Automated MV3 Validation, Clean Distributable ZIP Generation, Cryptographic SHA-256 Checksum, Public Landing Page in `docs/`, Interactive Agent Simulator, Zero-Telemetry Privacy Declaration & Installation Guides)

---

## 2. Google Gemini API Integration (Slice 2)

Sahayak connects directly to Google AI Studio's Gemini REST endpoints without intermediate servers or heavy external SDKs, keeping token transmission low-latency and private to your device.

### How to Obtain a Gemini API Key

1. Visit the [Google AI Studio API Key Console](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API Key** and select your Google Cloud project (or generate one in a new project).
4. Copy the generated key (`AIzaSy...`).

### Where to Configure Your Key in Sahayak

1. Open the Sahayak extension Side Panel by clicking the Sahayak icon in your Chrome toolbar.
2. Navigate to the **Settings** tab (gear icon in the header or bottom tab bar).
3. Under **AI Provider Credentials**, paste your key into the **Gemini API Key** field.
4. Click **Test Connection** (⚡) to verify network connectivity and latency directly against the Gemini endpoint.
5. Click **Save Changes** at the bottom of the page.

---

## 3. How the Gemini Direct Client Works

The client resides in [`src/services/gemini/`](src/services/gemini/):

```
src/services/gemini/
├── gemini.client.ts   # Core REST client communicating with Google Gemini v1beta
├── gemini.types.ts    # TypeScript definitions for request, response, and generation config
├── gemini.errors.ts   # Typed domain errors with automatic API key sanitization
└── index.ts          # Module export barrel
```

### Architecture Highlights

- **Zero Heavy SDKs**: Uses standard native `fetch` with `AbortController` timeouts and typed request payloads.
- **Header Authentication**: Passes credentials via `x-goog-api-key: <key>` rather than URL query parameters, preventing accidental URL log leaks.
- **Key Sanitization**: All error messages pass through `sanitizeApiError()`, automatically masking any API keys (`[REDACTED_API_KEY]`) before they reach UI banners or console outputs.
- **Default Model**: Configured with `gemini-2.0-flash-lite` for near-instant responses (~250-500ms latency) and high token allowances. Supports `gemini-2.0-flash`, `gemini-1.5-flash`, and `gemini-1.5-pro`.

### Security & Storage Architecture Notice

> [!IMPORTANT]
> **Client-Side Storage vs. Server-Side Secrets**:  
> In Sahayak, API keys are stored locally in Chrome's sandboxed storage (`chrome.storage.local`) on your personal computer. While this adheres to Sahayak's **Zero-Telemetry Local Privacy** principle (your keys are never sent to our servers), client-side storage is accessible to extension code and physical device users. It is **not** equivalent to a server-side secret vault. Always use API keys with appropriate quotas and restrict usage in the Google Cloud Console.

---

## 4. How to Run the Text-Generation Test

You can test Gemini text generation in two ways:

### A. Via the Side Panel Interactive Playground

1. Open the extension Side Panel and select the **Read & Chat** tab.
2. Locate the **Gemini Direct AI Test** card.
3. Choose a quick preset (e.g. _Ping ('OK')_, _HITL Agents_, or _Hinglish Test_) or type a custom prompt.
4. Expand **Parameters** if you wish to adjust temperature or maximum output token limit.
5. Click **Generate Text**.
6. Inspect the generated response, execution latency in milliseconds, and token usage breakdown.

### B. Via Automated Unit Tests

Run the test suite using Vitest:

```bash
# Run all unit tests once
npm run test

# Run tests in watch mode during development
npm run test:watch
```

---

## 5. Article Extraction & Structured Summaries (Slice 3)

Sahayak allows users to extract clean readable content from any web article in their active Chrome tab and generate a structured summary using Gemini.

### How It Works

```
[ Active Web Page ]
       │
       ▼ (document.cloneNode)
[ Cloned DOM ] ──► Mozilla Readability + DOMPurify Sanitization
       │
       ▼ Extracted Article (Title, Byline, Site, Clean Text, Word Count)
[ Content Chunker ] (Splits articles >20k chars on semantic paragraph boundaries)
       │
       ▼ Protected Prompt with <ARTICLE_CONTENT> Boundaries
[ Gemini Flash-Lite Direct Client ]
       │
       ▼ Structured JSON Generation (with Regex Fallback Parser)
[ Side Panel Summary View ]
   ├── Article Metadata (Title, Author, Source, Estimated Read Time)
   ├── Quick Overview
   ├── Key Points (Bullet list)
   ├── Detailed Summary
   ├── Important Facts (Stats, names, dates)
   ├── Conclusion
   ├── Topics & Keywords (Interactive tags)
   └── Copy Summary (Formatted Markdown to clipboard)
```

### Untrusted Content Isolation & Security Boundaries

Web article content is treated as completely untrusted input:

1. **Cloned DOM Execution**: Readability runs on `document.cloneNode(true)`, ensuring zero DOM manipulation or layout thrashing of the live host page.
2. **Pre-Sanitization**: Strips scripts, styles, forms, iframes, SVGs, and audio/video tags before readability parsing.
3. **Prompt Injection Defense**: Article text is wrapped in strict `<ARTICLE_CONTENT>` delimiter tags with explicit system instructions to ignore any commands, directives, or system prompt override attempts contained within the article.
4. **Resilient Parsing**: Uses response-schema-guided JSON output with a comprehensive regex parser fallback to ensure the UI never crashes even if the model responds in free-form Markdown.
5. **Dynamic Scripting Fallback**: If the content script is not yet active on an existing tab (e.g. tabs opened prior to extension installation), Sahayak automatically injects the reader via `chrome.scripting.executeScript`.

### How to Use Article Summaries in the Side Panel

1. Navigate to any news article, blog post, or documentation page in Chrome (e.g., Wikipedia, BBC, Medium).
2. Open the Sahayak Side Panel and navigate to the **Read & Chat** tab (or **Summary** tab).
3. Click the **Summarize Active Tab** button.
4. Watch the step-by-step progress:
   - _Extracting article content from page..._
   - _Generating structured summary with Gemini..._
5. Review the structured summary cards, key takeaways, and facts.
6. Click **Copy Summary** to copy the formatted markdown summary to your clipboard.

---

## 6. Public YouTube Video Summarisation (Slice 4)

Sahayak can summarize public YouTube videos directly from your browser tab or from pasted YouTube video links, producing structured notes with clickable chapter timestamps that navigate the active video player without page reloads.

### Video Analysis & Processing Pipeline

```
[ Active YouTube Tab ] (or pasted YouTube URL)
       │
       ▼ (11-character video ID validation)
[ YouTube Detector & Metadata Service ]
   ├── In-page DOM inspection (Title, Channel, Duration)
   └── Public oEmbed API fallback
       │
       ▼
[ Transcript Retrieval Service ] (Permitted official tracks via timedtext)
   ├── Player session ytInitialPlayerResponse inspection
   └── Fallback to public timedtext XML/JSON3
       │
       ▼
[ Transcript Cleaner & Normalizer ]
   ├── HTML entity decoding (&amp; -> &, &#39; -> ')
   ├── Auditory artifact removal ([Music], (applause), ♪)
   ├── ASR duplicate rolling word deduplication
   └── Segment merging into complete semantic sentences
       │
       ▼
[ Timestamp-Preserving Chunker ] (Segments long transcripts >25,000 chars)
       │
       ▼ Protected Prompt with <VIDEO_TRANSCRIPT> Boundaries
[ Gemini Flash-Lite Direct Client ]
       │
       ▼ Structured JSON Generation (with Regex Fallback Parser)
[ Side Panel Video Notes View ]
   ├── Video Card (Thumbnail, Title, Channel, Duration, Link)
   ├── Quick Overview
   ├── Important Moments & Chapters (Clickable timestamps -> in-page seek)
   ├── Key Takeaways
   ├── Detailed Summary
   ├── Key Facts & Data
   ├── Conclusion
   ├── Topics & Keywords
   └── Copy Notes (Markdown export)
```

### Supported Videos & URL Formats

- Standard watch: `https://www.youtube.com/watch?v=VIDEO_ID`
- Shortened: `https://youtu.be/VIDEO_ID`
- Shorts: `https://www.youtube.com/shorts/VIDEO_ID`
- Embedded: `https://www.youtube.com/embed/VIDEO_ID`
- Mobile: `https://m.youtube.com/watch?v=VIDEO_ID`

### Compliance, Limitations & Ethical Boundaries

> [!NOTE]
> **Permitted Integration & Zero Bypass Policy**:
>
> - **Public Videos Only**: Sahayak only processes publicly accessible YouTube videos. It never bypasses age-restrictions, login walls, paywalls, CAPTCHA, or anti-bot protections.
> - **Captions Requirement**: Summarization requires available manual or auto-generated captions. If a creator disabled subtitles or automatic captions have not finished processing, Sahayak surfaces a clear, actionable explanation rather than failing silently or scraping unauthorized sources.
> - **Zero Media Scraping**: Sahayak does not download, rip, or re-encode video/audio streams.
> - **Untrusted Transcript Isolation**: Spoken audio text is treated as third-party untrusted data. Prompts strictly delimit transcripts within `<VIDEO_TRANSCRIPT>` and enforce prompt-injection immunity so embedded speech cannot alter extension behavior.

### Interactive Timestamp Seeking

When reviewing the **Important Moments & Chapters** section:

- Clicking any timestamp pill (e.g. `[02:45]`) immediately seeks the active video player in the YouTube tab to that exact second via in-page execution (`video.currentTime = seconds`), without refreshing or disrupting your playback context.

### How to Use YouTube Video Notes in the Side Panel

1. Open any YouTube video in Google Chrome.
2. Open the Sahayak Side Panel.
3. The video metadata, thumbnail, and duration are detected automatically.
4. Click **Summarize Active Video**.
5. Watch the step-by-step progress:
   - _Fetching video details..._
   - _Retrieving official video transcript & captions..._
   - _Generating chapter breakdown with Gemini..._
6. Review the structured summary and click timestamps to jump directly to key chapters.
7. Click **Copy Notes** to export the structured markdown to your clipboard.
8. _(Optional)_ If viewing a video on another device or tab, paste the YouTube link into the custom URL input box on any page.

---

## 7. English & Hinglish Language Engine (Slice 5)

Sahayak features a built-in natural language engine designed for bilingual users across India and globally, enabling fluid communication in **Standard English**, **Devanagari Hindi**, and conversational **Hinglish** (Hindi grammar written in the Latin alphabet).

### Language Engine Architecture

```
[ User Input / Web Content / Transcript ]
                   │
                   ▼
[ Language Detector Service ]
   ├── Devanagari Unicode Range Check (\u0900-\u097F)
   ├── Weighted Hinglish Grammar & Verbal Root Analysis
   ├── Homograph Guard (Prevents English 'the', 'in', 'is' misclassifications)
   └── Cultural Borrowing Guard (Allows 'chai', 'samosa' in English)
                   │
                   ▼
[ Language Normalizer Service ]
   ├── Chat abbreviation expansion ('plz' -> 'please', 'nhi' -> 'nahi')
   ├── Whitespace normalization without semantic drift
   └── Preserves URLs, numbers, quotes, code, and technical symbols
                   │
                   ▼
[ Language Prompt Service ]
   ├── Target Language Resolution ('auto' | 'en' | 'hi-en')
   ├── Strict Latin/Roman Script Enforcement (Zero Devanagari in Hinglish)
   ├── English Technical Vocabulary Retention ('state management', 'API')
   └── Security Boundary Enforcement (Delimiters immune to language override)
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
[ Article Summarizer ]   [ YouTube Video Notes ]
  (Per-summary toggle:      (Per-summary toggle:
    Auto | EN | HI)           Auto | EN | HI)
```

### Supported Response Modes

1. **Auto (`auto`)**: Automatically analyzes content and user queries. If Hindi or Hinglish is detected, Sahayak responds in conversational Hinglish; otherwise, it defaults to standard English.
2. **English (`en`)**: Generates structured, grammatically correct responses exclusively in English.
3. **Hinglish (`hi-en`)**: Generates natural, conversational Hinglish using Hindi grammar and expressions with technical English terms in the Latin alphabet:
   > _"Yeh article explain karta hai ki neural networks kaise train hote hain. Sabse pehla step data preprocessing aur feature scaling hai..."_

### Key Rules & Safety Boundaries

- **Strict Roman Script**: Hinglish responses are exclusively written using the Latin/English alphabet. The model never switches into Devanagari script for Hinglish output.
- **Technical Vocabulary Preservation**: Software engineering terms, APIs, formulas, variable names, and metrics are preserved in English rather than translated into awkward literal Hindi words.
- **Untrusted Content Immunity**: Language directives apply strictly to the phrasing style and tone. Delimiter boundaries (`<ARTICLE_CONTENT>`, `<VIDEO_TRANSCRIPT>`) cannot be bypassed by language-switching prompt injections.

### Changing and Overriding Language Preferences

- **Global Preference in Settings**: Navigate to **Settings** $\rightarrow$ **Appearance & Language** $\rightarrow$ **Preferred Language Engine** to choose between **Auto Detect**, **English**, and **Hinglish**.
- **Quick Header Cycle**: Click the language toggle pill in the side panel header (`EN / HI / AUTO`) to cycle between modes instantly.
- **Per-Summary Overrides**: Both the **Article Summarizer** and **YouTube Notes** cards feature an interactive `[ AUTO | EN | HI ]` segmented selector allowing you to override your language choice for any individual summary.

---

## 8. Grounded Page Chat with Streaming (Slice 6)

Slice 6 introduces an interactive, page-aware AI conversational assistant that allows users to ask questions about the webpage or YouTube video they are currently viewing and receive real-time answers strictly grounded in its content.

```
[ Active Web Page / YouTube Video ]
               │
               ▼
   [ Page Context Service ]
       ├── Mozilla Readability (Articles)
       ├── TimedText Transcripts (YouTube)
       └── Cleans Ads, Cookie Banners & Navigation
               │
               ▼
   [ Context Chunker Service ]
       ├── Heading Preservation (h1-h6)
       └── Sub-chunking Oversized Sections
               │
               ▼
   [ Context Retrieval Service ]
       ├── TF-IDF Keyword Scoring & Heading Boosts (3.5x)
       ├── Explicit Section Targeting ("second section")
       └── Context Budgeting (3,000 words max)
               │
               ▼
   [ Grounding & Anti-Injection Guard ]
       ├── Strict Grounded Refusal Rule
       ├── Untrusted <PAGE_CONTEXT> Delimiters
       └── Bilingual Directives (English / Hinglish)
               │
               ▼
   [ Gemini Streaming Client (SSE) ]
       ├── streamGenerateContent?alt=sse
       ├── Real-time Typing Cursor
       ├── User Cancellation (Stop Generation)
       └── Tab-Specific Conversation Isolation
```

### Core Capabilities

1. **Active Page Context Extraction**:
   - Automatically inspects the active browser tab to extract title, domain, URL, main content, headings, and links.
   - Fully supports standard articles, general web pages, and YouTube video transcripts from Slice 4.
   - Cleans extracted content by eliminating advertisements, cookie banners, navigation menus, and boilerplate text.
   - Users can refresh the page context anytime via the **Refresh Context** button in the chat header.

2. **Real-Time Streaming Responses**:
   - Connects directly to Gemini v1beta `streamGenerateContent?alt=sse` using Server-Sent Events (SSE).
   - Words and sentences stream incrementally into the chat bubble within milliseconds.
   - Features a pulsing cursor and typing indicator while generating.
   - **User Cancellation**: Clicking the **Stop** button interrupts generation immediately via `AbortController`, preserving whatever response chunks were already received.
   - Includes automatic fallback to non-streaming generation if response streams are not supported.

3. **Lightweight Section Chunking & TF-IDF Retrieval**:
   - Rather than sending huge web pages in their entirety or introducing heavy vector database infrastructure, Sahayak partitions long documents into heading-preserved sections.
   - When users ask specific questions (e.g. _"What are the statistics in 2024?"_), Sahayak runs a lightweight BM25/TF-IDF scoring algorithm with heading and phrase boosts to select the most relevant sections within a 3,000-word context budget.
   - When users ask structural questions (e.g. _"Explain the second section in simple terms"_), Sahayak detects the ordinal reference and prioritizes the exact targeted section.

4. **Strict Grounding & Anti-Hallucination Policy**:
   - Answers must be derived exclusively from the provided `<PAGE_CONTEXT>`.
   - **Grounded Refusal**: If the answer cannot be found in the current page, the assistant explicitly states:
     - English: _"This information is not present on the current page."_
     - Hinglish: _"Yeh jaankari current page par uplabdh nahi hai."_
   - Assistant cites source sections in brackets (e.g., `[Section: Key Economic Statistics]`).

5. **Security & Prompt Injection Resistance**:
   - Page text is treated strictly as **untrusted data**.
   - Page content is isolated inside `<PAGE_CONTEXT>` tags and separated from system instructions and user messages.
   - System instructions explicitly forbid the model from executing or prioritizing commands embedded within webpage text (e.g., _"Ignore previous instructions"_, _"Reveal your API key"_).

6. **Tab-Specific Conversation Isolation**:
   - Each browser tab maintains an independent conversation history.
   - Switching tabs switches the conversation session automatically; switching back restores previous turns.
   - Users can clear the active tab's conversation at any time with the **Clear Conversation** button.
   - Conversation history is automatically pruned to a rolling window (last 6 messages) to prevent unnecessary token consumption.

7. **Known Limitations & Edge Cases**:
   - **Internal Browser Pages**: Chrome extensions cannot read `chrome://`, `chrome-extension://`, `edge://`, or `about:` pages. Sahayak surfaces an informative badge indicating that internal browser pages are restricted.
   - **Paywalls & Login Restrictions**: Content behind login barriers or strict paywalls cannot be read without page access.
   - **Videos Without Captions**: If a YouTube video lacks manual or auto-generated captions, questions can only be answered based on the video's title and available metadata.

---

## 9. Context-Menu AI Actions (Slice 7)

Slice 7 introduces native browser context-menu actions, allowing users to trigger instant AI operations on any selected text across webpages without manually copying, pasting, or switching tabs.

```
[ User Selects Text on Any Webpage ]
                │
                ▼ (Right-Click Context Menu)
┌──────────────────────────────────────────────┐
│ Sahayak                                      │
│  ├── Explain Selection                       │
│  ├── Summarize Selection                     │
│  ├── Translate Selection                     │
│  ├── Rewrite Selection                       │
│  └── Ask Sahayak                             │
└──────────────────────────────────────────────┘
                │
                ▼
[ Background Service Worker ]
    ├── Captures selected text & page context
    ├── Opens Side Panel (chrome.sidePanel.open)
    └── Dual-Channel Delivery:
         ├── Storage Handoff (chrome.storage.local) [Race-condition immune]
         └── Runtime Message (chrome.runtime.sendMessage) [Instant if open]
                │
                ▼
[ Side Panel Context Action Handler ]
    ├── Sanitizes selection & validates length (2 - 50,000 chars)
    ├── Wraps input in <SELECTED_TEXT> injection defense tags
    ├── Injects Slice 5 bilingual language directives (EN / Hinglish)
    └── Streams response via Gemini Direct Client (SSE)
                │
                ▼
[ Reusable Side Panel Result Card ]
    ├── Action badge & execution latency indicator
    ├── Collapsible Selection Preview (Word & character counts)
    ├── Real-time Streaming Markdown output
    └── Action Toolbar:
         ├── Copy to Clipboard (with "Copied!" feedback)
         ├── Retry Generation
         ├── Continue in Page Chat (hands off to Slice 6 chat)
         └── Dismiss
```

### Menu Actions & Operations

1. **Explain Selection (`sahayak-explain`)**:
   - Simplifies complex, technical, or dense text into clear, accessible language.
   - Preserves critical technical terms, formulas, and domain entities.
   - Respects the user's active language preference (English or conversational Hinglish).

2. **Summarize Selection (`sahayak-summarize`)**:
   - Extracts key insights, main takeaways, and vital facts from the selection.
   - Preserves essential numbers, metrics, dates, and proper nouns.
   - Strictly avoids hallucinating information absent from the selected excerpt.

3. **Translate Selection (`sahayak-translate`)**:
   - Performs natural, idiomatic translation between Standard English and conversational Hinglish.
   - Retains technical vocabulary and proper names in English to prevent awkward literal translations.
   - Automatically detects source language to set the appropriate translation direction.

4. **Rewrite Selection (`sahayak-rewrite`)**:
   - Polishes grammar, readability, tone, and sentence flow.
   - Strictly preserves the original meaning, facts, and technical precision.
   - Produces natural, publishable text.

5. **Ask Sahayak (`sahayak-ask`)**:
   - Captures selected text as a focused grounding context and automatically opens Page Chat (Slice 6).
   - Allows users to ask follow-up questions specifically about the selected text while maintaining access to surrounding page content.

### Selection Capture, Validation & Safety Boundaries

- **Input Sanitization**: Zero-width spaces, directional marks, and non-printable control characters are automatically stripped prior to processing.
- **Length Boundaries**:
  - **Minimum**: 2 non-whitespace characters required.
  - **Recommended Cap (25,000 characters)**: Generates an informative advisory banner indicating potential context truncation.
  - **Hard Cap (50,000 characters)**: Blocks execution before making API calls to protect user quota and prevent latency spikes.
- **Prompt Injection Defense**:
  - Selected text is treated as strictly untrusted user input.
  - All input is wrapped in isolated `<SELECTED_TEXT>` XML delimiter tags.
  - System instructions explicitly command Gemini to treat text inside delimiters as inert passive content, completely ignoring any embedded instructions, prompt overrides, or system manipulation attempts.
- **Zero In-Page DOM Thrashing**:
  - Sahayak never alters or overwrites selected text directly inside the host webpage.
  - All results, previews, and actions remain safely encapsulated inside Chrome's native Side Panel.

### Dual-Channel Delivery Architecture

In Manifest V3, if the Side Panel is closed when a user clicks a context menu item, calling `chrome.sidePanel.open()` takes several milliseconds to initialize the React application. A standard runtime message (`chrome.runtime.sendMessage`) sent during this window would be dropped before any listener can register.

Sahayak resolves this with **Dual-Channel Delivery**:

1. The background script immediately writes the context action payload to `chrome.storage.local` under the key `sahayak:pending_context_action`.
2. Simultaneously, it broadcasts a runtime message (`SAHAYAK_EXECUTE_CONTEXT_ACTION`) for when the side panel is already open.
3. Upon mounting, `useContextAction` immediately inspects local storage, retrieves any pending action, and clears the storage slot atomically.

---

## 10. Screenshot-and-Ask (Multimodal Vision) (Slice 8)

Slice 8 introduces visual question answering to Sahayak, enabling users to capture a screenshot of their active browser viewport, ask questions about diagrams, charts, UI elements, or error alerts, and receive streaming answers powered by Gemini Vision.

```
[ Active Webpage Viewport ]
              │
              ▼ (Explicit User Click: "Capture Screenshot")
[ Chrome Tabs Capture API ] (chrome.tabs.captureVisibleTab)
              │
              ▼
[ Image Processing Service ]
    ├── Format & size validation (PNG, JPEG, WebP; ≤10 MB)
    ├── Aspect-ratio scaling (max 1600px width/height)
    └── Conditional compression (JPEG 85% for images >1.5 MB)
              │
              ▼
[ Visual Context & Anti-Injection Guard ]
    ├── Untrusted image boundary enforcement
    ├── Rejection of prompt injection within visual text
    └── Language engine injection (English / Hinglish)
              │
              ▼
[ Gemini Vision Direct Client (SSE) ]
    ├── Multi-turn contents: [ { inlineData }, { text: question } ]
    ├── Real-time SSE streaming (streamGenerateContent)
    └── Turn management (avoids re-transmitting image on follow-ups)
              │
              ▼
[ Side Panel Visual Chat UI ]
    ├── Collapsible / expandable screenshot preview & metadata
    ├── Preset chips: Explain, Chart Analysis, Error, OCR, Elements
    ├── Real-time markdown streaming response bubble
    └── Visual conversation history & retake / remove controls
```

### Core Capabilities

1. **Active Viewport Capture**:
   - Captures what is currently visible on screen via `chrome.tabs.captureVisibleTab`.
   - Never captures full-page scrolling content or off-screen buffers without user consent.
   - Automatically prevents captures on restricted browser URLs (`chrome://`, `chrome-extension://`, `edge://`, `about:`, `chromewebstore.google.com`), surfacing a clear explanatory banner.

2. **Image Processing & Optimization Pipeline**:
   - **Supported Formats**: PNG, JPEG, WebP.
   - **Dimension Scaling**: Screenshots from high-DPI (Retina/4K) monitors are scaled down to $\le 1600\text{px}$ preserving exact aspect ratio.
   - **Selective Compression**: Screenshots exceeding 1.5 MB are converted to optimized JPEG (85% quality) via HTML Canvas, reducing transfer latency by up to 80% while retaining sharp text legibility.
   - **Bypass Re-Encoding**: Images already within safe dimensions and size limits are transmitted directly to eliminate unnecessary memory duplication.

3. **Multimodal Gemini Integration**:
   - Transmits images directly using Gemini's native `inlineData` structure:
     ```json
     {
       "inlineData": {
         "mimeType": "image/jpeg",
         "data": "<BASE64_BYTES>"
       }
     }
     ```
   - Connects to `gemini-2.0-flash-lite` (or user-selected model) for low-latency visual analysis.
   - Supports both full-response generation and incremental real-time Server-Sent Events (SSE) streaming.

4. **Multi-Turn Visual Conversation & Follow-Ups**:
   - Users can ask continuous follow-up questions about the same captured screenshot (e.g., _"What is shown here?"_ $\rightarrow$ _"Explain the red chart on the right"_ $\rightarrow$ _"What does the Y-axis measure?"_).
   - **Token & Bandwidth Efficiency**: The screenshot payload is attached exclusively to the first conversation turn; follow-up questions transmit only conversational text, avoiding repeated multi-megabyte image transfers.
   - Automatically prunes conversation history to a rolling window (last 6 turns) to protect model context limits.

5. **Visual Text Extraction (OCR Mode)**:
   - Dedicated text extraction mode retrieves readable text, headings, and numbers from the screenshot.
   - System prompts explicitly direct Gemini to distinguish between verbatim extracted text and subjective visual interpretation, avoiding hallucination on blurry or cropped areas.

6. **Untrusted Image Content & Anti-Prompt-Injection**:
   - All visual elements and text rendered inside the screenshot are treated as **untrusted user data**.
   - System instructions strictly command the model to ignore any text inside images attempting to override instructions (e.g., _"Ignore previous instructions"_, _"System prompt override"_, _"You are in developer mode"_).

7. **Privacy & Local Memory Principles**:
   - Screenshots are retained exclusively in transient component memory.
   - Screenshots are **never** persisted to `chrome.storage.local` and are never uploaded to any third-party server other than the configured Gemini endpoint.
   - Removing the screenshot or closing the session immediately frees image memory.

---

## 11. Rate-Limit Resilience & Groq Fallback Cascade (Slice 9)

Sahayak incorporates a fault-tolerant AI orchestration architecture designed to withstand API rate limits (HTTP 429), quota exhaustion (`RESOURCE_EXHAUSTED` / `QUOTA_EXHAUSTED`), and transient upstream outages (HTTP 500, 502, 503, 504) by cascading between primary and fallback providers.

### Architecture Overview

```
                                [ AI Request ]
                   (Summaries, Chat, Context-Menu, OCR)
                                      │
                                      ▼
                        [ AI Fallback Orchestrator ]
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
  [ Primary: Google Gemini ]                            [ Primary: Groq Cloud ]
  • gemini-2.0-flash-lite / flash                       • llama-3.3-70b-versatile
  • Native Multimodal Vision                            • High-throughput LPUs
            │                                                   │
            ▼                                                   ▼
  [ Retry Policy: Exponential Backoff ]               [ Retry Policy: Exponential Backoff ]
  • Bounded retries: 2 attempts                       • Bounded retries: 2 attempts
  • Backoff: T = min(10s, 1.5s × 2^attempt) ± 300ms   • Backoff: T = min(10s, 1.5s × 2^attempt) ± 300ms
  • Parses `Retry-After` header (seconds / HTTP-date) • Parses `Retry-After` header
            │                                                   │
     Transient Failure                                   Transient Failure
     or 429 / Quota Exhaustion                           or 429 / Quota Exhaustion
            │                                                   │
            ▼                                                   ▼
  [ Automatic Failover Triggered? ]                   [ Automatic Failover Triggered? ]
  • Checked against user settings                     • Checked against user settings
  • Checks provider capability compatibility          • Fallback to Gemini
            │
            ▼ (If enabled & compatible)
  [ Secondary: Groq Cloud Fallback ]
  • llama-3.3-70b-versatile
  • Preserves streaming & normalized response format
            │
            ▼
  [ Return Normalized Result / Error Cascade ]
  • Single unified interface (AINormalizedResult)
  • Informative error aggregation (AICascadeExhaustedError)
```

### Core Resilience Mechanisms

1. **Exponential Backoff with Full Jitter**:
   - For transient network drops and server glitches, requests are retried up to 2 times using jittered exponential backoff:
     $$T = \min\left(10\text{s}, 1.5\text{s} \times 2^{\text{attempt}}\right) \pm \text{RandomJitter}(0, 300\text{ms})$$
   - Respects standard `Retry-After` response headers (both numeric seconds and RFC 7231 HTTP dates) if present.

2. **Strict Error Classification**:
   - **Transient (Retryable)**: HTTP 429 (Rate Limited), HTTP 500 (Internal Error), HTTP 502 (Bad Gateway), HTTP 503 (Service Unavailable), HTTP 504 (Gateway Timeout), Network Disconnects (`TypeError: Failed to fetch`), and Request Timeouts (`AbortError`).
   - **Permanent (Non-Retryable)**: HTTP 400 (Invalid Prompt / Malformed Payload), HTTP 401 / 403 (Invalid or Expired API Key), and Content Policy Violations. These fail fast without burning unnecessary attempts.

3. **Quota Exhaustion vs. Temporary Spikes**:
   - When Gemini returns `RESOURCE_EXHAUSTED` with `limit: 0` or quota exhaustion diagnostics, the cascade skips futile in-provider retries and routes immediately to the secondary fallback provider (Groq) if configured.

4. **Groq Cloud Integration**:
   - Communicates directly with `https://api.groq.com/openai/v1/chat/completions` using native `fetch`.
   - Supports state-of-the-art open-weights models running on high-speed LPU hardware:
     - `llama-3.3-70b-versatile` (Default — highly capable 70B parameter model)
     - `llama-3.1-8b-instant` (Ultra-low latency lightweight model)
     - `mixtral-8x7b-32768` (High context-window MoE model)
   - Real-time Server-Sent Events (SSE) streaming support matching Gemini's interactive chat experience.

5. **Capability-Aware Routing**:
   - Groq standard LLMs are text-only models and do not support multimodal visual tokens.
   - The orchestration layer inspects request requirements: if a request contains screenshot images (Slice 8 Screenshot-and-Ask), it will **never** attempt an invalid failover to Groq that would corrupt the user query. Multimodal requests remain bounded to Gemini.

6. **Streaming Partial-Chunk Guard**:
   - If a streaming request fails **after** initial response chunks have already been emitted to the chat UI, the orchestrator deliberately prevents starting a secondary provider cascade from scratch. This prevents duplicate and jumbled text from appearing in the user's active reading view.

7. **Configurable Failover & Independent Credentials**:
   - Users can choose either **Google Gemini** or **Groq Cloud** as their primary AI provider in the Settings page.
   - An independent **"Enable Automatic Fallback"** toggle gives users full sovereignty over whether secondary API calls are ever made.
   - Both API keys (`AIzaSy...` and `gsk_...`) are validated via independent **Test Connection** ping buttons with live round-trip latency reporting.

8. **Security & Privacy Guarantee**:
   - Both Gemini and Groq API keys are stored locally in Chrome's sandboxed `chrome.storage.local`.
   - API keys are never synchronized, sent to intermediary proxies, or logged in client diagnostics. All error loggers sanitize sensitive credential strings (`gsk_...` / `AIzaSy...`) using `sanitizeApiKey()`.

---

## 12. Interactive Element Scanner & Shadow DOM Badges (Slice 10)

Sahayak introduces Phase 3 ("The Hands") by enabling deep DOM comprehension and visual grounding. The interactive element scanner inspects the active webpage's DOM tree, extracts rich accessible metadata, assigns functional classifications, and projects lightweight numbered badges over interactive elements using an isolated Shadow DOM overlay.

### Architecture Overview

```
                                [ Active Webpage DOM ]
             (buttons, links, form inputs, textareas, selects, ARIA controls)
                                          │
                                          ▼
                             [ Element Detector Service ]
             ├── Traverses interactive candidates & filters hidden/redundant nodes
             ├── Extracts accessible names (aria-labelledby, aria-label, <label>, etc.)
             ├── Evaluates visibility (bounding box, computed style, opacity)
             └── Assigns stable session actionIds (1, 2, 3...)
                                          │
                                          ▼
                            [ Element Classifier Service ]
             ├── NAV    : Links (a[href]), menus, pagination, breadcrumbs
             ├── ACTION : Submit buttons, primary CTAs, confirm/save triggers
             ├── SEC    : Cancel, dismiss, reset, close, outline buttons
             ├── FORM   : Text inputs, selects, textareas, checkboxes, radios
             ├── SEARCH : Search inputs, searchboxes, query fields
             └── MEDIA  : Video/audio playback controls, volume sliders
                                          │
                     ┌────────────────────┴────────────────────┐
                     │                                         │
                     ▼                                         ▼
         [ Shadow DOM Overlay ]                       [ Side Panel UI ]
     (#sahayak-element-scanner-overlay)             (Agent Tab: Action Map)
  • Isolated ShadowRoot (no style bleed)        • Total element counts & category breakdown
  • High-contrast badges (pointer-events: none) • Category filter pills (All, Nav, Action...)
  • Position synced on scroll & resize          • Real-time element search filter
  • Pulsing highlight ring on selected element  • Bi-directional element click & scroll-into-view
                     ▲                                         │
                     │                 User clicks card        │
                     └─────────────────────────────────────────┘
```

### Core Capabilities

1. **Comprehensive Interactive Detection**:
   - Detects standard HTML interactive tags: `<button>`, `<a href="...">`, `<input>`, `<textarea>`, `<select>`, `<details summary>`.
   - Recognizes WAI-ARIA interactive roles: `button`, `link`, `checkbox`, `radio`, `switch`, `tab`, `combobox`, `searchbox`, `textbox`, `menuitem`, `option`.
   - Discovers custom clickable components (`[onclick]`, `[contenteditable="true"]`, `[tabindex="0"]`).
   - Automatically collapses nested interactive children (e.g. `<button><span>Label</span></button>`) into a single logical target.

2. **Multi-tier Accessible Name Resolution**:
   - Extracts accurate accessible labels following standard accessibility algorithms:
     1. `aria-labelledby` ID lookup
     2. `aria-label` attribute
     3. Associated `<label for="...">` or wrapping `<label>`
     4. `placeholder` (for inputs/textareas)
     5. `title` attribute
     6. `alt` attribute (for image buttons)
     7. Verbatim inner text content

3. **Functional Element Classification**:
   - Classifies elements into 7 distinct categories with customized badge colors:
     - **Navigation (`NAV` / `#7c3aed`)**: Links, navbar menus, pagination, breadcrumbs.
     - **Primary Action (`ACTION` / `#2563eb`)**: Form submissions, primary CTAs, save, purchase buttons.
     - **Secondary Action (`SEC` / `#4b5563`)**: Cancel, dismiss, reset, close, outline buttons.
     - **Form Input (`FORM` / `#059669`)**: Text inputs, dropdowns, checkboxes, textareas.
     - **Search Field (`SEARCH` / `#d97706`)**: Search inputs, searchboxes, query fields.
     - **Media Control (`MEDIA` / `#e11d48`)**: Video/audio players, play/pause, volume controls.
     - **Other (`OTHER` / `#0284c7`)**: Accordions, dropdown triggers, and interactive tiles.

4. **Shadow DOM Overlay & Style Isolation**:
   - Renders inside an isolated Shadow DOM root (`#sahayak-element-scanner-overlay`) appended to `document.body`.
   - Employs `:host { all: initial; }` and encapsulated CSS rules, guaranteeing zero style leakage into the host webpage and zero styling interference from the webpage's CSS.
   - Non-intrusive `pointer-events: none` on badges ensures normal typing, clicking, selecting, and scrolling remain completely uninterrupted.

5. **Scroll & Resize Viewport Synchronization**:
   - Badges automatically re-align with their underlying elements during page scrolling and window resizing.
   - Utilizes passive event listeners throttled via `requestAnimationFrame` for buttery-smooth 60fps performance without CPU lag.

6. **Bi-directional Highlighting & Smooth Scrolling**:
   - Selecting any element card in the Side Panel smoothly scrolls that element into the center of the viewport (`scrollIntoView({ behavior: 'smooth', block: 'center' })`).
   - Projects an animated pulsing neon ring (`.sahayak-highlight-ring`) around the active element bounding box and scales up the corresponding badge.

7. **Dynamic DOM Monitoring via MutationObserver**:
   - Automatically monitors single-page application (SPA) updates and dynamic DOM alterations (e.g. modals opening, items added to cart, dropdowns expanding).
   - Debounces updates (350ms) to ensure smooth browser operation.
   - **Infinite Loop Guard**: Automatically filters out and ignores any mutations originating inside Sahayak's own overlay host.

8. **Privacy & Security Boundaries**:
   - **Zero Password Collection**: Never collects or stores password field values (`<input type="password">`).
   - **Zero Telemetry**: All DOM scanning, metadata extraction, and badge positioning execute entirely client-side in the local tab without network transmission.
   - **No Automated Actions**: Scanner is strictly observational in Slice 10; does not click, submit, or manipulate page state.

---

## 13. Structured Element Selection — "Find It For Me" (Slice 11)

"Find It For Me" bridges natural language and browser automation by allowing users to locate interactive controls using everyday English or conversational Hinglish (e.g., _"Where is the search bar?"_, _"Login button kahan hai?"_, _"Locate add to cart"_).

### Architecture Overview

```
                      [ User Natural Language Query ]
               ("Find the login button", "Search bar kahan hai?")
                                      │
                                      ▼
                      [ Scanned Candidate Elements ]
                     (From Slice 10 Element Scanner)
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
     [ Local Matcher Service ]                 [ AI Matcher Service ]
  • Exact & partial label match             • Compact serialized candidates
  • Synonym dictionary (login, cart...)     • Bilingual English / Hinglish directives
  • Category & tag heuristics               • Strict anti-injection delimiters
  • Fast, 0-latency offline match           • JSON schema validation & ID guards
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
                         [ Match Ranking Engine ]
             ├── Hybrid confidence fusion (60% AI + 40% Local)
             ├── Prioritizes enabled & visible elements
             └── Detects ambiguous queries (triggers clarification)
                                      │
                                      ▼
                        [ Visual Element Focusing ]
             ├── Smooth scroll-into-view (center alignment)
             ├── Pulsing neon highlight ring & badge emphasis
             └── Multi-match navigation (Match X of Y)
```

### Core Capabilities

1. **Natural-Language Element Discovery**:
   - Accepts free-form descriptive queries such as:
     - _"Find the login button"_
     - _"Where is the search input?"_
     - _"Mujhe add to cart button dikhao"_
     - _"Download PDF report ka link kahan hai?"_
     - _"Show me the contact form submit button"_
   - Supports suggested query chips to trigger instant 1-click searches.

2. **Deterministic Local Keyword & Semantic Matcher**:
   - Operates completely client-side without network requests or API keys.
   - Normalizes text, eliminates English and Hinglish conversational stop words (`"kahan"`, `"hai"`, `"dhoondo"`, `"dikhao"`), and expands domain synonyms (e.g. `login` $\leftrightarrow$ `sign in`, `cart` $\leftrightarrow$ `bag` $\leftrightarrow$ `basket`, `search` $\leftrightarrow$ `khoj` $\leftrightarrow$ `query`).
   - If an exact match ($\ge 94\%$ confidence) is found, returns immediately with near-zero latency, saving API tokens.

3. **Gemini & Groq AI-Assisted Matching**:
   - For ambiguous, descriptive, or conversational requests, serializes candidates into a token-efficient JSON summary (excluding raw HTML and sensitive input values).
   - Injects Slice 5 language directives for Romanized Hinglish queries.
   - Enforces strict anti-prompt-injection boundaries (`<page_elements>`) treating webpage text as untrusted data.

4. **Strict Schema Validation & Hallucination Defense**:
   - Every returned `actionId` is validated against the active candidate set. Any unknown or hallucinated ID generated by the AI is strictly rejected.
   - Confidence scores are clamped to $[0.0, 1.0]$.
   - Matches are ranked in descending order of relevance.

5. **Ambiguity Detection & Clarification**:
   - When multiple candidates equally match a vague query (e.g. user asks to _"Click submit"_ on a page with both _"Submit Newsletter"_ and _"Submit Order"_), the engine flags `clarificationNeeded: true` and generates a contextual question prompting the user to choose their intended target.

6. **Shadow DOM Element Focusing & Navigation**:
   - When a match is chosen, the page smoothly scrolls to center the element in view.
   - An animated pulsing glow ring (`.sahayak-highlight-ring`) surrounds the element, and the corresponding Shadow DOM badge scales up with golden focus styling.
   - For queries with multiple matches, provides **`< Previous`** and **`Next >`** navigation controls (`Match 1 of 3`) with instant on-screen centering.

7. **Stale Element & DOM Desynchronization Guard**:
   - If a target element has been removed or modified by a single-page application (SPA) update, the UI warns the user that the element has moved and offers a 1-click **Rescan** action.

8. **Safety & Human Control**:
   - Strictly limited to finding and highlighting controls.
   - **Zero automated clicking, typing, or form submission**.
   - **Zero password value collection or transmission**.

---

## 14. Single-Step Agent Loop & HITL Approval UI (Slice 12)

Slice 12 introduces **"The Hands"** of Sahayak: a strictly controlled, single-step AI agent loop that plans browser interactions, explains its rationale, and requests explicit Human-In-The-Loop (HITL) approval before executing exactly one step at a time.

```
       [ User Instruction ] (English or Hinglish)
                 │
                 ▼
     [ Agent Planner Service ]
  ├── Serializes candidate elements (<page_elements>)
  ├── Reasons over DOM state via Gemini / Groq
  ├── Sanitizes prompt injection boundaries
  └── Offline heuristic planner fallback (scrolls, clicks, highlights)
                 │
                 ▼
       [ HITL Approval Card ]
  ├── Plain-language action description & rationale
  ├── Target element badge (#ID, label, tag)
  ├── Risk assessment (Low, Medium, High)
  ├── Mandatory confirmation checkbox for High-Risk actions
  └── Explicit buttons: [Approve & Execute]  [Reject]  [Cancel]
                 │
                 ▼ (User clicks "Approve & Execute")
   [ Cryptographic Single-Use Token ]
  └── Generates randomUUID() token; consumed immediately to block replay
                 │
                 ▼
   [ Safe Content Script Execution ]
  ├── Validates target presence & document connection (isConnected)
  ├── Rejects stale or detached elements (stale_target)
  ├── Scrolls into view + dispatches focus, mousedown, mouseup, click
  └── Strictly rejects non-http(s) navigation and arbitrary code evaluation
                 │
                 ▼
    [ Verification & Diagnostics ]
  ├── Telemetry evaluation (duration ms, didUrlChange, status)
  ├── Formulates actionable diagnostics & next step suggestion
  └── Records history in tab-isolated session
                 │
                 ▼
         [ Wait for Next Step ] (Strictly NO autonomous multi-step looping)
```

### Core Architecture & Safety Principles

1. **Controlled Single-Step Execution**:
   - The agent operates in a strict, bounded cycle:  
     `Understand → Plan → Propose → Request Approval → Execute One Step → Verify Result → Wait for Next Step`
   - **Strictly NO autonomous multi-step chaining**: one user approval authorizes exactly one browser operation.

2. **Strongly-Typed Action Schemas (Zod-Validated)**:
   - Every proposed action adheres to runtime Zod schemas:
     - `click_element`: Target element clicked via simulated native events (`focus`, `mousedown`, `mouseup`, `click`) after smooth scrolling into view.
     - `scroll_to_element`: Smoothly centers an element in the browser viewport.
     - `scroll_page`: Scrolls page up, down, top, or bottom by a specified pixel distance.
     - `navigate_to_url`: Safely navigates to validated URLs. Protocol validation strictly enforces `http:` and `https:`, blocking `javascript:`, `file:`, `data:`, and internal browser URLs.
     - `highlight_element`: Visually emphasizes an element using the Shadow DOM focus ring without interacting with it.

3. **Pre-Execution Element Highlighting**:
   - As soon as the planner proposes an element action, it immediately pulses a visual highlight ring around that element on the webpage. The user can visually inspect the exact element on screen before deciding whether to approve.

4. **Human-in-the-Loop Approval UI & Risk Escalation**:
   - Proposes actions via structured **Approval Cards** displaying:
     - Plain-language title and intent.
     - Target details (badge ID `#1`, element label, `<button>` tag).
     - Rationale and expected result.
     - Risk badge (`low`, `medium`, `high`).
   - **High-Risk Guardrails**: Actions that submit forms (`type="submit"`, `primary-action`), involve destructive keywords (`delete`, `remove`), or initiate financial transactions (`pay`, `buy`, `checkout`) automatically escalate to `high` risk and require checking an explicit confirmation checkbox before the `Approve & Execute` button becomes active.

5. **Single-Use Approval Tokens (Replay Protection)**:
   - When the user approves an action, a unique cryptographic UUID token is generated.
   - The executor marks this token as consumed into an in-memory set immediately upon dispatch.
   - Any duplicate or replayed execution attempt with the same token is strictly rejected.

6. **Content Script Safe DOM Layer**:
   - Operates strictly through native DOM methods.
   - **Zero execution of raw JavaScript, `eval`, or dynamic `Function()`**.
   - Verifies element existence and connection (`isConnected`). If an element was removed or mutated by an SPA framework, execution halts safely with `stale_target` and suggests rescanning.

7. **Tab-Isolated Session Management**:
   - Sessions are strictly partitioned by browser `tabId`. Actions, state transitions (`idle`, `planning`, `awaiting_approval`, `executing`, `completed`, `failed`, `cancelled`), and execution histories never bleed across tabs.

8. **Action Verification & Telemetry**:
   - Measures dispatch latency in milliseconds, checks if the action resulted in page navigation (`didUrlChange: true`), verifies target persistence, and formats clear diagnostic feedback to guide the user's next step.

---

## 15. Progress Persistence, Dry-Run Mode & Action Logs (Slice 13)

Slice 13 makes Sahayak's single-step agent loop resilient, auditable, and risk-free by introducing on-device state persistence, non-destructive preview simulations, and a comprehensive audit log.

```
       [ User Instruction ] (English or Hinglish)
                 │
                 ▼
     [ Agent Planner Service ]
  ├── Evaluates DOM candidates & plans single next action
  └── Checks active Dry-Run Mode setting
                 │
                 ▼
       [ HITL Approval Card ]
  ├── If Dry-Run enabled: Displays amber "Dry-Run Preview" banner
  │   └── Replaces "Approve & Execute" with "Preview Only (Dry-Run)"
  └── If Live: Standard Human-In-The-Loop explicit approval controls
                 │
                 ├─────────────────────────────────────────┐
                 │ (User clicks Preview/Approve)           │
                 ▼                                         ▼
      [ Dry-Run Mode Active ]                    [ Live Mode Active ]
  ├── Executor intercepts execution          ├── Generates single-use approval token
  ├── STRICTLY BLOCKS browser mutations      ├── Smooth scroll + native events dispatch
  ├── Zero clicks, typing, or navigation     └── Real DOM interaction performed
  └── Returns status: 'preview_only'
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                                      ▼
                        [ Action Logging Service ]
              ├── Structured lifecycle event recording:
              │   • instruction_received    • planning_started
              │   • action_proposed         • action_previewed
              │   • approval_granted        • execution_completed
              │   • action_interrupted      • session_restored
              └── Stores metadata (IDs, target labels, latency, error)
                                      │
                                      ▼
                    [ Agent Persistence Service ]
  ├── Saves versioned state to chrome.storage.local
  ├── Preserves history & completed steps across Side Panel reopen
  ├── Restores INFORMATION, never execution authority
  └── Marks interrupted state if shutdown during active execution
```

### Core Capabilities

1. **Tab-Specific Progress Persistence**:
   - Synchronizes agent session state (`sessionId`, `userInstruction`, `state`, `executedActions`, `actionResults`, `pageUrl`) into `chrome.storage.local` under versioned key `sahayak_agent_sessions_v1`.
   - Each tab retains its own independent session record. When reopening the Side Panel, Sahayak immediately restores the active tab's session and previous action history.

2. **Safe Session Restoration (No Autonomous Authority)**:
   - **Critical Safety Guard**: _Restoring a session restores information, NOT execution authority._
   - If the browser or extension was closed or restarted while an action was in `planning`, `awaiting_approval`, or `executing` state, it is restored as **`interrupted`**.
   - Any previously generated `approvalToken` is strictly deleted, and `approvalStatus` is set to `cancelled`. Stale approval authority can never be replayed.
   - The user is notified with an amber banner: _"Session Recovered (Interrupted). A previous task was interrupted by browser or extension closure. Stale execution authority has been invalidated for safety."_

3. **Centralized Dry-Run Mode**:
   - A user-facing switch allows toggling between Live Execution and Dry-Run Mode at any time.
   - When enabled:
     - Sahayak interprets user instructions, scans DOM elements, and plans real actions.
     - The Approval UI displays a clear amber indicator and a **`Preview Only (Dry-Run)`** action.
     - **Enforced at the Executor Level**: The `agentExecutorService` intercepts all execution paths, guaranteeing that **no browser clicks, typing, scrolling, or navigation events are ever dispatched**.
     - Eliminates race conditions: Even if Dry-Run is enabled between planning and approval, the central executor guard catches it and simulates the action safely.

4. **Structured Lifecycle Action Logging**:
   - Tracks 15 distinct lifecycle transitions: `session_created`, `instruction_received`, `planning_started`, `action_proposed`, `action_previewed`, `approval_granted`, `action_rejected`, `execution_started`, `execution_completed`, `execution_failed`, `target_not_found`, `target_stale`, `session_cancelled`, `session_restored`, `action_interrupted`.
   - Captures rich metadata (target action IDs, element labels, tags, URLs, durations, and diagnostic notes).
   - **Zero-Exfiltration Safety**: Passwords, form input values, full HTML, and screenshots are never stored in action logs.
   - Storage limits & automatic pruning: Enforces a configurable cap (default 200 entries), retaining the newest records while pruning older ones.

5. **Action History Interface**:
   - Dedicated **History** sub-tab inside the Agent panel.
   - Includes real-time search filtering across descriptions, element labels, and instructions.
   - Segmented filter buttons: **All**, **Success**, **Dry-Run**, **Failed**, **Rejected**, and **Interrupted**.
   - Expandable log entries displaying target details, timing, execution duration, and error diagnostics.
   - Secure **Clear History** flow with mandatory confirmation dialog that preserves active session state and extension settings.

---

## 16. Local Profile Memory (Slice 14)

Slice 14 introduces an on-device, privacy-preserving personal memory system for Sahayak. It enables personalized AI interactions across Page Chat, Article and YouTube Summaries, and Agent Planning without repetitive questions or persistent cloud profiling.

```
[ User Interaction / Explicit Instruction ]
                     │
                     ▼
       [ Memory Extraction Engine ]
   ├── English & Romanized Hinglish parsing
   ├── Categorization (Preferences, Work Context, Language, Profile, Interaction, Custom)
   ├── Conflict & duplicate detection (Proposes update vs. new entry)
   └── Credential & sensitive data guardrails (Rejects keys, passwords, CC numbers)
                     │
                     ▼
         [ Human-in-the-Loop Card ]
   ├── MemoryApprovalCard in Chat / UI
   ├── Displays Proposed Title, Category, Content & Diff
   └── Explicit "Save to Memory" / "Update Memory" / "Forget This"
                     │
                     ▼ (User Approves)
      [ Local-First Storage Service ]
   ├── Stored in chrome.storage.local (sahayak_profile_memories_v1)
   ├── Strict quota enforcement (Max 200 items, ~100 KB budget)
   └── Full export / import portability & Clear All safety
                     │
                     ▼
      [ Context Retrieval & Grounding ]
   ├── Semantic & keyword relevance scoring
   ├── Context item capping (3-5 items to protect token budget)
   ├── Untrusted <user_context> XML enclosure
   └── Prompt injection defense: User prompt ALWAYS overrides profile memories
```

### Core Architecture & Capabilities

1. **Strictly On-Device, Privacy-First Architecture**:
   - Stored exclusively in Chrome local storage (`chrome.storage.local`) under versioned key `sahayak_profile_memories_v1`.
   - **Zero Silent Collection**: Sahayak never scrapes browsing history, full chat transcripts, DOM form entries, or passwords into memory. All memories originate strictly from explicit user instructions, accepted suggestions, or manual entries.
   - Comprehensive sanitization rejects API keys (Gemini, Groq), bearer tokens, passwords, credit card numbers, and SSNs.

2. **Multi-Category Memory Taxonomy**:
   - **`preferences`**: General style, depth, and formatting guidelines (e.g., "Keep answers concise", "Use bullet points").
   - **`personal_profile`**: User identity, role, background (e.g., "Software developer", "Student").
   - **`work_context`**: Ongoing projects, repositories, frameworks, tech stacks (e.g., "Active Project: Sahayak Extension", "React & TypeScript").
   - **`language_preferences`**: Preferred response language or dialect (e.g., "Default Language: Romanized Hinglish").
   - **`interaction_preferences`**: Workflow behaviors (e.g., "Always show Dry-Run preview before action").
   - **`custom`**: Freeform user-created context notes.

3. **Natural-Language Memory Intent Detection (English & Romanized Hinglish)**:
   - Supports natural voice and text phrasing:
     - _English_: `"Remember that I prefer short explanations"`, `"Please note that I work with React and TypeScript"`, `"Forget my language preference"`.
     - _Romanized Hinglish_: `"Yaad rakhna mera project Sahayak hai"`, `"Yaad rakhna mujhe simple explanations pasand hain"`, `"Mera response style bhool jao"`.
   - **Conflict & Update Detection**: Detects semantic overlap with existing memories (e.g., changing preferred language from English to Hinglish) and presents an **Update Proposal** showing the Current vs. Proposed diff.
   - **Deletion Proposals**: Natural requests like `"Forget that I work with React"` identify matching memories and prompt for confirmation before deleting.

4. **Context Retrieval & Prompt Injection Guardrails**:
   - Evaluates stored memories against incoming questions and task contexts using multi-factor scoring (category affinity, token intersection, exact phrase matches).
   - Injects the top relevant items into an untrusted `<user_context>` XML block:
     ```xml
     <user_context>
     User Profile & Preferences:
     - [Preferences] Response Style: Concise: Keep explanations short and direct with bullet points.
     - [Language Preferences] Language Preference: Hinglish: Prefers responses in Romanized Hinglish.
     (Note: This context is provided for personalization. Current explicit user instructions always override these preferences.)
     </user_context>
     ```
   - **Explicit User Override Guarantee**: Active user prompts strictly override stored preferences (e.g., if saved preference is "Concise", but user asks for an "exhaustive deep-dive", Sahayak produces the deep dive).
   - Injected across: Page Chat, Article Summarization, YouTube Summaries, and Agent Planning.

5. **Dedicated Memory Dashboard & Controls**:
   - First-class **Memory** tab (`Brain` icon) in the Sahayak navigation bar.
   - Real-time search by title, content, or tag.
   - Category filter pills with dynamic count badges.
   - Add/Edit modal dialog with length counters and tag chip manager.
   - Individual edit, delete confirmation, and safe **Clear All** modal.
   - Settings & Storage panel:
     - Master toggle for **AI Personalization**.
     - Toggle for **Proactive Suggestions**.
     - Context item count selector (3 to 6 items).
     - Storage quota visualization bar.
     - One-click **Export JSON** and **Import JSON** for data backup and portability.

---

## 17. One-Click Reusable Skills & JSON Import/Export (Slice 15)

Sahayak introduces a **Skills System** that empowers users to save, customize, execute, import, and export reusable AI workflows that automate repetitive browser interactions, deep research, text rewriting, and structured agent operations with a single click.

```
       [ Skill Catalog Dashboard ]
  ├── Category Filters (Summarization, Research, Productivity, Writing, etc.)
  ├── Real-time search & Favorite pinning
  └── Context Compatibility Engine (checks page URL, article readability, YouTube, selection)
                    │
                    ▼ (User clicks "Run" or "Customize")
       [ Safe Template Engine ]
  ├── Mustache placeholder substitution: {{var_name}}
  ├── Input Parameter Dialog (string, number, boolean, select)
  ├── Strict zero-eval execution & HTML tag sanitization
  └── Profile Memory personalization injection (Slice 14)
                    │
                    ▼
       [ Multi-Route Execution Router ]
  ├── 'summarize'    ──> Mozilla Readability & Structured Article Summary
  ├── 'youtube'      ──> Public TimedText Transcript Summary & Timestamp Seek
  ├── 'chat'         ──> Grounded Page Chat with Active Tab Grounding
  ├── 'find_element' ──> Semantic Scanner & Shadow DOM Badge Highlighting
  ├── 'rewrite'      ──> Selected Text Tone & Readability Transformation
  └── 'agent_action' ──> Single-Step Agent Planning with Strict HITL Approval Card
                    │
                    ▼
     [ Execution History & Portable JSON ]
  ├── Local execution logs (status, duration, rendered prompt) in chrome.storage.local
  ├── Export Skills: Versioned JSON package ('sahayak-skills', v1)
  │    └── Zero-leakage guarantee: Strips all API keys, memories, and private logs
  └── Import Skills: Zod schema validation, size limits (2MB), collision resolution (rename/overwrite)
```

### Core Architecture & Capabilities

1. **Predefined Built-in Skills Library**:
   - 8 production-grade built-in workflows available immediately:
     - **Quick Article Summary**: High-level overview with 5 key points and conclusion.
     - **Detailed Article Analysis**: Structured analysis with configurable focus aspects and depth levels.
     - **Explain This Page**: Plain-language breakdown tailored to user preferences.
     - **Extract Key Information**: Extracts figures, dates, statistics, and actionable data.
     - **YouTube Video Summary**: Extracts transcripts and moments for YouTube video pages.
     - **Find Page Element**: Locates and highlights interactive components using natural language.
     - **Improve Selected Text**: Rewrites highlighted text according to selected style and tone.
     - **Ask Page with Context**: Grounded Q&A against the active webpage.
   - **Immutability Guarantee**: Original built-in skills cannot be edited or deleted. Users can customize any built-in workflow by duplicating it with one click.

2. **Safe Non-Eval Template Engine**:
   - Variables are defined using mustache syntax: `{{variable_name}}`.
   - Variable extraction automatically identifies required and optional inputs.
   - Zero dynamic code execution: strictly prevents `eval()`, `new Function()`, or script injection.
   - Input values are sanitized against HTML/XML delimiter corruption before reaching AI prompts.

3. **Context Compatibility Engine**:
   - Checks active tab context (e.g. YouTube video URL, readable article, selected text, restricted system URL).
   - Displays real-time status badges: `Ready`, `Requires YouTube`, `Select Text First`, `Restricted Page`.
   - Prevents failed requests before hitting AI endpoints.

4. **Safety & HITL Integration**:
   - Any skill routing through `agent_action` strictly executes via the Slice 12 Single-Step Agent Loop.
   - Shows the interactive `AgentApprovalCard` with single-use approval tokens and high-risk safeguards.
   - Fully respects Slice 13 Dry-Run Mode and maintains separate audit logging.

5. **Portable JSON Import & Export**:
   - Versioned schema validation using Zod (`format: "sahayak-skills"`, `version: 1`).
   - Clean exports: strictly strips credentials, Gemini/Groq API keys, profile memories, and execution logs.
   - Import collision resolution: supports non-destructive renaming (`(Copy)`) or user-confirmed overwriting.

---

## 18. Deterministic Safety Rails & Consequential Gating (Slice 16)

Sahayak incorporates a centralized, deterministic security policy engine that controls what the agent can and cannot do on active webpages, regardless of what Gemini, Groq, a Skill, or user instruction proposes.

### Core Security Guarantees

1. **Zero AI Model Delegation**:
   - Safety decisions, policy validations, and risk classifications are calculated and enforced in local application TypeScript code.
   - The agent architecture explicitly ignores and recalculates any risk level claimed by the AI model.

2. **Deterministic Risk Hierarchy**:
   - Actions are evaluated into four risk tiers:
     - `low`: Viewport scrolling, element highlighting, non-mutating inspections.
     - `medium`: Standard web navigation and ordinary UI clicks with verified accessible text.
     - `high`: Ambiguous, unlabelled targets, clickbait elements, or actions requiring enhanced user attention.
     - `critical`: Operations with external, financial, or irreversible impact (hard-blocked).

3. **Consequential Action Gating (9 Mandatory Blocked Categories)**:
   - The following operations are blocked deterministically with zero execution or approval controls:
     1. `form_submission`: Submitting forms transmitting user or page data.
     2. `payments_and_purchases`: Checkout flows, Razorpay, Stripe, PayPal, and 1-Click purchases.
     3. `financial_transfers`: Bank wire transfers, fund movements, and balance withdrawals.
     4. `messaging_and_emails`: Dispatching emails, direct messages, and chat broadcasts.
     5. `publishing_content`: Publishing blog articles, public comments, and social media posts.
     6. `destructive_operations`: Deleting accounts, clearing databases, purging records, or terminating profiles.
     7. `security_account_changes`: Modifying passwords, changing MFA/2FA settings, or revoking API credentials.
     8. `unsupported_url_schemes`: Attempted navigation to `javascript:`, `data:`, `file:`, `chrome:`, `blob:`, or malformed destinations.
     9. `sensitive_field_interaction`: Interacting with password inputs, OTP fields, PIN entries, CVV, or card number elements.

4. **Bilingual Consequential Detection (English & Romanized Hinglish)**:
   - Detects financial, destructive, and submission operations in both English and Latin-script Hinglish (e.g., `"Sab data mita do"`, `"Khareedo aur confirm karo"`, `"Bank me paise bhejo"`).

5. **Strict URL Protocol Allowlist & Credential Shield**:
   - Only standard `http:` and `https:` URLs are permitted.
   - Strictly blocks dangerous protocols (`javascript:`, `data:`, `file:`, `chrome:`, `chrome-extension:`).
   - Rejects URLs containing embedded user credentials (e.g., `https://user:pass@host/`) to prevent credential leakage.

6. **Enhanced Confirmation UI & Double-Acknowledgement**:
   - Elevated-risk actions (`high`) require a mandatory acknowledgement checkbox before the Approve button enables.
   - For `critical` blocked actions, the approval button is completely hidden and replaced with a high-visibility blocked alert banner and rule justification.

7. **Deterministic Execution Guard & Replay Prevention**:
   - Gatekeeper verifies policy decisions fresh immediately before browser dispatch.
   - Single-use approval tokens and consumed action registries prevent replay attacks.
   - Fails closed if elements dynamically mutate into form submit or password controls.
   - Dry-Run Mode preview simulation is preserved even for elevated-risk actions without triggering external mutations.

8. **Safety Audit Logging**:
   - Dedicated local storage log (`sahayak_safety_audit_logs_v1`) tracks blocked events, policy evaluations, and execution guard rejections.
   - Strictly guarantees zero collection of sensitive credentials, passwords, or input values.

---

## 19. Production Packaging, Release ZIP & Landing Page (Slice 17)

Sahayak includes a fully automated production packaging pipeline, cryptographic integrity verification, comprehensive release documentation, and a responsive public-facing product landing page.

### Release Deliverables

1. **Automated Production Validator (`scripts/validate-extension.mjs`)**:
   - Performs automated 8-point checks:
     - Manifest JSON syntax & Manifest V3 compliance.
     - Mandatory metadata (`name`, `version`, `description`).
     - Entry point existence (`service-worker-loader.js`, `sidepanel/index.html`, content scripts).
     - Required icon sizes (`16`, `32`, `48`, `128`).
     - Exclusion of dev artifacts (`.ts`, `.tsx`, `.map`, `.env`, `.git`).
     - Zero hardcoded secrets (`AIzaSy...`, `gsk_...`, private keys).
     - Zero development server references (`localhost:5173`).

2. **Automated Release Packager (`scripts/package-extension.mjs`)**:
   - Validates the bundle first, then packages the distribution into `release/`:
     - `release/sahayak-v1.0.0.zip`: Standard compressed ZIP archive ready for manual installation.
     - `release/sahayak-v1.0.0.zip.sha256`: Cryptographic SHA-256 integrity hash file.
     - `release/sahayak-v1.0.0/`: Unpacked folder directly installable via "Load unpacked".
     - `release/release-report.json`: Structured manifest, bundle size, and validation audit log.

3. **Public Product Landing Page (`docs/`)**:
   - Designed for GitHub Pages or static web deployment:
     - **Navigation Bar**: Official Sahayak branding, section links, theme toggle (dark/light), and quick download CTA.
     - **Hero Section**: Product preview frame with authentic Side Panel mockup and human-in-the-loop approval card.
     - **Feature Grid**: 12 comprehensive cards detailing all implemented capabilities.
     - **Interactive Agent Simulator**: Step-by-step interactive simulator demonstrating the understand-plan-approve-execute cycle.
     - **Privacy & Safety Section**: 9 blocked action categories table and transparent AI context disclosure.
     - **Installation Guide**: Clear step-by-step instructions for installing via "Load unpacked" with SHA-256 verification.
     - **FAQ Accordion**: 9 practical Q&As covering browser requirements, API keys, Hinglish, and safety limits.
     - **SEO & Social Metadata**: Open Graph tags, Twitter Card metadata, `robots.txt`, and `sitemap.xml`.

4. **Release Documentation Suite**:
   - [`docs/INSTALLATION.md`](docs/INSTALLATION.md): Detailed installation and troubleshooting guide.
   - [`docs/RELEASE.md`](docs/RELEASE.md): Production release checklist and verification procedures.
   - [`docs/PRIVACY.md`](docs/PRIVACY.md): Privacy policy and security declarations.
   - [`CHANGELOG.md`](CHANGELOG.md): Comprehensive version history spanning Slices 1 to 17.

---

## 20. Development & Build Scripts

| Script                       | Purpose                                                                 |
| :--------------------------- | :---------------------------------------------------------------------- |
| `npm run dev`                | Starts the Vite HMR dev server for real-time extension development.     |
| `npm run build`              | Compiles TypeScript (`tsc`) and builds Manifest V3 bundle into `dist/`. |
| `npm run preview`            | Starts a static web server to preview built assets.                     |
| `npm run validate:extension` | Validates `dist/` against MV3 standards, icons, and security leaks.     |
| `npm run package`            | Validates, generates `release/sahayak-v1.0.0.zip` and SHA-256 checksum. |
| `npm run release`            | Runs tests, builds bundle, validates, and packages end-to-end.          |
| `npm run checksum <file>`    | Calculates SHA-256 hash for any target file.                            |
| `npm run lint`               | Runs ESLint 9 across all TypeScript and React files.                    |
| `npm run format`             | Formats all files according to Prettier rules.                          |
| `npm run format:check`       | Checks that all files comply with Prettier code style.                  |
| `npm run test`               | Executes the Vitest test suite (392 unit tests across 22 test suites).  |

---

## 21. Loading the Extension in Google Chrome

1. Build and package the production bundle:
   ```bash
   npm run package
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** via the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `release/sahayak-v1.0.0` directory inside this repository (`d:\Sahayak\release\sahayak-v1.0.0`).
6. Click the Sahayak icon in the Chrome toolbar to open the Side Panel.
