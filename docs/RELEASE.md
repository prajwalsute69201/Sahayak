# Sahayak (सहायक) — Release & Build Verification Guide

> **Release Version**: v1.0.0  
> **Release Target**: Google Chrome Extension (Manifest V3)  
> **Package Architecture**: Single-Step HITL Browser Agent

---

## 1. Automated Release Commands

The Sahayak release pipeline is fully automated and reproducible:

| Command                      | Action                                                         | Output           |
| :--------------------------- | :------------------------------------------------------------- | :--------------- |
| `npm run build`              | Compiles TypeScript and builds MV3 bundle via Vite & CRXJS     | `dist/`          |
| `npm run validate:extension` | Executes 8-point automated MV3 and security leak checks        | Console report   |
| `npm run package`            | Validates bundle, creates versioned ZIP, and generates SHA-256 | `release/`       |
| `npm run release`            | Runs test suite, builds, validates, and packages end-to-end    | Complete release |
| `npm run checksum <file>`    | Computes SHA-256 hash for any target file                      | SHA-256 hash     |

---

## 2. Release Package Structure

Running `npm run package` creates the following directory structure:

```text
release/
├── sahayak-v1.0.0.zip              # Compressed distribution ZIP for manual installation
├── sahayak-v1.0.0.zip.sha256       # Cryptographic SHA-256 checksum file
├── release-report.json             # Structured build, manifest, and validation report
└── sahayak-v1.0.0/                 # Unpacked directory ready for "Load unpacked"
    ├── manifest.json               # Chrome Extension Manifest V3
    ├── service-worker-loader.js    # Background service worker entry point
    ├── badges.css                  # Isolated styling for Shadow DOM badges
    ├── logo.png                    # Brand logo assets
    ├── logo-dark.png
    ├── logo-icon.png
    ├── icons/                      # Extension icons (16px, 32px, 48px, 128px)
    │   ├── icon-16.png
    │   ├── icon-32.png
    │   ├── icon-48.png
    │   └── icon-128.png
    ├── src/
    │   └── sidepanel/
    │       └── index.html          # Side Panel container page
    └── assets/                     # Minified, content-hashed production JS & CSS
        ├── sidepanel-*.js
        ├── sidepanel-*.css
        └── agent-content-executor-*.js
```

---

## 3. Production Release Checklist

Before distributing or publishing any release, verify each of the following points:

### A. Build & Code Quality

- [x] All 21 test suites and 375 tests pass (`npm test`).
- [x] TypeScript compiler passes with zero warnings or errors (`npx tsc --noEmit`).
- [x] ESLint 9 passes with zero warnings or errors (`npm run lint`).
- [x] Prettier code style check passes (`npm run format:check`).
- [x] Production build executes without errors (`npm run build`).

### B. Manifest & Security Hygiene

- [x] `manifest_version` equals `3`.
- [x] Extension version in `package.json` and `manifest.json` match (`1.0.0`).
- [x] All 4 icon sizes (16, 32, 48, 128) exist on disk.
- [x] Zero source maps (`.map`) or TypeScript source files (`.ts`, `.tsx`) in release output.
- [x] Zero hardcoded API keys (`AIzaSy...`, `gsk_...`) or private keys.
- [x] Zero local development server references (`http://localhost:5173`).

### C. Functional Smoke Testing in Google Chrome

- [x] **Load Unpacked**: Extension installs cleanly from `release/sahayak-v1.0.0/` without errors in `chrome://extensions`.
- [x] **Side Panel Launch**: Clicking the toolbar icon smoothly opens the Side Panel on the active tab.
- [x] **Tab Navigation**: Summary, Chat, Find, Agent, Skills, Memory, and Settings tabs switch responsively.
- [x] **API Connectivity**: Entering a Gemini API key and clicking _Test Connection_ displays the latency badge.
- [x] **Dry-Run Mode**: Enabling Dry-Run Mode simulates actions without mutating the browser DOM.
- [x] **Deterministic Safety**: Proposing a payment or form submit immediately displays the `BLOCKED` notice with zero approval controls.
- [x] **Session Persistence**: Closing and reopening the Side Panel restores previous session history.

---

## 4. Release Integrity

Every published release includes an immutable SHA-256 checksum file. To verify release integrity on Windows, macOS, or Linux:

```bash
# Verify using the built-in Sahayak release tool
npm run checksum release/sahayak-v1.0.0.zip
```
