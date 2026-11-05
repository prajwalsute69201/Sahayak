/**
 * Sahayak SHA-256 Checksum Generator (Slice 17)
 * Cryptographically verifies release package integrity using standard SHA-256 digests.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Computes the SHA-256 hex checksum of a target file.
 * @param {string} filePath - Path to file
 * @returns {string} 64-character lowercase hexadecimal hash
 */
export function calculateSha256(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Target file does not exist for checksum calculation: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Verifies that a target file matches an expected SHA-256 checksum.
 * @param {string} filePath - Path to file
 * @param {string} expectedSha256 - Expected 64-character hash
 * @returns {boolean}
 */
export function verifyChecksum(filePath, expectedSha256) {
  const actual = calculateSha256(filePath);
  return actual.toLowerCase() === expectedSha256.trim().toLowerCase();
}

// CLI runner if invoked directly
const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedPath === currentFilePath) {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error('Usage: node scripts/generate-checksum.mjs <filePath>');
    process.exit(1);
  }

  try {
    const hash = calculateSha256(targetFile);
    console.log(`\nFile:   ${targetFile}`);
    console.log(`SHA256: ${hash}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
