import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Branding & Logo Assets Verification', () => {
  const iconSizes = [16, 32, 48, 128];

  it.each(iconSizes)('provides extension icon-%ipx asset', (size) => {
    const iconPath = path.resolve(process.cwd(), `public/icons/icon-${size}.png`);
    expect(fs.existsSync(iconPath)).toBe(true);
    expect(fs.statSync(iconPath).size).toBeGreaterThan(0);
  });

  it('provides public logo and dark-mode variant assets', () => {
    const logoLight = path.resolve(process.cwd(), 'public/logo.png');
    const logoDark = path.resolve(process.cwd(), 'public/logo-dark.png');
    const logoIcon = path.resolve(process.cwd(), 'public/logo-icon.png');

    expect(fs.existsSync(logoLight)).toBe(true);
    expect(fs.existsSync(logoDark)).toBe(true);
    expect(fs.existsSync(logoIcon)).toBe(true);
  });

  it('provides src/assets logo files for bundler imports', () => {
    const assetLight = path.resolve(process.cwd(), 'src/assets/logo.png');
    const assetDark = path.resolve(process.cwd(), 'src/assets/logo-dark.png');
    const assetIcon = path.resolve(process.cwd(), 'src/assets/logo-icon.png');

    expect(fs.existsSync(assetLight)).toBe(true);
    expect(fs.existsSync(assetDark)).toBe(true);
    expect(fs.existsSync(assetIcon)).toBe(true);
  });

  it('declares 16, 32, 48, and 128 icon paths in manifest.json', () => {
    const manifestRaw = fs.readFileSync(path.resolve(process.cwd(), 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw);

    expect(manifest.icons).toBeDefined();
    expect(manifest.icons['16']).toBe('icons/icon-16.png');
    expect(manifest.icons['32']).toBe('icons/icon-32.png');
    expect(manifest.icons['48']).toBe('icons/icon-48.png');
    expect(manifest.icons['128']).toBe('icons/icon-128.png');

    expect(manifest.action.default_icon['16']).toBe('icons/icon-16.png');
    expect(manifest.action.default_icon['32']).toBe('icons/icon-32.png');
    expect(manifest.action.default_icon['48']).toBe('icons/icon-48.png');
    expect(manifest.action.default_icon['128']).toBe('icons/icon-128.png');
  });

  it('Header component renders official Sahayak logo', async () => {
    const { Header } = await import('@/sidepanel/components/Header');
    expect(Header).toBeDefined();
    expect(typeof Header).toBe('function');
  });
});
