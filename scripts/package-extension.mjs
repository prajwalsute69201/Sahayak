/**
 * Sahayak Extension Release Packager (Slice 17)
 * Validates production build, copies clean unpacked bundle,
 * generates standard versioned ZIP archive, computes SHA-256 integrity hash,
 * and publishes structured release report.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExtension } from './validate-extension.mjs';
import { zipDirectory } from './utils/zip.mjs';
import { calculateSha256 } from './generate-checksum.mjs';

/**
 * Executes full packaging sequence for a production build.
 * @param {object} options
 * @param {string} [options.distDir='dist'] - Source distribution folder
 * @param {string} [options.releaseDir='release'] - Destination release folder
 * @returns {object} ReleaseResult
 */
export function packageExtension(options = {}) {
  const distDir = options.distDir || 'dist';
  const releaseDir = options.releaseDir || 'release';

  const resolvedDist = path.resolve(distDir);
  const resolvedRelease = path.resolve(releaseDir);

  // 1. Validate Production Build First
  const validation = validateExtension(distDir);
  if (!validation.valid) {
    const errorMessages = validation.issues
      .filter((i) => i.severity === 'error')
      .map((i) => ` - [${i.category}] ${i.message}`)
      .join('\n');
    throw new Error(`Extension validation failed with errors:\n${errorMessages}`);
  }

  const version = validation.version;
  const packageBaseName = `sahayak-v${version}`;
  const unpackedDir = path.join(resolvedRelease, packageBaseName);
  const zipFilePath = path.join(resolvedRelease, `${packageBaseName}.zip`);
  const checksumFilePath = path.join(resolvedRelease, `${packageBaseName}.zip.sha256`);
  const reportFilePath = path.join(resolvedRelease, 'release-report.json');

  // 2. Ensure clean release directory
  if (!fs.existsSync(resolvedRelease)) {
    fs.mkdirSync(resolvedRelease, { recursive: true });
  }

  if (fs.existsSync(unpackedDir)) {
    fs.rmSync(unpackedDir, { recursive: true, force: true });
  }
  fs.mkdirSync(unpackedDir, { recursive: true });

  // 3. Copy dist contents to unpacked folder
  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  copyRecursive(resolvedDist, unpackedDir);

  // 4. Generate Production ZIP
  if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath);
  }
  const zipStats = zipDirectory(unpackedDir, zipFilePath);

  // 5. Generate SHA-256 Checksum
  const sha256 = calculateSha256(zipFilePath);
  fs.writeFileSync(checksumFilePath, `${sha256}  ${packageBaseName}.zip\n`, 'utf8');

  // 6. Read manifest summary for report
  const manifest = JSON.parse(fs.readFileSync(path.join(unpackedDir, 'manifest.json'), 'utf8'));

  // 7. Write Release Report JSON
  const releaseReport = {
    name: manifest.name || 'Sahayak',
    version,
    manifestVersion: manifest.manifest_version || 3,
    releaseDate: new Date().toISOString(),
    zipArchive: {
      filename: `${packageBaseName}.zip`,
      sizeBytes: zipStats.compressedSize,
      sizeFormatted: `${(zipStats.compressedSize / 1024).toFixed(2)} KB`,
      sha256,
    },
    unpackedPackage: {
      directory: packageBaseName,
      fileCount: zipStats.fileCount,
      uncompressedBytes: zipStats.uncompressedSize,
      uncompressedFormatted: `${(zipStats.uncompressedSize / 1024).toFixed(2)} KB`,
    },
    manifestSummary: {
      permissions: manifest.permissions || [],
      hostPermissions: manifest.host_permissions || [],
      serviceWorker: manifest.background?.service_worker,
      sidePanelPath: manifest.side_panel?.default_path,
      icons: manifest.icons || {},
    },
    validation: {
      passed: true,
      checks: validation.checks,
      issueCount: validation.issues.length,
    },
    files: zipStats.files,
  };

  fs.writeFileSync(reportFilePath, JSON.stringify(releaseReport, null, 2), 'utf8');

  return {
    version,
    packageBaseName,
    zipFilePath,
    unpackedDir,
    checksumFilePath,
    reportFilePath,
    sha256,
    zipStats,
    report: releaseReport,
  };
}

// CLI runner if invoked directly
const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedPath === currentFilePath) {
  try {
    console.log('\n=============================================================');
    console.log('       Sahayak Chrome Extension (MV3) - Release Packager     ');
    console.log('=============================================================\n');

    const result = packageExtension();

    console.log(`📦 Unpacked Package: release/${result.packageBaseName}/`);
    console.log(`🗜️  Release Archive:  release/${result.packageBaseName}.zip`);
    console.log(`🔒 SHA-256 Checksum: ${result.sha256}`);
    console.log(`📊 Archive Size:     ${(result.zipStats.compressedSize / 1024).toFixed(2)} KB`);
    console.log(`📄 Files Packaged:   ${result.zipStats.fileCount} files`);
    console.log(`📋 Release Report:   release/release-report.json`);
    console.log(`🔑 Checksum File:    release/${result.packageBaseName}.zip.sha256\n`);

    console.log('Installation Instructions:');
    console.log(
      ' 1. Unzip release/' +
        result.packageBaseName +
        '.zip (or use release/' +
        result.packageBaseName +
        '/)'
    );
    console.log(' 2. Navigate to chrome://extensions in Google Chrome');
    console.log(' 3. Enable "Developer mode" in the top-right corner');
    console.log(' 4. Click "Load unpacked" and select the extension folder\n');
    console.log('✅ Release packaging completed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Release packaging failed: ${err.message}\n`);
    process.exit(1);
  }
}
