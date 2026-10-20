import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');

assert.match(html, /family=Manrope:wght@400;500;600;700;800/);
assert.doesNotMatch(html, /family=Inter/);
assert.match(css, /--font-ui:'Manrope'/);
assert.match(css, /font-variant-numeric:tabular-nums lining-nums/);
assert.match(css, /body:not\(\.phone-mode\) \.home-name\{[\s\S]*?font-weight:700/);
assert.match(css, /body:not\(\.phone-mode\) \.home-clock-time\{[\s\S]*?font-weight:700/);

assert.match(app, /trend:'M4 17l6-6/);
assert.match(app, /uiIcon\('trend'\)/);
assert.match(app, /uiIcon\('star', 'rating-star'\)/);
assert.match(app, /uiIcon\('calendar', 'inline-icon'\)/);
assert.match(app, /uiIcon\('close'\)/);
assert.doesNotMatch(app, /&#128197;|&#9733;|&#10003;/);

const cleanDisplayTextSource = app.match(/function cleanDisplayText\(text\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(cleanDisplayTextSource, 'Helper pembersih teks tampilan harus tersedia');
const sandbox = {};
vm.runInNewContext(
  `${cleanDisplayTextSource}; result = cleanDisplayText('📈  Berkembang — Masih ada ruang untuk tumbuh');`,
  sandbox
);
assert.equal(sandbox.result, 'Berkembang — Masih ada ruang untuk tumbuh');

const structuralSource = [html, app];
const emojiPattern = /[\p{Extended_Pictographic}\u2600-\u27BF]/u;
for (const source of structuralSource) {
  assert.equal(emojiPattern.test(source), false, 'Source UI produksi tidak boleh memakai emoji struktural');
}

console.log('typography and vector icon tests passed');
