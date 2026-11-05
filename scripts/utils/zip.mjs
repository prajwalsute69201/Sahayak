import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Pure Node.js ZIP archive creator (PKZIP 2.0 compliant).
 * Recursively packages a directory into a standard .zip archive without third-party dependencies.
 */
export function zipDirectory(sourceDir, outPath) {
  const resolvedSource = path.resolve(sourceDir);
  const files = [];

  function collectFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(resolvedSource, fullPath).replace(/\\/g, '/');
        files.push({
          fullPath,
          relativePath,
          size: fs.statSync(fullPath).size,
        });
      }
    }
  }

  collectFiles(resolvedSource);

  // Sort files for reproducible builds
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;
  let totalUncompressed = 0;

  for (const file of files) {
    const content = fs.readFileSync(file.fullPath);
    totalUncompressed += content.length;

    const compressed = zlib.deflateRawSync(content, { level: 9 });

    const crc = zlib.crc32(content);
    const nameBuffer = Buffer.from(file.relativePath, 'utf8');

    // Local file header (30 bytes + name)
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0); // Local header signature
    local.writeUInt16LE(20, 4); // Minimum version needed (2.0)
    local.writeUInt16LE(0, 6); // General purpose bit flag
    local.writeUInt16LE(8, 8); // Compression method: 8 = Deflate
    local.writeUInt16LE(0, 10); // Last mod file time
    local.writeUInt16LE(0, 12); // Last mod file date
    local.writeUInt32LE(crc, 14); // CRC-32
    local.writeUInt32LE(compressed.length, 18); // Compressed size
    local.writeUInt32LE(content.length, 22); // Uncompressed size
    local.writeUInt16LE(nameBuffer.length, 26); // File name length
    local.writeUInt16LE(0, 28); // Extra field length
    nameBuffer.copy(local, 30);

    localHeaders.push(local, compressed);

    // Central directory header (46 bytes + name)
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0); // Central directory header signature
    central.writeUInt16LE(20, 4); // Version made by
    central.writeUInt16LE(20, 6); // Minimum version needed
    central.writeUInt16LE(0, 8); // General purpose bit flag
    central.writeUInt16LE(8, 10); // Compression method (8 = Deflate)
    central.writeUInt16LE(0, 12); // Last mod file time
    central.writeUInt16LE(0, 14); // Last mod file date
    central.writeUInt32LE(crc, 16); // CRC-32
    central.writeUInt32LE(compressed.length, 20); // Compressed size
    central.writeUInt32LE(content.length, 24); // Uncompressed size
    central.writeUInt16LE(nameBuffer.length, 28); // File name length
    central.writeUInt16LE(0, 30); // Extra field length
    central.writeUInt16LE(0, 32); // File comment length
    central.writeUInt16LE(0, 34); // Disk number start
    central.writeUInt16LE(0, 36); // Internal file attributes
    central.writeUInt32LE(0x81a40000, 38); // External file attributes (-rw-r--r--)
    central.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuffer.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central dir signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  const zipBuffer = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);

  const targetDir = path.dirname(outPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(outPath, zipBuffer);

  return {
    fileCount: files.length,
    uncompressedSize: totalUncompressed,
    compressedSize: zipBuffer.length,
    files: files.map((f) => ({
      path: f.relativePath,
      size: f.size,
    })),
  };
}
