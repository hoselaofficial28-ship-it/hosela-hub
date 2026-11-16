import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');

assert.match(css, /body:not\(\.phone-mode\) #s-daftar\.screen\.active\s*\{[^}]*height:100dvh!important;[^}]*overflow-y:auto!important;/s);
assert.match(css, /body\.phone-mode #app-wrap #s-daftar\.screen\.active\s*\{[^}]*overflow-y:auto!important;/s);
assert.match(css, /#s-daftar \.login-body\s*\{[^}]*safe-area-inset-bottom/s);
// Versi mengikuti APP_VERSION di app.js (jangan di-hardcode supaya tidak perlu diubah tiap rilis).
const VERSI_APP = /APP_VERSION = '([^']+)'/.exec(app)[1];
assert.match(html, new RegExp('css/style\\.css\\?v=' + VERSI_APP));
assert.match(html, new RegExp('js/app\\.js\\?v=' + VERSI_APP));
assert.match(app, new RegExp("APP_VERSION = '" + VERSI_APP + "'"));
assert.match(sw, new RegExp("APP_VERSION = '" + VERSI_APP + "'"));

console.log('registration mobile scroll: ok');
