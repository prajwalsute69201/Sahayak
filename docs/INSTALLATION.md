# Sahayak (सहायक) — Installation & Setup Guide

> **Target Platform**: Google Chrome 116+ (or compatible Chromium browsers)  
> **Extension Architecture**: Manifest V3 Side Panel  
> **Release Version**: v1.0.0

---

## 1. Quick Installation (Unpacked Release ZIP)

Installing Sahayak takes less than two minutes via Chrome's native **Developer Mode**.

### Step 1: Download and Extract

1. Download the release archive: [`sahayak-v1.0.0.zip`](../release/sahayak-v1.0.0.zip).
2. Extract the archive into a permanent folder on your computer:
   - **Windows**: `C:\Users\<YourUser>\Sahayak-v1.0.0`
   - **macOS / Linux**: `~/Applications/Sahayak-v1.0.0` or `~/sahayak`
3. Verify that the extracted directory directly contains `manifest.json`, `service-worker-loader.js`, and `assets/`.

### Step 2: Open Chrome Extensions

1. Open Google Chrome.
2. Navigate to:
   ```text
   chrome://extensions
   ```
3. In the top-right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.

### Step 3: Load Unpacked Extension

1. Click the **Load unpacked** button located in the top-left toolbar.
2. In the file picker dialog, select the extracted folder from Step 1.
3. The **Sahayak - User-Controlled Browser Agent** extension card will appear in your extension list with an active status.

### Step 4: Pin to Toolbar

1. Click the puzzle-piece icon (Extensions menu) in the top-right Chrome toolbar.
2. Find **Sahayak** and click the **Pin** icon.
3. Click the Sahayak icon to immediately open the Side Panel on your active tab.

---

## 2. API Key Configuration

Sahayak connects directly to AI providers without routing your prompts through intermediary servers.

### Recommended: Google Gemini (Free & Low-Latency)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **Create API Key**.
3. Copy your key (`AIzaSy...`).
4. In the Sahayak Side Panel, open the **Settings** tab (gear icon).
5. Paste your key into the **Gemini API Key** field.
6. Click **Test Connection** (⚡) to verify latency.
7. Click **Save Changes**.

### Optional: Groq Fallback (High-Speed Llama 3.3)

1. Visit [Groq Console](https://console.groq.com/keys).
2. Create an API key (`gsk_...`).
3. In Sahayak Settings, paste your key into the **Groq API Key** field.
4. Enable **Auto-Failover to Groq** to maintain continuity when Gemini encounters HTTP 429 rate limits.

---

## 3. Chrome Permissions Explanation

| Permission     | Purpose in Sahayak                                                                                |
| :------------- | :------------------------------------------------------------------------------------------------ |
| `sidePanel`    | Displays the extension UI alongside the active webpage without obstructing content.               |
| `activeTab`    | Grants temporary read-only access to the active webpage when you invoke Sahayak actions.          |
| `scripting`    | Executes the Readability extractor, element highlighter, and DOM badges on your command.          |
| `storage`      | Saves your API credentials, local preferences, and action logs locally in `chrome.storage.local`. |
| `contextMenus` | Registers right-click shortcuts (_Explain_, _Summarize_, _Translate_, _Rewrite Selection_).       |
| `<all_urls>`   | Allows grounded chat and element scanning across any standard web domain.                         |

---

## 4. Verifying Release Package Integrity

Before installing, you can cryptographically verify that the release ZIP has not been altered:

```bash
# Windows PowerShell
Get-FileHash release/sahayak-v1.0.0.zip -Algorithm SHA256

# macOS / Linux
shasum -a 256 release/sahayak-v1.0.0.zip
```

Compare the output hash against the authoritative [`release/sahayak-v1.0.0.zip.sha256`](../release/sahayak-v1.0.0.zip.sha256) file:

```text
f15f34d2dd57dce2782ea94cf41e96330a04b9544f571002921602202dc38faa
```

---

## 5. Troubleshooting & FAQ

### Issue: "Could not load extension — manifest.json is missing or unreadable"

- Ensure you selected the folder containing `manifest.json`, not a parent enclosing directory.

### Issue: "Side Panel does not open when clicking the toolbar icon"

- Ensure your Google Chrome version is 116 or higher (`chrome://settings/help`).
- Check that the active tab is not a restricted internal page (`chrome://`, `chrome-extension://`, or the Chrome Web Store).

### Issue: "API key error: Gemini API key is missing or invalid"

- Verify that your key was saved in the Settings tab.
- Click **Test Connection** to confirm connectivity.
- Check that your network or firewall allows outbound HTTPS requests to `generativelanguage.googleapis.com`.
