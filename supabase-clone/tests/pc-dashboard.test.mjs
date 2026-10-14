import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
const src = readFileSync(new URL('../app/js/dashboard-reports.js', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Uji fungsi murni modul laporan (tanpa DOM, tanpa jaringan)
// ---------------------------------------------------------------------------
const mod = new Function(
  'uiIcon',
  src + '\nreturn { pcTodayKey, pcJamSingkat, pcRupiah, pcAttendanceSummary, pcPerformanceSummary, pcPersonalSummary, pcLiburHariIni, pcTanggalId, pcRenderSidebarNav, pcAttendanceCardHtml, pcPerformanceCardHtml, pcActionCardHtml, pcPersonalReportsHtml, pcEscape };'
)(function (name) { return '<svg data-icon="' + name + '"></svg>'; });

assert.equal(mod.pcTodayKey(new Date(2026, 9, 14)), '2026-10-14');
assert.equal(mod.pcJamSingkat('08:12:31'), '08:12');
assert.equal(mod.pcJamSingkat(''), '');
assert.equal(mod.pcRupiah(50000), 'Rp 50.000');

// Matriks contoh: hari ke-14.
function cell(o) { return Object.assign({ masuk: '', pulang: '', telat: false, absen: false, anomali: false, jadwalMasuk: '08:00', rows: [] }, o); }
const matrix = {
  bulan: '2026-10',
  users: [
    { id: 'a', nama: 'Adhe', bagian: 'Gudang', days: { 14: cell({ masuk: '08:03', pulang: '17:02' }) } },
    { id: 'b', nama: 'Deri', bagian: 'Packing', days: { 14: cell({ masuk: '09:20', telat: true }) } },
    { id: 'c', nama: 'Desi', bagian: 'Ecommerce', days: { 14: cell({ masuk: '08:00', telat: false, pulang: '17:00' }) } },
    { id: 'd', nama: 'Budi', bagian: 'Gudang', days: { 14: cell({ anomali: true, anomaliTipe: 'TAP_DObel' }) } },
    { id: 'e', nama: 'Sari', bagian: 'CS', days: { 14: cell({ absen: true }) } },
    { id: 'f', nama: 'Tono', bagian: 'Gudang', days: {} }
  ]
};

const sum = mod.pcAttendanceSummary(matrix, '2026-10-14', { liburNama: '' });
assert.equal(sum.total, 6, 'total karyawan dihitung');
assert.equal(sum.hadir, 3, 'hadir = yang punya tap masuk');
assert.equal(sum.terlambat, 1, 'terlambat hanya yang masuk melewati jadwal');
assert.equal(sum.tepatWaktu, 2);
assert.equal(sum.sudahPulang, 2);
assert.equal(sum.anomali, 1, 'anomali tanpa tap dihitung terpisah');
assert.equal(sum.alpa, 1, 'absen tanpa keterangan dihitung terpisah');
assert.equal(sum.belum, 1, 'tanpa tap sama sekali = belum absen');
assert.equal(sum.terlambatList.length, 1);
assert.equal(sum.terlambatList[0].nama, 'Deri');
assert.equal(sum.terlambatList[0].masuk, '09:20');
assert.equal(sum.terlambatList[0].jadwal, '08:00');
assert.equal(sum.belumList.length, 1);
assert.equal(sum.belumList[0].nama, 'Tono');

// Matriks kosong tidak boleh meledak dan tidak menuduh siapa pun terlambat.
const kosong = mod.pcAttendanceSummary(null, '2026-10-14', {});
assert.equal(kosong.total, 0);
assert.equal(kosong.terlambat, 0);
assert.equal(kosong.terlambatList.length, 0);

// Dua yang telat: yang paling telat muncul lebih dulu.
const matrix2 = {
  users: [
    { id: 'x', nama: 'A', bagian: 'G', days: { 14: cell({ masuk: '08:10', telat: true }) } },
    { id: 'y', nama: 'B', bagian: 'G', days: { 14: cell({ masuk: '10:45', telat: true }) } }
  ]
};
const sum2 = mod.pcAttendanceSummary(matrix2, '2026-10-14', {});
assert.deepEqual(sum2.terlambatList.map(function (x) { return x.nama; }), ['B', 'A']);

// Ringkasan kinerja bulan ini
const rekap = {
  data: [
    { nama: 'Adhe', bagian: 'Gudang', hadir: 20, telat: 0, absen: 0, bintang: 5, skor: 95, totalDenda: 0, totalReward: 100000 },
    { nama: 'Deri', bagian: 'Packing', hadir: 16, telat: 4, absen: 1, bintang: 3, skor: 70, totalDenda: 150000, totalReward: 0 },
    { nama: 'Desi', bagian: 'Ecommerce', hadir: 19, telat: 1, absen: 0, bintang: 4, skor: 88, totalDenda: 20000, totalReward: 25000 }
  ]
};
const perf = mod.pcPerformanceSummary(rekap);
assert.equal(perf.ada, true);
assert.equal(perf.jumlah, 3);
assert.equal(perf.totalTelat, 5);
assert.equal(perf.totalAbsen, 1);
assert.equal(perf.totalDenda, 170000);
assert.equal(perf.totalReward, 125000);
assert.equal(perf.rataSkor, 84);
assert.deepEqual(perf.top.map(function (x) { return x.nama; }), ['Adhe', 'Desi', 'Deri']);
assert.equal(perf.perhatian[0].nama, 'Deri', 'telat+absen terbanyak masuk "perlu perhatian"');
assert.equal(mod.pcPerformanceSummary(null).ada, false);
assert.equal(mod.pcPerformanceSummary({ data: [] }).ada, false);

// Ringkasan pribadi
const pribadi = mod.pcPersonalSummary({ users: [{ id: 'a', nama: 'Adhe', days: { 3: cell({ masuk: '08:00' }), 4: cell({ masuk: '08:30', telat: true }), 5: cell({ absen: true }), 14: cell({ masuk: '07:55' }) } }] }, '2026-10-14');
assert.equal(pribadi.masuk, '07:55');
assert.equal(pribadi.hadir, 3);
assert.equal(pribadi.telatCount, 1);
assert.equal(pribadi.absen, 1);

// Libur: tanggal dari getKalenderLibur sudah terformat ("14 Okt 2026")
assert.equal(mod.pcTanggalId('2026-10-14'), '14 Okt 2026');
assert.equal(mod.pcLiburHariIni([{ tanggal: '14 Okt 2026', nama: 'Cuti Bersama' }], '2026-10-14'), 'Cuti Bersama');
assert.equal(mod.pcLiburHariIni([{ tanggal: '1 Jan 2026', nama: 'Tahun Baru' }], '2026-10-14'), '');

// Sidebar: semua menu masuk, kelompok terbentuk, menu aktif ditandai
const sidebar = mod.pcRenderSidebarNav({
  menus: [
    { id: 's-absensi-camera', icon: 'camera', label: 'Absensi Kamera' },
    { id: 's-payroll', icon: 'card', label: 'Penggajian' }
  ],
  activeId: 's-payroll',
  urutan: ['Kehadiran & Personal', 'Finance & Owner'],
  kategoriDari: function (m) { return m.id === 's-payroll' ? 'Finance & Owner' : 'Kehadiran & Personal'; },
  labelKategori: function (c) { return c; },
  beranda: { id: 's-home', label: 'Beranda', icon: 'home' }
});
assert.match(sidebar, /data-screen="s-home"/);
assert.match(sidebar, /data-screen="s-absensi-camera"/);
assert.match(sidebar, /class="pc-nav-item active" data-screen="s-payroll"/);
assert.match(sidebar, /pc-nav-group">Kehadiran &amp; Personal|pc-nav-group">Kehadiran & Personal/);
assert.match(sidebar, /data-icon="camera"/);

// HTML laporan memuat angka penting dan tidak meloloskan HTML mentah
const kartu = mod.pcAttendanceCardHtml(sum, { jamSekarang: '09:30' });
assert.match(kartu, /3 dari 6 karyawan sudah absen masuk/);
assert.match(kartu, /Deri/);
assert.match(kartu, /09:20/);
assert.match(kartu, /Belum absen/);
assert.match(mod.pcEscape('<b>"x"</b>'), /&lt;b&gt;/);
const jahat = mod.pcAttendanceSummary({ users: [{ id: 'z', nama: '<img src=x onerror=alert(1)>', bagian: 'G', days: { 14: cell({ masuk: '09:00', telat: true }) } }] }, '2026-10-14', {});
assert.ok(mod.pcAttendanceCardHtml(jahat, {}).indexOf('<img src=x') === -1, 'nama karyawan harus di-escape');

// Kartu pribadi: skor KPI tidak boleh ditulis 0 kalau belum terbaca dari server
const pribadiTanpaSkor = mod.pcPersonalReportsHtml({
  attendance: { statusText: 'Masuk 07:55 — tepat waktu', masuk: '07:55', pulang: '', jadwal: '08:00' },
  performance: { skor: null, bintang: 0, hadir: 12, telat: 1, absen: 0 },
  izin: [], slip: []
});
assert.ok(pribadiTanpaSkor.indexOf('Skor KPI') === -1, 'skor KPI kosong tidak ditampilkan');
assert.match(pribadiTanpaSkor, /Masuk 07:55/);
assert.match(pribadiTanpaSkor, /Hadir bulan ini/);
const pribadiDenganSkor = mod.pcPersonalReportsHtml({
  attendance: { statusText: 'Masuk 08:30 — terlambat', masuk: '08:30', pulang: '', jadwal: '08:00' },
  performance: { skor: 88, bintang: 4, hadir: 18, telat: 2, absen: 0 },
  izin: [{ jenis: 'SAKIT', tanggal: '1 Okt 2026', status: 'DISETUJUI' }],
  slip: [{ bulan: '2026-09', totalGaji: 4500000, dipublishPada: '1 Okt 2026' }]
});
assert.match(pribadiDenganSkor, /Skor KPI/);
assert.match(pribadiDenganSkor, /88\/100/);
assert.match(pribadiDenganSkor, /Rp 4\.500\.000/);

// ---------------------------------------------------------------------------
// 2) Halaman & skrip tersambung
// ---------------------------------------------------------------------------
assert.match(html, /<section class="pc-reports" id="pc-reports" hidden/);
assert.match(html, /id="pc-reports-grid"/);
assert.match(html, /onclick="loadDesktopReports\(true\)"/);
assert.match(html, /<script src="js\/dashboard-reports\.js\?v=20261014y"><\/script>/);
assert.match(sw, /'\.\/js\/dashboard-reports\.js'/);

// ---------------------------------------------------------------------------
// 3) app.js: menu dipindah ke sidebar + laporan dimuat di halaman utama
// ---------------------------------------------------------------------------
assert.match(app, /function applyDesktopNavigation\(\)/);
assert.match(app, /function pcSidebarModel\(\)/);
assert.match(app, /function updateDesktopNavActive\(activeId\)/);
assert.match(app, /function loadDesktopReports\(force\)/);
assert.match(app, /window\._homeMenus = menus;/);
assert.match(app, /document\.getElementById\('home-menu'\)\.innerHTML = renderHomeMenuSections\(menus\);\r?\n window\._homeMenus = menus;\r?\n applyDesktopNavigation\(\);\r?\n loadDesktopReports\(true\);/);
assert.match(app, /el\.classList\.add\('active'\);\r?\n updateDesktopNavActive\(id\);/);
assert.match(app, /if \(id === 's-home'\) loadDesktopReports\(false\);/);
assert.match(app, /pcRenderSidebarNav\(pcSidebarModel\(\)\)/);
assert.match(app, /pcAttendanceSummary\(bag\.matrix, todayKey, \{ liburNama: liburNama \}\)/);
assert.match(app, /pcPerformanceSummary\(bag\.rekap\)/);
assert.match(app, /pcPersonalSummary\(sendiri\.matrix, todayKey\)/);
assert.match(app, /Sebagian data gagal dimuat: /);

// Sidebar harus tetap tampil di SEMUA menu, termasuk layar yang belum punya
// kartu navbar sendiri (Catatan Kehadiran, Payroll, dst).
assert.match(app, /var PC_SIDEBAR_SKIP = \['s-login', 's-daftar', 's-paksa-ganti-pin'\]/);
assert.match(app, /function pcEnsureSidebars\(\)/);
assert.match(app, /nav\.setAttribute\('data-pc-sidebar', '1'\)/);
assert.match(app, /function pcRemoveInjectedSidebars\(\)/);
assert.match(app, /pcEnsureSidebars\(\);\r?\n var navs = pcNavbarEls\(\);/);

// ---------------------------------------------------------------------------
// 4) CSS: laporan hanya di PC, kartu menu disembunyikan, sidebar bisa digulir
// ---------------------------------------------------------------------------
assert.match(css, /\.pc-reports\{display:none\}/);
assert.match(css, /body:not\(\.phone-mode\) \.pc-reports:not\(\[hidden\]\)\{/);
assert.match(css, /body:not\(\.phone-mode\) #home-menu\{display:none!important\}/);
assert.match(css, /body:not\(\.phone-mode\) \.navbar\.pc-nav-full\{[\s\S]*?overflow-y:auto/);
assert.match(css, /body:not\(\.phone-mode\) \.navbar \.pc-nav-item\.active\{background:linear-gradient/);
assert.match(css, /body:not\(\.phone-mode\) \.pc-card\{[\s\S]*?border-radius:20px/);
assert.match(css, /body:not\(\.phone-mode\) \.pc-metric-row\{[\s\S]*?grid-template-columns:repeat\(auto-fit/);
// Kartu kolom kanan tidak boleh melar setinggi kolom laporan (kartu jam jadi
// kotak kosong raksasa kalau align-self dibiarkan stretch), dan laporan harus
// merentang baris supaya kolom kanan tetap rapat.
assert.match(css, /body:not\(\.phone-mode\) \.pc-reports:not\(\[hidden\]\)\{[\s\S]*?grid-row:2 \/ span 30/);
assert.match(css, /body:not\(\.phone-mode\) \.home-clock-card,\s*\n\s*body:not\(\.phone-mode\) #reward-section,\s*\n\s*body:not\(\.phone-mode\) #profile-card,[\s\S]*?align-self:start!important/);
// Semua layar menu memakai grid 2 kolom (sidebar + isi), kecuali layar sebelum login.
assert.match(css, /body:not\(\.phone-mode\) \.screen\.active:not\(#s-login\):not\(#s-daftar\):not\(#s-paksa-ganti-pin\)\{\s*\n\s*grid-template-columns:294px minmax\(0,1fr\)!important/);
assert.match(css, /body:not\(\.phone-mode\) \.screen\.active:not\(#s-login\):not\(#s-daftar\):not\(#s-paksa-ganti-pin\)>\.content\{\s*\n\s*grid-column:2!important/);
// Isi menu memakai SELURUH lebar kolom (dulu mentok 1160px → separuh kanan kosong,
// dan sebagian dipusatkan → garis kiri tidak lurus/zigzag). Kolom isian dibatasi.
// Catatan: `.content .card` (keturunan) benar, `>*>.card` salah karena berarti cucu.
assert.match(css, /body:not\(\.phone-mode\) \.screen\.active>\.content>\*\{\s*\n\s*max-width:none!important;\s*\n\s*margin-left:0!important/);
// Kolom isian TIDAK dibatasi lebarnya (Ko minta isian di-fullkan mengikuti kartu).
assert.doesNotMatch(css, /\.content \.card \.form-group \.form-input\{\s*\n\s*max-width:680px/);
assert.match(css, /body:not\(\.phone-mode\) #s-kalender>\.content>\.card\{\s*\n\s*display:grid/);
// Judul laporan dibuat kartu supaya garis kirinya sejajar dengan kartu di bawahnya.
assert.match(css, /body:not\(\.phone-mode\) \.pc-reports-head\{[\s\S]*?padding:16px 20px;[\s\S]*?border:1px solid #dfe8f6;/);
// Bar judul menu tidak boleh menjorok: margin kiri harus 0 supaya lurus dengan
// kartu isi di bawahnya (ini yang bikin judul halaman "Slip Gaji" terlihat zigzag).
assert.match(css, /#s-slip-gaji\.screen\.active>\.header\{[\s\S]{0,220}?margin:13px 22px 0 0!important/);
assert.doesNotMatch(css, /#s-slip-gaji\.screen\.active>\.header\{[\s\S]{0,220}?margin:13px 22px 0!important/);

// ---------------------------------------------------------------------------
// 5) Versi cache naik serentak
// ---------------------------------------------------------------------------
assert.match(html, /css\/style\.css\?v=20261014y/);
assert.match(html, /js\/app\.js\?v=20261014y/);
assert.match(app, /APP_VERSION = '20261014y'/);
assert.match(sw, /APP_VERSION = '20261014y'/);

console.log('dashboard PC (sidebar penuh + laporan kinerja): ok');
