import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');

assert.match(backend, /email not confirmed/i);
assert.match(backend, /konfirmasi email Supabase masih aktif/);
// Versi mengikuti APP_VERSION di app.js (jangan di-hardcode supaya tidak perlu diubah tiap rilis).
const VERSI_APP = /APP_VERSION = '([^']+)'/.exec(app)[1];
assert.match(html, new RegExp('css/style\\.css\\?v=' + VERSI_APP));
assert.match(html, new RegExp('js/app\\.js\\?v=' + VERSI_APP));
assert.match(app, new RegExp("APP_VERSION = '" + VERSI_APP + "'"));
assert.match(sw, new RegExp("APP_VERSION = '" + VERSI_APP + "'"));
assert.match(html, /family=Manrope:wght@400;500;600;700;800/);
assert.doesNotMatch(html, /Plus\+Jakarta\+Sans/);

console.log('login email confirmation handling: ok');
