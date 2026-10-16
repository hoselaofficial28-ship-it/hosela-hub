import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');

assert.match(html, /aria-label="Langkah membuat slip gaji"/);
assert.match(html, /Cek Kehadiran/);
assert.match(html, /Atur Gaji/);
assert.match(html, /Slip Terbit/);
assert.match(app, /if \(u\.bagian !== 'Owner' && u\.bagian !== 'Finance'\)\s*\nmenus\.push\(\{id:'s-slip-gaji'/);
assert.doesNotMatch(app, /menus\.push\(\{id:'s-setting-gaji'/);
assert.match(css, /\.payroll-guide-steps\{display:grid;grid-template-columns:1fr/);
assert.match(css, /\.att-user-head>span\{display:none!important\}/);

console.log('payroll simplified UI tests: OK');
