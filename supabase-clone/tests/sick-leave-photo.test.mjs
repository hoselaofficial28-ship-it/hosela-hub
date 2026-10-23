import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const backend = fs.readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');

assert.match(html, /id="izin-foto" accept="image\/\*" capture="environment"/);
assert.match(html, /disimpan privat maksimal 15 hari/);
assert.match(app, /function handleIzinFoto\(input\)/);
assert.match(app, /function encodeIzinPhoto\(sourceCanvas\)/);
assert.match(app, /hardLimit = 180 \* 1024/);
assert.match(app, /photoBytes > 180 \* 1024/);
assert.match(app, /Math\.max\(canvas\.width, canvas\.height\) > 480/);
assert.match(app, /photoStorageUpload\(\{/);
assert.match(app, /supabase:\/\/attendance-photos\//);
assert.match(app, /function openIzinPhoto\(locator\)/);
assert.match(app, /photoStorageCreateSignedUrl/);
assert.match(backend, /status,link_foto/);
assert.match(backend, /hasPhoto: !!row\.link_foto/);

console.log('sick-leave-photo.test.mjs: OK');
