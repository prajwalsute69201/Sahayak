import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');
const distDir = path.join(projectRoot, 'dist');

const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip',
  '.sha256': 'text/plain; charset=utf-8',
};

function safeResolve(baseDir, reqPath) {
  const normalized = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const resolved = path.join(baseDir, normalized);
  if (!resolved.startsWith(baseDir)) {
    return null;
  }
  return resolved;
}

function tryServeFile(res, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexHtml = path.join(filePath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return tryServeFile(res, indexHtml);
    }
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle sidepanel preview
  if (pathname === '/sidepanel' || pathname === '/sidepanel/') {
    const sidepanelIndex = path.join(distDir, 'src/sidepanel/index.html');
    if (tryServeFile(res, sidepanelIndex)) return;
  }

  // Handle assets for sidepanel (from dist/)
  if (pathname.startsWith('/assets/') || pathname.startsWith('/icons/')) {
    const distAsset = safeResolve(distDir, pathname);
    if (distAsset && tryServeFile(res, distAsset)) return;

    // Fallback to docs assets
    const docsAsset = safeResolve(docsDir, pathname);
    if (docsAsset && tryServeFile(res, docsAsset)) return;
  }

  // Handle requests for docs/
  if (pathname.startsWith('/docs')) {
    const rel = pathname.replace(/^\/docs/, '') || '/';
    const docsFile = safeResolve(docsDir, rel === '/' ? 'index.html' : rel);
    if (docsFile && tryServeFile(res, docsFile)) return;
  }

  // Default: check docs directory (root landing page)
  const defaultFile = safeResolve(docsDir, pathname === '/' ? 'index.html' : pathname);
  if (defaultFile && tryServeFile(res, defaultFile)) return;

  // Fallback: check dist directory
  const distFile = safeResolve(distDir, pathname === '/' ? 'index.html' : pathname);
  if (distFile && tryServeFile(res, distFile)) return;

  // 404
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!doctype html>
    <html>
      <head><title>404 Not Found - Sahayak</title></head>
      <body style="font-family: system-ui, sans-serif; text-align: center; padding: 4rem;">
        <h1>404 - Not Found</h1>
        <p>The requested URL <code>${pathname}</code> was not found on this server.</p>
        <p><a href="/">Return to Sahayak Landing Page</a> | <a href="/sidepanel">Open Side Panel UI</a></p>
      </body>
    </html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('=============================================================');
  console.log('           Sahayak Local Development & Showcase Server       ');
  console.log('=============================================================');
  console.log(`🌐 Landing Page & Simulator:  http://localhost:${PORT}/`);
  console.log(`📱 Side Panel Web UI:         http://localhost:${PORT}/sidepanel`);
  console.log(`🧩 Extension Bundle (MV3):    ${distDir}`);
  console.log('-------------------------------------------------------------');
  console.log('Instructions:');
  console.log(` 1. Open http://localhost:${PORT} in your browser to view the landing page`);
  console.log(` 2. Open http://localhost:${PORT}/sidepanel to preview the extension UI`);
  console.log(' 3. To load in Chrome: Navigate to chrome://extensions, enable');
  console.log('    "Developer mode", and click "Load unpacked" -> select "dist"');
  console.log('=============================================================');
});

