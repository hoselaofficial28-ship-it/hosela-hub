import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static server khusus untuk supabase-clone/app (mode demo, data mock).
// Pola disalin dari scripts/dev-server.mjs milik app aktif, port sengaja
// dibedakan (8787) supaya tidak bertabrakan kalau app aktif juga dijalankan.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'app');
const port = Number(process.env.PORT || 8787);
const host = '127.0.0.1';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  const requestPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, `.${requestPath}`);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Hosela Hub SUPABASE CLONE (mode demo): http://${host}:${port}`);
});
