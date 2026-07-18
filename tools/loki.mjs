#!/usr/bin/env node
// Direct oblador/loki wrapper (no Nx adapter).
//
// Loki's docker Chrome target cannot read a `--reactUri file:` build reliably:
// it auto-detects a host IP and serves the static files there, but that IP is
// often unreachable from the container (VPN/secondary NICs locally, etc.).
// Instead we serve the built Storybook ourselves and point Loki at
// `host.docker.internal`, which Docker maps to the host gateway on both local
// machines and CI (Loki always passes `--add-host=host.docker.internal:host-gateway`).
//
// Usage: node tools/loki.mjs <test|update|approve> [extra loki args...]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const STORYBOOK_DIR = process.env.LOKI_STORYBOOK_DIR || 'dist/storybook/storybook-host';
const command = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!['test', 'update', 'approve'].includes(command)) {
  console.error('Usage: node tools/loki.mjs <test|update|approve> [extra loki args...]');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    // Prevent path traversal outside the storybook dir.
    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(STORYBOOK_DIR, safePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    // Fail fast with a clear 404 rather than hanging.
    await readFile(filePath, { flag: 'r' }).then((buf) => {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length });
      res.end(buf);
    });
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const runLoki = (reactUri) => {
  const pkgJson = require.resolve('loki/package.json');
  const lokiBin = join(dirname(pkgJson), 'bin', 'loki');
  const args = [lokiBin, command, '--reactUri', reactUri, ...extraArgs];
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  const shutdown = (code) => {
    server.close(() => process.exit(code));
    // Safety net if the server takes too long to close.
    setTimeout(() => process.exit(code), 2000).unref();
  };
  child.on('exit', (code) => shutdown(code ?? 1));
  child.on('error', (err) => {
    console.error('Failed to launch loki:', err);
    shutdown(1);
  });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
};

// Bind on all interfaces so the docker container can reach us via the gateway.
server.listen(0, '0.0.0.0', () => {
  const { port } = server.address();
  const reactUri = `http://host.docker.internal:${port}`;
  console.log(`Serving ${STORYBOOK_DIR} for loki at ${reactUri}`);
  runLoki(reactUri);
});
