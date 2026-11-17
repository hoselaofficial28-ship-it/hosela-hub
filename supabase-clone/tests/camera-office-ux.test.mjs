import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
const backendSrc = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');

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

// --- Kamera absensi (17 Nov 2026):
//     Face Oval Cutout Overlay + flash liveness berwarna, lalu pilih Masuk/Pulang.
assert.match(html, /id="cam-stage"/);
assert.match(html, /id="cam-overlay"/);
assert.match(html, /id="cam-status-chip"/);
assert.match(html, /id="cam-card"/);
assert.match(html, /id="cam-card-nama"/);
assert.match(html, /id="cam-card-id"/);
assert.match(html, /id="cam-card-status"/);
assert.match(html, /id="cam-card-waktu"/);
assert.match(html, /id="cam-submit"/);
assert.match(html, /id="absen-masuk-btn"[^>]*>Absen Masuk</);
assert.match(html, /id="absen-pulang-btn"[^>]*>Absen Pulang</);
assert.match(html, /id="camera-retake-btn"[^>]*onclick="ulangiFotoAbsen\(\)"/);
assert.match(html, /id="attendance-type"/);
// tombol "Aktifkan Kamera" bukan lagi langkah wajib, cincin berputar sudah tidak ada
assert.doesNotMatch(html, />Aktifkan Kamera</);
assert.doesNotMatch(html, /id="camera-capture-btn"/);
assert.doesNotMatch(html, /class="cam-ring"/);
assert.doesNotMatch(html, /class="cam-scanline"/);

// --- UI overlay: lubang oval transparan, badge di atas oval, kartu identitas ---
assert.match(css, /\.cam-stage\{/);
assert.match(css, /\.cam-overlay\{position:absolute;inset:0/);
assert.match(css, /\.cam-chip\{position:absolute;top:14px;left:50%/);
assert.doesNotMatch(css, /animation:cam-spin/);
assert.match(css, /\.cam-pick-in\{background:linear-gradient/);
assert.match(css, /\.cam-pick-out\{background:linear-gradient/);
assert.match(css, /\.cam-submit-grid\{display:grid;grid-template-columns:1fr 1fr/);

// --- Logika: gambar cutout (even-odd), cincin progres, flash 4 warna, sukses ---
assert.match(app, /function ukuranOverlayCam\(/);
assert.match(app, /function gambarOverlayCam\(/);
assert.match(app, /ctx\.ellipse\(_camGeo\.cx, _camGeo\.cy, _camGeo\.rx, _camGeo\.ry/);
assert.match(app, /ctx\.fill\('evenodd'\)/);
assert.match(app, /_camFlashColors = \['#ec4899', '#3b82f6', '#22c55e', '#f59e0b'\]/);
assert.match(app, /function mulaiFlashLiveness\(/);
assert.match(app, /var durasi = 2200;/);
assert.match(app, /function selesaikanVerifikasiCam\(/);
assert.match(app, /function bunyiSuksesCam\(/);
assert.match(app, /setCamState\('verified', 'Verifikasi berhasil'\)/);
assert.match(app, /'Posisikan wajah di dalam lingkaran'/);
assert.match(app, /'Tahan sebentar/);
assert.match(app, /'Isi lingkaran dengan wajah, jangan terlalu jauh'/);
assert.match(app, /window\.addEventListener\('resize', function \(\) \{ if \(typeof ukuranOverlayCam/);

// --- Deteksi wajah: MediaPipe (ringan) + cadangan heuristik ---
assert.match(app, /function muatDeteksiWajah\(/);
assert.match(app, /@mediapipe\/face_detection@/);
assert.match(app, /model: 'short', minDetectionConfidence: 0\.55/);
assert.match(app, /function wajahDalamOval\(/);
assert.match(app, /function heuristikWajahCam\(/);
assert.match(app, /_camDeteksiGagal = true/);

// --- Alur lama tetap utuh (capture + submit ke backend yang sama) ---
assert.match(app, /function mulaiPindaiWajah\(/);
assert.match(app, /function tampilkanKartuAbsen\(/);
assert.match(app, /function kodeKaryawan\(/);
assert.match(app, /tampilkanKartuAbsen\('Menunggu pilihan'\)/);
assert.match(app, /sembunyikanKartuAbsen\(\);/);
assert.match(backendSrc, /legacyId: p\.legacy_id/);
assert.match(app, /function ulangiFotoAbsen\(/);
assert.match(app, /function kirimAbsenDariKamera\(/);
assert.match(app, /gasCall\('submitAbsensiCamera'/);
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
