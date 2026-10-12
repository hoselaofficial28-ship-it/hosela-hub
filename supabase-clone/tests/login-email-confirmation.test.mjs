import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');

assert.match(backend, /email not confirmed/i);
assert.match(backend, /konfirmasi email Supabase masih aktif/);
assert.match(html, /css\/style\.css\?v=20261012f/);
assert.match(html, /js\/app\.js\?v=20261012f/);
assert.match(app, /APP_VERSION = '20261012f'/);
assert.match(sw, /APP_VERSION = '20261012f'/);

console.log('login email confirmation handling: ok');
