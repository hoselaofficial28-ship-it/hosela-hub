import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');

assert.match(css, /body:not\(\.phone-mode\) #s-daftar\.screen\.active\s*\{[^}]*height:100dvh!important;[^}]*overflow-y:auto!important;/s);
assert.match(css, /body\.phone-mode #app-wrap #s-daftar\.screen\.active\s*\{[^}]*overflow-y:auto!important;/s);
assert.match(css, /#s-daftar \.login-body\s*\{[^}]*safe-area-inset-bottom/s);
assert.match(html, /css\/style\.css\?v=20261014k/);
assert.match(html, /js\/app\.js\?v=20261014k/);
assert.match(app, /APP_VERSION = '20261014k'/);
assert.match(sw, /APP_VERSION = '20261014k'/);

console.log('registration mobile scroll: ok');
