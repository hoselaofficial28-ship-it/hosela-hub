import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const appRoot = new URL('../app/', import.meta.url);
const html = readFileSync(new URL('index.html', appRoot), 'utf8');
const app = readFileSync(new URL('js/app.js', appRoot), 'utf8');
const sw = readFileSync(new URL('sw.js', appRoot), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', appRoot), 'utf8'));

assert.equal(manifest.id, '/');
assert.match(manifest.start_url, /^\/\??/);
assert.equal(manifest.scope, '/');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.prefer_related_applications, false);
assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
assert.ok(manifest.icons.some((icon) => (icon.purpose || '').includes('maskable')), 'butuh ikon maskable untuk Android');
assert.ok(manifest.icons.some((icon) => icon.sizes === '180x180'), 'butuh ikon apple-touch 180');
assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 1, 'butuh shortcut aplikasi');
assert.ok(statSync(new URL('assets/icon-maskable-512.png', appRoot)).size > 0);
assert.ok(statSync(new URL('assets/apple-touch-icon.png', appRoot)).size > 0);
assert.match(html, /name="apple-mobile-web-app-title"/);
assert.match(html, /id="pwa-install-banner"/);
assert.match(app, /function tampilkanBannerInstall\(/);
assert.match(app, /function bukaGotoAwal\(/);
assert.ok(statSync(new URL('assets/logo.png', appRoot)).size > 0);
assert.ok(statSync(new URL('assets/icon-512.png', appRoot)).size > 0);

assert.match(html, /rel="manifest" href="\/manifest\.webmanifest\?v=/);
assert.match(html, /name="mobile-web-app-capable" content="yes"/);
assert.doesNotMatch(html, /id="login-install-panel"/, 'tombol install di layar login sudah dihapus');
assert.match(html, /id="install-app-row"/);
assert.match(app, /navigator\.serviceWorker\.register\('\/sw\.js\?v=' \+ APP_VERSION, \{ scope: '\/' \}\)/);
assert.match(app, /beforeinstallprompt/);
assert.match(app, /appinstalled/);
assert.match(app, /Tambahkan ke Layar Utama/);
assert.match(sw, /self\.addEventListener\('fetch'/);

console.log('PWA install manifest, service worker, dan tombol instalasi: OK');
