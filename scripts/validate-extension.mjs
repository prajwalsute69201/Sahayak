/**
 * Sahayak Extension Production Validator (Slice 17)
 * Performs automated Manifest V3 validation, asset verification,
 * security credential scanning, and build artifact hygiene checks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_ICON_SIZES = ['16', '32', '48', '128'];

// Patterns that must NOT appear in production extension bundles
const SECRET_PATTERNS = [
  { name: 'Gemini API Key', regex: /AIzaSy[0-9A-Za-z_-]{33}/g },
  { name: 'Groq API Key', regex: /gsk_[0-9A-Za-z]{40,}/g },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const DEV_SERVER_PATTERNS = [
  /http:\/\/localhost:5173/g,
  /http:\/\/127\.0\.0\.1:5173/g,
  /ws:\/\/localhost:5173/g,
  /ws:\/\/127\.0\.0\.1:5173/g,
];

const FORBIDDEN_FILE_EXTENSIONS = ['.ts', '.tsx', '.map', '.env', '.DS_Store'];

/**
 * Validates the built extension directory against Chrome Extension Manifest V3 standards.
 * @param {string} distDir - Path to the extension build output (e.g. 'dist')
 * @returns {object} ValidationResult
 */
export function validateExtension(distDir = 'dist') {
  const resolvedDist = path.resolve(distDir);
  const issues = [];
  const checks = {
    manifestSyntax: false,
    manifestV3: false,
    requiredMetadata: false,
    entryPointsExist: false,
    iconsExist: false,
    noForbiddenFiles: true,
    noSecretsDetected: true,
    noDevServerReferences: true,
  };

  if (!fs.existsSync(resolvedDist)) {
    return {
      valid: false,
      version: '0.0.0',
      manifestVersion: 0,
      totalFiles: 0,
      totalSizeBytes: 0,
      checks,
      issues: [
        {
          severity: 'error',
          category: 'build_output',
          message: `Distribution directory does not exist: ${distDir}. Run 'npm run build' first.`,
        },
      ],
      files: [],
    };
  }

  // 1. Collect all files in dist
  const allFiles = [];
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        const rel = path.relative(resolvedDist, fullPath).replace(/\\/g, '/');
        const size = fs.statSync(fullPath).size;
        allFiles.push({ path: rel, fullPath, sizeBytes: size });
      }
    }
  }
  scanDir(resolvedDist);

  const totalSizeBytes = allFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

  // 2. Validate Manifest
  const manifestPath = path.join(resolvedDist, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    issues.push({
      severity: 'error',
      category: 'manifest',
      message: 'manifest.json is missing in dist directory.',
    });
    return {
      valid: false,
      version: '0.0.0',
      manifestVersion: 0,
      totalFiles: allFiles.length,
      totalSizeBytes,
      checks,
      issues,
      files: allFiles.map((f) => ({ path: f.path, sizeBytes: f.sizeBytes })),
    };
  }

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
    checks.manifestSyntax = true;
  } catch (err) {
    issues.push({
      severity: 'error',
      category: 'manifest',
      message: `Failed to parse manifest.json: ${err.message}`,
    });
    return {
      valid: false,
      version: '0.0.0',
      manifestVersion: 0,
      totalFiles: allFiles.length,
      totalSizeBytes,
      checks,
      issues,
      files: allFiles.map((f) => ({ path: f.path, sizeBytes: f.sizeBytes })),
    };
  }

  // 3. Manifest V3 validation
  if (manifest.manifest_version === 3) {
    checks.manifestV3 = true;
  } else {
    issues.push({
      severity: 'error',
      category: 'manifest_version',
      message: `Invalid manifest_version: expected 3, found ${manifest.manifest_version}`,
    });
  }

  // 4. Required Metadata
  if (
    manifest.name &&
    typeof manifest.name === 'string' &&
    manifest.name.trim().length > 0 &&
    manifest.version &&
    typeof manifest.version === 'string' &&
    /^\d+\.\d+\.\d+/.test(manifest.version) &&
    manifest.description &&
    typeof manifest.description === 'string'
  ) {
    checks.requiredMetadata = true;
  } else {
    issues.push({
      severity: 'error',
      category: 'metadata',
      message: 'Manifest is missing required metadata (name, version in semver, or description).',
    });
  }

  const version = manifest.version || '1.0.0';

  // 5. Entry Points Verification
  let entryPointsValid = true;

  // Background service worker
  const swPath = manifest.background?.service_worker;
  if (!swPath) {
    issues.push({
      severity: 'error',
      category: 'background',
      message: 'manifest.json does not declare background.service_worker.',
    });
    entryPointsValid = false;
  } else {
    const swDiskPath = path.join(resolvedDist, swPath);
    if (!fs.existsSync(swDiskPath)) {
      issues.push({
        severity: 'error',
        category: 'background',
        message: `background.service_worker file does not exist: ${swPath}`,
      });
      entryPointsValid = false;
    }
  }

  // Side Panel
  const sidePanelPath = manifest.side_panel?.default_path;
  if (!sidePanelPath) {
    issues.push({
      severity: 'error',
      category: 'side_panel',
      message: 'manifest.json does not declare side_panel.default_path.',
    });
    entryPointsValid = false;
  } else {
    const spDiskPath = path.join(resolvedDist, sidePanelPath);
    if (!fs.existsSync(spDiskPath)) {
      issues.push({
        severity: 'error',
        category: 'side_panel',
        message: `side_panel.default_path file does not exist: ${sidePanelPath}`,
      });
      entryPointsValid = false;
    }
  }

  // Content scripts
  if (Array.isArray(manifest.content_scripts)) {
    for (const cs of manifest.content_scripts) {
      if (Array.isArray(cs.js)) {
        for (const jsFile of cs.js) {
          const jsDisk = path.join(resolvedDist, jsFile);
          if (!fs.existsSync(jsDisk)) {
            issues.push({
              severity: 'error',
              category: 'content_scripts',
              message: `content_script file does not exist on disk: ${jsFile}`,
            });
            entryPointsValid = false;
          }
        }
      }
    }
  }

  checks.entryPointsExist = entryPointsValid;

  // 6. Icons Verification
  let iconsValid = true;
  const iconsObj = manifest.icons || {};
  for (const size of REQUIRED_ICON_SIZES) {
    const iconRel = iconsObj[size];
    if (!iconRel) {
      issues.push({
        severity: 'error',
        category: 'icons',
        message: `manifest.icons is missing icon size ${size}.`,
      });
      iconsValid = false;
    } else {
      const iconDisk = path.join(resolvedDist, iconRel);
      if (!fs.existsSync(iconDisk)) {
        issues.push({
          severity: 'error',
          category: 'icons',
          message: `Icon file for size ${size} does not exist on disk: ${iconRel}`,
        });
        iconsValid = false;
      }
    }
  }
  checks.iconsExist = iconsValid;

  // 7. Forbidden Files and Security Credentials Scan
  for (const file of allFiles) {
    // Check extension
    const ext = path.extname(file.path);
    if (
      FORBIDDEN_FILE_EXTENSIONS.includes(ext) ||
      file.path.includes('.git') ||
      file.path.endsWith('.env')
    ) {
      issues.push({
        severity: 'error',
        category: 'forbidden_file',
        message: `Forbidden development artifact detected in production bundle: ${file.path}`,
        file: file.path,
      });
      checks.noForbiddenFiles = false;
    }

    // Text content scan for secrets and dev server urls
    // Only check text-based files
    if (/\.(js|css|html|json|txt|md)$/i.test(file.path)) {
      try {
        const content = fs.readFileSync(file.fullPath, 'utf8');

        // Secret scan
        for (const sec of SECRET_PATTERNS) {
          if (sec.regex.test(content)) {
            issues.push({
              severity: 'error',
              category: 'security_leak',
              message: `Potential hardcoded secret (${sec.name}) detected in file: ${file.path}`,
              file: file.path,
            });
            checks.noSecretsDetected = false;
          }
        }

        // Dev server URL scan
        for (const devUrl of DEV_SERVER_PATTERNS) {
          if (devUrl.test(content)) {
            issues.push({
              severity: 'error',
              category: 'dev_server_reference',
              message: `Development server URL reference detected in file: ${file.path}`,
              file: file.path,
            });
            checks.noDevServerReferences = false;
          }
        }
      } catch {
        // Binary or unreadable text file
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const valid = !hasErrors;

  return {
    valid,
    version,
    manifestVersion: manifest.manifest_version || 0,
    totalFiles: allFiles.length,
    totalSizeBytes,
    checks,
    issues,
    files: allFiles.map((f) => ({ path: f.path, sizeBytes: f.sizeBytes })),
  };
}

// CLI runner if invoked directly
const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedPath === currentFilePath) {
  console.log('\n[Sahayak Release Engine] Running Chrome Extension MV3 Production Validation...\n');
  const targetDir = process.argv[2] || 'dist';
  const result = validateExtension(targetDir);

  console.log(`Target Directory: ${targetDir}`);
  console.log(`Extension Version: ${result.version}`);
  console.log(`Manifest Version:  MV${result.manifestVersion}`);
  console.log(`Total Files:       ${result.totalFiles}`);
  console.log(`Total Size:        ${(result.totalSizeBytes / 1024).toFixed(2)} KB\n`);

  console.log('Validation Checklist:');
  console.log(` [${result.checks.manifestSyntax ? '✓' : '✗'}] Manifest JSON Syntax Valid`);
  console.log(` [${result.checks.manifestV3 ? '✓' : '✗'}] Manifest V3 Compliant`);
  console.log(
    ` [${result.checks.requiredMetadata ? '✓' : '✗'}] Mandatory Metadata Present (name, version, description)`
  );
  console.log(
    ` [${result.checks.entryPointsExist ? '✓' : '✗'}] All Entry Points Exist (service worker, side panel, content scripts)`
  );
  console.log(
    ` [${result.checks.iconsExist ? '✓' : '✗'}] All Required Icon Sizes Exist (16, 32, 48, 128)`
  );
  console.log(
    ` [${result.checks.noForbiddenFiles ? '✓' : '✗'}] Zero Source Maps, TS, or Dev Files in Bundle`
  );
  console.log(
    ` [${result.checks.noSecretsDetected ? '✓' : '✗'}] Zero API Keys or Credentials Leaked in Code`
  );
  console.log(
    ` [${result.checks.noDevServerReferences ? '✓' : '✗'}] Zero Localhost or Dev Server URLs in Code\n`
  );

  if (result.issues.length > 0) {
    console.log(`Issues Found (${result.issues.length}):`);
    for (const issue of result.issues) {
      console.log(` - [${issue.severity.toUpperCase()}] (${issue.category}) ${issue.message}`);
    }
    console.log('');
  }

  if (!result.valid) {
    console.error('❌ Extension validation failed. Please address errors before packaging.\n');
    process.exit(1);
  } else {
    console.log('✅ Extension validation PASSED. Production bundle is ready for packaging.\n');
    process.exit(0);
  }
}
