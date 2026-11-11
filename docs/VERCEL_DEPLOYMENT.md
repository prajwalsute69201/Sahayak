# Sahayak Landing Page & Interactive Showcase — Vercel Deployment Guide

This guide provides complete instructions for deploying the **Sahayak Landing Page & Interactive Showcase** to **Vercel** with continuous deployment linked to GitHub.

---

## 1. Project Architecture Overview

| Property                           | Value / Description                                                                      |
| :--------------------------------- | :--------------------------------------------------------------------------------------- |
| **GitHub Repository**              | `https://github.com/prajwalsute69201/Sahayak.git`                                        |
| **Production Branch**              | `main`                                                                                   |
| **Landing Page Directory**         | `docs/`                                                                                  |
| **Technology Stack**               | Vanilla HTML5, CSS3, JavaScript (ES6+) — Zero Build Step                                 |
| **Framework Preset**               | `Other`                                                                                  |
| **Root Vercel Config**             | [`vercel.json`](file:///d:/Sahayak/vercel.json) (`outputDirectory: "docs"`)              |
| **Docs Vercel Config**             | [`docs/vercel.json`](file:///d:/Sahayak/docs/vercel.json) (for isolated root deployment) |
| **Required Environment Variables** | **None** (100% client-side simulated showcase, zero server credentials)                  |

### Key Directory Structure

```text
docs/
├── index.html           # Main HTML entry point & Showcase markup
├── styles.css           # Responsive styling (Mobile, Tablet, Desktop)
├── showcase.js          # Interactive 7-tab simulation engine
├── app.js               # Navigation, smooth scroll, theme toggle
├── robots.txt           # Search crawler directives
├── sitemap.xml          # SEO sitemap
├── vercel.json          # Vercel configuration for docs root
└── assets/              # Logos, screenshots, and icons
    ├── logo.png
    ├── logo-dark.png
    ├── logo-icon.png
    └── icons/
```

---

## 2. Interactive Showcase (7 Live Demo Tabs)

The landing page features an embedded, interactive browser simulation replicating all core Sahayak capabilities without mutating external websites or calling paid AI APIs:

1. **Summary Tab**: Demonstrates bilingual (English/Hinglish) article summarization with Quick and Detailed mode toggles, key points extraction, and a functional "Copy Summary" button.
2. **Chat Tab**: Interactive page chat allowing users to type questions or choose sample prompts ("What are the key points?", "Explain in Hinglish") with realistic simulated responses and typing indicators.
3. **Find Tab**: Natural language element search with interactive query suggestions ("Find pricing section", "Where is the demo button?"), real-time query filtering, and visual browser element highlighting.
4. **Agent Tab**: Human-in-the-loop (HITL) browser action approval workflow featuring Dry-Run Mode, risk badges (Safe / Warning / High), and interactive Approve/Reject actions with execution feedback.
5. **Skills Tab**: One-click reusable browser automations (Quick Article Summary, Detailed Article Analysis, Explain This Page, Extract Action Items) with interactive execution triggers.
6. **Memory Tab**: Local on-device profile and preferences memory demonstration, allowing users to inspect and clear saved preferences.
7. **Settings Tab**: Interactive preference configuration (Language, AI Model selector, Dry-Run toggle) with state persistence feedback.

---

## 3. Deployment Steps via Vercel Dashboard

### Option A: Standard Deployment (Recommended)

This approach deploys the repository directly from the root using the root [`vercel.json`](file:///d:/Sahayak/vercel.json).

1. Log into your account at [vercel.com](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import the GitHub repository: **`prajwalsute69201/Sahayak`**.
4. In the **Configure Project** screen:
   - **Project Name**: `sahayak` (or `sahayak-app`)
   - **Framework Preset**: **Other**
   - **Root Directory**: `./` (leave default)
   - **Build and Output Settings**:
     - _Build Command_: Leave empty (disabled)
     - _Output Directory_: **`docs`** (or leave to be read from `vercel.json`)
     - _Install Command_: Leave empty (disabled)
5. **Environment Variables**: Leave empty (no secrets needed).
6. Click **Deploy**.

---

### Option B: Deploy with Root Directory Set to `docs`

If you prefer setting the Root Directory directly in the Vercel project settings:

1. In the **Configure Project** screen:
   - Click **Edit** next to **Root Directory**.
   - Select or type **`docs`**.
   - **Framework Preset**: **Other**.
   - **Build Command**: Leave empty.
   - **Output Directory**: Leave empty (defaults to current directory `.`).
   - **Install Command**: Leave empty.
2. Click **Deploy**.

Vercel will detect [`docs/vercel.json`](file:///d:/Sahayak/docs/vercel.json) and automatically apply all security headers, clean URLs, and asset cache rules.

---

## 4. Deployment via Vercel CLI

If you have the [Vercel CLI](https://vercel.com/docs/cli) installed locally:

```bash
# 1. Log in to Vercel
npx vercel login

# 2. Preview Deployment
npx vercel

# 3. Production Deployment
npx vercel --prod
```

---

## 5. Security & HTTP Header Hardening

Both `vercel.json` files configure production-grade HTTP security headers:

- **`X-Content-Type-Options: nosniff`**: Prevents MIME-type sniffing.
- **`X-Frame-Options: DENY`**: Protects the site against clickjacking attacks.
- **`X-XSS-Protection: 1; mode=block`**: Enables legacy XSS filtering.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Limits leakage of referrer URLs.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: Disables browser hardware access for visitors.
- **`Cache-Control: public, max-age=31536000, immutable`**: Applies 1-year caching to static assets in `/assets/*`.

---

## 6. Custom Domain Configuration (Optional)

To link a custom domain (e.g., `sahayak.app` or `www.sahayak.app`):

1. In your Vercel project dashboard, go to **Settings** > **Domains**.
2. Enter your custom domain and click **Add**.
3. Configure your DNS provider with the recommended records provided by Vercel:
   - **A Record**: `@` points to `76.76.21.21`
   - **CNAME Record**: `www` points to `cname.vercel-dns.com`
4. Vercel automatically provisions and renews a free Let's Encrypt SSL/TLS certificate.

---

## 7. Verification Checklist

After deployment finishes, verify the live production URL:

- [ ] **Homepage Renders**: Hero section, value propositions, and CTA buttons display properly.
- [ ] **Interactive Showcase**: Click across all 7 tabs (**Summary**, **Chat**, **Find**, **Agent**, **Skills**, **Memory**, **Settings**). Ensure each tab switches smoothly and action buttons (e.g. "Run Demo", "Send", "Approve & Execute") function.
- [ ] **Navigation & Links**: Test smooth scrolling for `#features`, `#showcase`, `#how-it-works`, `#privacy`, `#faq`, and the "Add to Chrome" / GitHub release links.
- [ ] **Mobile Responsiveness**: Test on mobile viewports; verify mobile hamburger menu opens and closes.
- [ ] **Assets & Icons**: Confirm brand logos and feature icons load with HTTP 200 OK without 404 errors.
- [ ] **Console Cleanliness**: Open DevTools console (`F12`); confirm 0 JavaScript errors or warnings.
