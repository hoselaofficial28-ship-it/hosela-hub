import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');

// --- Panel Lokasi Kantor bisa ditutup dan dibuka kembali ---
assert.match(html, /id="office-editor-body"/);
assert.match(html, /id="office-summary"/);
assert.match(html, /id="office-toggle-btn"[\s\S]*?aria-controls="office-editor-body"[\s\S]*?onclick="toggleOfficeSettings\(\)"/);
assert.match(html, /id="office-editor-body"[\s\S]*?id="office-lat"[\s\S]*?id="office-lng"[\s\S]*?id="office-radius"[\s\S]*?id="office-save-btn"/);

assert.match(app, /function setOfficeSettingsCollapsed\(collapsed\)/);
assert.match(app, /function toggleOfficeSettings\(\)/);
assert.match(app, /function renderOfficeSummary\(lat, lng, radius\)/);
assert.match(app, /card\.classList\.toggle\('is-collapsed', isCollapsed\)/);
assert.match(app, /body\.hidden = isCollapsed/);
assert.match(app, /setOfficeSettingsCollapsed\(ready\)/);
assert.match(app, /renderOfficeSummary\(ready \? lat : '', ready \? lng : '', radius\)/);
assert.match(app, /showToast\('Lokasi kantor berhasil disimpan'\);\r?\n\s*loadOfficeSettings\(\);/);
assert.match(app, /btn\.textContent = isCollapsed \? 'Ubah' : 'Tutup'/);

// --- Akurasi GPS ditampilkan agar titik kantor tidak asal pasang ---
assert.match(html, /id="office-location-hint"/);
assert.match(app, /var acc = Math\.round\(pos\.coords\.accuracy \|\| 0\)/);
assert.match(app, /Akurasi bacaan: ±/);
assert.match(app, /acc > 100 \? ' — terlalu kasar/);

assert.match(css, /\.office-setting-card\.is-collapsed \.office-editor-body\{display:none\}/);
assert.match(css, /\.office-summary\{[\s\S]*?display:flex/);
assert.match(css, /\.office-summary\[hidden\]\{display:none\}/);

// --- Tombol kamera: gradasi biru muda, bukan biru solid + emas ---
assert.doesNotMatch(html, /id="camera-capture-btn"[^>]*class="btn btn-gold"/);
assert.match(html, /id="camera-start-btn"[^>]*>Aktifkan Kamera</);
assert.match(html, /id="camera-capture-btn"[^>]*>Ambil Foto</);
assert.match(css, /#camera-start-btn\{background:linear-gradient\(135deg,#4f8cff 0%,#1557d8 100%\)\}/);
assert.match(css, /#camera-capture-btn\{background:linear-gradient\(135deg,#9ec7ff 0%,#4f8cff 100%\)/);
assert.match(css, /#camera-start-btn:disabled,#camera-capture-btn:disabled\{background:linear-gradient/);
assert.match(css, /#camera-start-btn,#camera-capture-btn\{min-height:48px/);

// --- Absensi kamera tetap mobile friendly ---
assert.match(css, /@media \(max-width:599px\)\{[\s\S]*?#camera-start-btn,#camera-capture-btn\{min-height:52px/);
assert.match(css, /@media \(max-width:380px\)\{[\s\S]*?\.camera-actions\{grid-template-columns:1fr\}/);
assert.match(css, /@media \(max-width:599px\)\{[\s\S]*?\.office-toggle-btn\{min-height:44px\}/);
assert.match(css, /\.camera-actions\{display:grid;grid-template-columns:1fr 1fr/);

// --- Versi cache harus naik serentak supaya HP tidak memakai file lama ---
assert.match(html, /css\/style\.css\?v=20261017d/);
assert.match(html, /js\/app\.js\?v=20261017d/);
assert.match(app, /APP_VERSION = '20261017d'/);
assert.match(sw, /APP_VERSION = '20261017d'/);

console.log('camera + office settings UX: ok');
