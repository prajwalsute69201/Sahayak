/**
 * Slice 17: Production Packaging, Release ZIP & Landing Page Test Suite
 * Comprehensive verification of:
 * - Manifest V3 Production Validation
 * - Security Leak & Credential Scans
 * - Release Packaging, ZIP Directory Structure & SHA-256 Checksum
 * - Release Report Generation & Schema Integrity
 * - Landing Page Semantic Structure, SEO Meta Tags & Asset Separation
 * - Release Documentation Completeness
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error - Pure ESM script without ambient types
import { validateExtension } from '../scripts/validate-extension.mjs';
// @ts-expect-error - Pure ESM script without ambient types
import { packageExtension } from '../scripts/package-extension.mjs';
// @ts-expect-error - Pure ESM script without ambient types
import { calculateSha256, verifyChecksum } from '../scripts/generate-checksum.mjs';

describe('Slice 17: Production Packaging, Release ZIP & Landing Page', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const releaseDir = path.join(rootDir, 'release');
  const docsDir = path.join(rootDir, 'docs');

  /* -------------------------------------------------------------------------- */
  /* A. Manifest V3 & Build Artifact Validation                                 */
  /* -------------------------------------------------------------------------- */
  describe('A. Manifest V3 & Build Output Validation', () => {
    it('validates that production build passes all automated MV3 checks', () => {
      const result = validateExtension(distDir);

      expect(result.valid).toBe(true);
      expect(result.manifestVersion).toBe(3);
      expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(result.checks.manifestSyntax).toBe(true);
      expect(result.checks.manifestV3).toBe(true);
      expect(result.checks.requiredMetadata).toBe(true);
      expect(result.checks.entryPointsExist).toBe(true);
      expect(result.checks.iconsExist).toBe(true);
      expect(result.checks.noForbiddenFiles).toBe(true);
      expect(result.checks.noSecretsDetected).toBe(true);
      expect(result.checks.noDevServerReferences).toBe(true);
      expect(
        result.issues.filter((i: { severity: string }) => i.severity === 'error')
      ).toHaveLength(0);
    });

    it('detects and flags invalid manifest versions', () => {
      // Test simulated invalid manifest
      const tempDist = path.join(rootDir, 'dist-test-invalid-mv');
      fs.mkdirSync(tempDist, { recursive: true });
      fs.writeFileSync(
        path.join(tempDist, 'manifest.json'),
        JSON.stringify({
          manifest_version: 2,
          name: 'Old Extension',
          version: '1.0.0',
          description: 'Deprecated',
        })
      );

      const result = validateExtension(tempDist);
      expect(result.valid).toBe(false);
      expect(result.checks.manifestV3).toBe(false);
      expect(
        result.issues.some((i: { category: string }) => i.category === 'manifest_version')
      ).toBe(true);

      fs.rmSync(tempDist, { recursive: true, force: true });
    });

    it('ensures all required icon sizes exist on disk (16, 32, 48, 128)', () => {
      const manifestPath = path.join(distDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const sizes = ['16', '32', '48', '128'];
      for (const size of sizes) {
        const iconPath = manifest.icons[size];
        expect(iconPath).toBeDefined();
        const fullIconPath = path.join(distDir, iconPath);
        expect(fs.existsSync(fullIconPath)).toBe(true);
        expect(fs.statSync(fullIconPath).size).toBeGreaterThan(0);
      }
    });

    it('confirms background service worker and sidepanel HTML exist', () => {
      const manifestPath = path.join(distDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const swPath = path.join(distDir, manifest.background.service_worker);
      expect(fs.existsSync(swPath)).toBe(true);

      const spPath = path.join(distDir, manifest.side_panel.default_path);
      expect(fs.existsSync(spPath)).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* B. Security Leak & Dev Artifact Cleanliness                                */
  /* -------------------------------------------------------------------------- */
  describe('B. Security & Artifact Hygiene', () => {
    it('verifies zero TypeScript source files or source maps in dist', () => {
      function checkNoDevFiles(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkNoDevFiles(fullPath);
          } else if (entry.isFile()) {
            expect(entry.name.endsWith('.ts')).toBe(false);
            expect(entry.name.endsWith('.tsx')).toBe(false);
            expect(entry.name.endsWith('.map')).toBe(false);
            expect(entry.name.endsWith('.env')).toBe(false);
          }
        }
      }
      checkNoDevFiles(distDir);
    });

    it('verifies zero hardcoded API keys or credentials in bundled scripts', () => {
      const result = validateExtension(distDir);
      expect(result.checks.noSecretsDetected).toBe(true);
    });

    it('verifies zero local dev server URLs (localhost:5173) in production bundle', () => {
      const result = validateExtension(distDir);
      expect(result.checks.noDevServerReferences).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* C. Release Packaging & Checksum Verification                               */
  /* -------------------------------------------------------------------------- */
  describe('C. Release Packaging, ZIP & SHA-256 Integrity', () => {
    let packageResult: ReturnType<typeof packageExtension>;

    beforeAll(() => {
      packageResult = packageExtension({ distDir, releaseDir });
    });

    it('generates versioned release folder and ZIP archive', () => {
      expect(fs.existsSync(packageResult.zipFilePath)).toBe(true);
      expect(fs.existsSync(packageResult.unpackedDir)).toBe(true);
      expect(fs.existsSync(packageResult.checksumFilePath)).toBe(true);
      expect(fs.existsSync(packageResult.reportFilePath)).toBe(true);

      expect(packageResult.zipStats.fileCount).toBeGreaterThanOrEqual(15);
      expect(packageResult.zipStats.compressedSize).toBeGreaterThan(0);
      expect(packageResult.zipStats.uncompressedSize).toBeGreaterThan(
        packageResult.zipStats.compressedSize
      );
    });

    it('computes a valid 64-character SHA-256 checksum for the release archive', () => {
      const hash = calculateSha256(packageResult.zipFilePath);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe(packageResult.sha256);

      // Verify checksum file content matches
      const checksumContent = fs.readFileSync(packageResult.checksumFilePath, 'utf8');
      expect(checksumContent).toContain(hash);
      expect(verifyChecksum(packageResult.zipFilePath, hash)).toBe(true);
    });

    it('produces a complete and well-formed release-report.json', () => {
      const report = JSON.parse(fs.readFileSync(packageResult.reportFilePath, 'utf8'));

      expect(report.name).toBe('Sahayak - User-Controlled Browser Agent');
      expect(report.version).toBe('1.0.0');
      expect(report.manifestVersion).toBe(3);
      expect(report.zipArchive.filename).toBe('sahayak-v1.0.0.zip');
      expect(report.zipArchive.sha256).toBe(packageResult.sha256);
      expect(report.validation.passed).toBe(true);
      expect(report.manifestSummary.permissions).toContain('sidePanel');
      expect(report.manifestSummary.permissions).toContain('storage');
      expect(Array.isArray(report.files)).toBe(true);
      expect(report.files.length).toBe(report.unpackedPackage.fileCount);
    });

    it('verifies unpacked package is directly installable with manifest.json at root', () => {
      const unpackedManifest = path.join(packageResult.unpackedDir, 'manifest.json');
      expect(fs.existsSync(unpackedManifest)).toBe(true);

      const manifestContent = JSON.parse(fs.readFileSync(unpackedManifest, 'utf8'));
      expect(manifestContent.manifest_version).toBe(3);
      expect(manifestContent.name).toBe('Sahayak - User-Controlled Browser Agent');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* D. Landing Page Structure, Branding & Assets                               */
  /* -------------------------------------------------------------------------- */
  describe('D. Landing Page Design & Public Assets', () => {
    it('verifies docs/index.html exists and contains all required sections', () => {
      const htmlPath = path.join(docsDir, 'index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);

      const html = fs.readFileSync(htmlPath, 'utf8');

      // Navigation Bar
      expect(html).toContain('Sahayak');
      expect(html).toContain('nav-menu');
      expect(html).toContain('#features');
      expect(html).toContain('#how-it-works');
      expect(html).toContain('#privacy');
      expect(html).toContain('#install');

      // Hero Section
      expect(html).toContain('Your AI Assistant,');
      expect(html).toContain('Right Inside Your Browser.');
      expect(html).toMatch(/Every browser mutation requires explicit human\s+approval/);

      // Feature Highlights (12 cards)
      expect(html).toContain('AI Article Summarization');
      expect(html).toContain('Public YouTube Summaries');
      expect(html).toContain('Grounded Page Chat');
      expect(html).toContain('Screenshot-and-Ask');
      expect(html).toMatch(/English (&|&amp;) Hinglish Support/);
      expect(html).toContain('Interactive Element Scanner');
      expect(html).toContain('Find It For Me');
      expect(html).toContain('Single-Step Agent Loop');
      expect(html).toMatch(/Dry-Run Mode (&|&amp;) Action Logs/);
      expect(html).toContain('Local Profile Memory');
      expect(html).toContain('One-Click Reusable Skills');
      expect(html).toContain('Deterministic Safety Rails');

      // How It Works
      expect(html).toContain('1. Understand');
      expect(html).toContain('2. Assist');
      expect(html).toContain('3. Stay in Control');

      // Interactive Agent Simulator
      expect(html).toContain('simulator-box');
      expect(html).toContain('sim-content');

      // Privacy & Safety Section with 9 blocked categories
      expect(html).toContain('Immutable Consequential Action Gating');
      expect(html).toMatch(/Payments (&|&amp;) Checkout/);
      expect(html).toContain('Financial Transfers');
      expect(html).toContain('Form Submissions');
      expect(html).toContain('Destructive Actions');

      // Installation Section
      expect(html).toContain('Install Sahayak in Under 2 Minutes');
      expect(html).toContain('chrome://extensions');
      expect(html).toContain('Load unpacked');

      // FAQ Section
      expect(html).toContain('Frequently Asked Questions');
      expect(html).toContain('What is Sahayak');
      expect(html).toContain('Does Sahayak perform browser actions automatically?');

      // Footer
      expect(html).toContain('site-footer');
      expect(html).toContain('Zero Telemetry');
    });

    it('verifies landing page assets exist and are isolated from extension runtime', () => {
      const stylesPath = path.join(docsDir, 'styles.css');
      const appJsPath = path.join(docsDir, 'app.js');
      const logoPath = path.join(docsDir, 'assets/logo.png');
      const iconPath = path.join(docsDir, 'assets/icons/icon-128.png');

      expect(fs.existsSync(stylesPath)).toBe(true);
      expect(fs.existsSync(appJsPath)).toBe(true);
      expect(fs.existsSync(logoPath)).toBe(true);
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    it('verifies SEO tags and Open Graph metadata in index.html', () => {
      const htmlPath = path.join(docsDir, 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');

      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain('<link rel="icon"');
    });

    it('verifies robots.txt and sitemap.xml exist for web hosting', () => {
      expect(fs.existsSync(path.join(docsDir, 'robots.txt'))).toBe(true);
      expect(fs.existsSync(path.join(docsDir, 'sitemap.xml'))).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* E. Release Documentation Completeness                                      */
  /* -------------------------------------------------------------------------- */
  describe('E. Release Documentation Suite', () => {
    it('verifies INSTALLATION.md, RELEASE.md, PRIVACY.md, and CHANGELOG.md exist', () => {
      expect(fs.existsSync(path.join(docsDir, 'INSTALLATION.md'))).toBe(true);
      expect(fs.existsSync(path.join(docsDir, 'RELEASE.md'))).toBe(true);
      expect(fs.existsSync(path.join(docsDir, 'PRIVACY.md'))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, 'CHANGELOG.md'))).toBe(true);
    });

    it('verifies version consistency across manifest, package.json, and changelog', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
      const changelog = fs.readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');

      expect(pkg.version).toBe('1.0.0');
      expect(manifest.version).toBe('1.0.0');
      expect(changelog).toContain('[1.0.0]');
    });
  });
});
