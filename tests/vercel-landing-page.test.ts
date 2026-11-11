import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Window } from 'happy-dom';

describe('Sahayak Landing Page Production & Vercel Readiness', () => {
  const docsDir = path.resolve('docs');

  it('contains all required static entry point files', () => {
    expect(fs.existsSync(path.join(docsDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'styles.css'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'showcase.js'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'app.js'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'robots.txt'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'sitemap.xml'))).toBe(true);
  });

  it('contains all required logo and icon assets', () => {
    const assetsDir = path.join(docsDir, 'assets');
    const iconsDir = path.join(assetsDir, 'icons');

    expect(fs.existsSync(path.join(assetsDir, 'logo.png'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDir, 'logo-dark.png'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDir, 'logo-icon.png'))).toBe(true);

    expect(fs.existsSync(path.join(iconsDir, 'icon-16.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-32.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-48.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-128.png'))).toBe(true);
  });

  it('has zero hardcoded API keys or secrets in docs directory', () => {
    const files = fs.readdirSync(docsDir).filter((f) => /\.(html|js|css|json|md)$/.test(f));
    const secretRegexes = [
      /AIzaSy[0-9A-Za-z_-]{33}/,
      /gsk_[0-9A-Za-z]{40,}/,
      /sk-[0-9A-Za-z]{32,}/,
      /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    ];

    for (const file of files) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
      for (const regex of secretRegexes) {
        expect(regex.test(content)).toBe(false);
      }
    }
  });

  it('has zero internal development Slice references in docs directory', () => {
    const files = fs.readdirSync(docsDir).filter((f) => /\.(html|js|css)$/.test(f));
    for (const file of files) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
      expect(content).not.toMatch(/Slice \d+/i);
    }
  });

  it('validates all local asset references in index.html exist on disk', () => {
    const html = fs.readFileSync(path.join(docsDir, 'index.html'), 'utf8');
    const window = new Window();
    const document = window.document;
    document.write(html);

    // Check images
    const images = Array.from(document.querySelectorAll('img'));
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        const cleanPath = src.split('?')[0].split('#')[0];
        const diskPath = path.join(docsDir, cleanPath);
        expect(fs.existsSync(diskPath), `Missing image: ${src}`).toBe(true);
      }
    }

    // Check link tags (CSS, icons)
    const links = Array.from(
      document.querySelectorAll(
        'link[rel="stylesheet"], link[rel="icon"], link[rel="apple-touch-icon"]'
      )
    );
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http')) {
        const cleanPath = href.split('?')[0].split('#')[0];
        const diskPath = path.join(docsDir, cleanPath);
        expect(fs.existsSync(diskPath), `Missing link asset: ${href}`).toBe(true);
      }
    }

    // Check script tags
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    for (const script of scripts) {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('http')) {
        const cleanPath = src.split('?')[0].split('#')[0];
        const diskPath = path.join(docsDir, cleanPath);
        expect(fs.existsSync(diskPath), `Missing script asset: ${src}`).toBe(true);
      }
    }
  });

  it('ensures Vercel configuration files exist and are valid JSON', () => {
    const rootConfig = path.resolve('vercel.json');
    const docsConfig = path.join(docsDir, 'vercel.json');

    expect(fs.existsSync(rootConfig)).toBe(true);
    expect(fs.existsSync(docsConfig)).toBe(true);

    const rootParsed = JSON.parse(fs.readFileSync(rootConfig, 'utf8'));
    const docsParsed = JSON.parse(fs.readFileSync(docsConfig, 'utf8'));

    expect(rootParsed.cleanUrls).toBe(true);
    expect(docsParsed.cleanUrls).toBe(true);
    expect(Array.isArray(rootParsed.headers)).toBe(true);
    expect(Array.isArray(docsParsed.headers)).toBe(true);
  });

  it('validates direct download button links to release ZIP and assets exist on disk', () => {
    const zipPath = path.join(docsDir, 'sahayak-v1.0.0.zip');
    const checksumPath = path.join(docsDir, 'sahayak-v1.0.0.zip.sha256');

    expect(fs.existsSync(zipPath)).toBe(true);
    expect(fs.statSync(zipPath).size).toBeGreaterThan(500 * 1024); // > 500KB
    expect(fs.existsSync(checksumPath)).toBe(true);

    const html = fs.readFileSync(path.join(docsDir, 'index.html'), 'utf8');
    const window = new Window();
    const document = window.document;
    document.write(html);

    const downloadBtn = document.getElementById('download-zip-btn');
    expect(downloadBtn).not.toBeNull();
    expect(downloadBtn?.getAttribute('href')).toBe('sahayak-v1.0.0.zip');
    expect(downloadBtn?.getAttribute('download')).toBe('sahayak-v1.0.0.zip');
  });
});
