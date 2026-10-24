import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baseUrl = process.env.HOSELA_HUB_URL || 'https://hosela-hub.vercel.app';
const localApp = await readFile(new URL('../app/js/app.js', import.meta.url), 'utf8');
const version = localApp.match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
assert.ok(version, 'APP_VERSION lokal tidak ditemukan');

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  assert.equal(response.status, 200, `${path} mengembalikan HTTP ${response.status}`);
  return response.text();
}

const html = await fetchText('/?smoke=' + Date.now());
assert.match(html, new RegExp(`js/app\\.js\\?v=${version}`), 'HTML production belum memakai versi lokal terbaru');
assert.match(html, /id="izin-foto"[^>]+accept="image\/\*"[^>]+capture="environment"/, 'Input kamera surat dokter tidak ditemukan');
assert.match(html, /disimpan privat maksimal 15 hari/, 'Keterangan retensi bukti sakit tidak ditemukan');
assert.doesNotMatch(html, /MODE CAMPURAN/, 'Popup mode campuran muncul kembali');

const [app, backend, storage, sw] = await Promise.all([
  fetchText(`/js/app.js?v=${version}`),
  fetchText(`/js/real-backend.js?v=${version}`),
  fetchText('/js/photo-storage.js'),
  fetchText(`/sw.js?v=${version}`),
]);

assert.match(app, new RegExp(`APP_VERSION = '${version}'`));
assert.match(app, /supabase:\/\/attendance-photos\//);
assert.match(backend, /window\.sb\.rpc\('submit_izin'/);
assert.match(storage, /PHOTO_STORAGE_MAX_BYTES = 180 \* 1024/);
assert.match(sw, new RegExp(`APP_VERSION = '${version}'`));

console.log(`Production smoke OK: ${baseUrl} (versi ${version})`);
