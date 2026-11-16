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
assert.match(html, /id="office-current-location-btn"/);
assert.match(html, /id="attendance-location-retry"[\s\S]{0,120}Baca ulang/);
assert.match(app, /MAX_ATTENDANCE_LOCATION_ACCURACY_M = 100/);
assert.match(app, /MAX_OFFICE_LOCATION_ACCURACY_M = 100/);
assert.match(app, /Akurasi bacaan: \u00b1/);
assert.match(app, /Lokasi belum disimpan karena akurasi masih \u00b1/);
assert.match(app, /acc > MAX_ATTENDANCE_LOCATION_ACCURACY_M/);
assert.match(app, /maximumAge: 0/);
assert.doesNotMatch(app, /enableHighAccuracy: false/);

assert.match(css, /\.office-setting-card\.is-collapsed \.office-editor-body\{display:none\}/);
assert.match(css, /\.office-summary\{[\s\S]*?display:flex/);
assert.match(css, /\.office-summary\[hidden\]\{display:none\}/);
assert.match(css, /\.cam-loc\{display:inline-flex/);

// --- Kamera absensi desain baru (17 Nov 2026):
//     kamera menyala sendiri, cincin warna berputar saat memindai wajah,
//     lalu karyawan tinggal pilih Absen Masuk / Absen Pulang.
assert.match(html, /id="cam-stage"/);
assert.match(html, /class="cam-ring"/);
assert.match(html, /id="cam-status-chip"/);
assert.match(html, /id="cam-submit"/);
assert.match(html, /id="absen-masuk-btn"[^>]*>Absen Masuk</);
assert.match(html, /id="absen-pulang-btn"[^>]*>Absen Pulang</);
assert.match(html, /id="camera-retake-btn"[^>]*onclick="ulangiFotoAbsen\(\)"/);
assert.match(html, /id="attendance-type"/);
// tombol "Aktifkan Kamera" bukan lagi langkah wajib
assert.doesNotMatch(html, />Aktifkan Kamera</);
assert.doesNotMatch(html, /id="camera-capture-btn"/);

// cincin: gradasi berputar, dan berubah warna mengikuti keadaan
assert.match(css, /\.cam-stage\{/);
assert.match(css, /\.cam-frame \.cam-ring\{[^}]*conic-gradient/);
assert.match(css, /@keyframes cam-spin\{to\{transform:rotate\(1turn\)\}\}/);
assert.match(css, /@keyframes cam-glow\{/);
assert.match(css, /\.cam-stage\[data-state="scanning"\] \.cam-frame,\n\.cam-stage\[data-state="locking"\] \.cam-frame\{animation:cam-glow/);
assert.match(css, /\.cam-stage\[data-state="ready"\] \.cam-frame \.cam-ring\{background:#22c55e;animation:none/);
assert.match(css, /\.cam-stage\[data-state="ready"\] \.cam-frame\{animation:none;box-shadow:inset 0 0 0 4px rgba\(34,197,94/);
assert.match(css, /\.cam-stage\[data-state="error"\] \.cam-frame \.cam-ring\{background:#ef4444/);
assert.match(css, /\.cam-pick-in\{background:linear-gradient/);
assert.match(css, /\.cam-pick-out\{background:linear-gradient/);
assert.match(css, /\.cam-submit-grid\{display:grid;grid-template-columns:1fr 1fr/);

// alur kamera otomatis
assert.match(app, /function mulaiPindaiWajah\(/);
assert.match(app, /_camJejakBagus >= 4/);
assert.match(app, /function ulangiFotoAbsen\(/);
assert.match(app, /function kirimAbsenDariKamera\(/);
assert.match(app, /function loadAbsensiCamera\(\) \{[\s\S]{0,900}startAttendanceCamera\(\);/);
assert.match(app, /getUserMedia\(\{ video: \{ facingMode: 'user'/);

// --- Versi cache harus naik serentak supaya HP tidak memakai file lama ---
// Versi mengikuti APP_VERSION di app.js (jangan di-hardcode supaya tidak perlu diubah tiap rilis).
const VERSI_APP = /APP_VERSION = '([^']+)'/.exec(app)[1];
assert.match(html, new RegExp('css/style\\.css\\?v=' + VERSI_APP));
assert.match(html, new RegExp('js/app\\.js\\?v=' + VERSI_APP));
assert.match(app, new RegExp("APP_VERSION = '" + VERSI_APP + "'"));
assert.match(sw, new RegExp("APP_VERSION = '" + VERSI_APP + "'"));

console.log('camera + office settings UX: ok');
