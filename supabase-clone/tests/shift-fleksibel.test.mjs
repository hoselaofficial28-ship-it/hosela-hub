import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const sql = fs.readFileSync(new URL('supabase/migrations/20261116000055_shift_fleksibel.sql', root), 'utf8');
const app = fs.readFileSync(new URL('app/js/app.js', root), 'utf8');
const html = fs.readFileSync(new URL('app/index.html', root), 'utf8');
const css = fs.readFileSync(new URL('app/css/style.css', root), 'utf8');
const backend = fs.readFileSync(new URL('app/js/real-backend.js', root), 'utf8');

// ---------------------------------------------------------------------------
// 1) SQL: aturan jam per hari (Sabtu) + pilihan shift karyawan
// ---------------------------------------------------------------------------
assert.match(sql, /create table if not exists public\.work_shift_day_rules/);
assert.match(sql, /hari smallint not null check \(hari between 1 and 7\)/);
assert.match(sql, /unique \(shift_id, hari\)/);
// hanya Shift Siang hari Sabtu (6) yang diubah
assert.match(sql, /select s\.id, 6, '12:00', '20:00', 'Sabtu masuk lebih awal'\s*\n\s*from public\.work_shift_templates s\s*\n\s*where s\.kode = 'SIANG'/);
assert.doesNotMatch(sql, /s\.kode = 'PAGI'[\s\S]{0,120}'12:00'/, 'Shift Pagi tidak boleh ikut diubah');

// jadwal: aturan per hari menimpa jam template, urutan prioritas tetap
assert.match(sql, /create or replace function public\.get_jadwal_karyawan\(p_user_id uuid, p_tanggal date\)/);
assert.match(sql, /v_hari smallint := extract\(isodow from p_tanggal\)::smallint;/);
assert.match(sql, /where d\.shift_id = v_shift_id and d\.hari = v_hari/);
assert.match(sql, /coalesce\(v_rule_masuk, v_masuk\), coalesce\(v_rule_pulang, v_pulang\)/);
assert.match(sql, /from public\.employee_shift_overrides o/);
assert.match(sql, /from public\.employee_shift_assignments a/);
assert.match(sql, /sumber text/);

// pilihan karyawan: hanya karyawan aktif, bukan Owner/Finance
assert.match(sql, /create or replace function public\.pilih_shift_saya\(p_kode text\)/);
assert.match(sql, /if v_prof\.bagian in \('Owner','Finance'\) then/);
assert.match(sql, /if v_prof\.status <> 'AKTIF' then/);
assert.match(sql, /v_berlaku := case when v_sudah_masuk then v_tgl \+ 1 else v_tgl end;/);
assert.match(sql, /'PILIH_SHIFT_SENDIRI'/);
assert.match(sql, /insert into public\.employee_shift_assignments\(/);
assert.match(sql, /on conflict \(user_id, berlaku_mulai\) do update/);
assert.match(sql, /create or replace function public\.get_shift_saya\(\)/);
assert.match(sql, /create or replace function public\.simpan_aturan_jam_shift/);
assert.match(sql, /notify pgrst, 'reload schema'/);

// ---------------------------------------------------------------------------
// 2) Frontend: kartu "Shift Saya" di layar Absen Kamera
// ---------------------------------------------------------------------------
assert.match(html, /id="shift-saya-card"/);
assert.match(html, /id="shift-saya-nama"/);
assert.match(html, /id="shift-saya-pilih"/);
assert.match(app, /function loadShiftSaya\(/);
assert.match(app, /function renderShiftSaya\(/);
assert.match(app, /function bukaPilihShift\(/);
assert.match(app, /function pilihShiftSaya\(/);
assert.match(app, /function loadAbsensiCamera\(\) \{\s*\n\s*loadShiftSaya\(\);/);
assert.match(app, /Catatan kehadiran diperbarui\.'\);\s*\n\s*loadShiftSaya\(\);/);
assert.match(backend, /getShiftSaya:[\s\S]{0,160}get_shift_saya/);
assert.match(backend, /pilihShiftSaya:[\s\S]{0,200}pilih_shift_saya/);
assert.match(css, /\.shift-saya-card\{/);
assert.match(css, /\.shift-pilih-btn/);

// ---------------------------------------------------------------------------
// 3) Render nyata kartu (potongan kode app.js dijalankan di vm dengan DOM tiruan)
// ---------------------------------------------------------------------------
const mulai = app.indexOf('var _shiftSayaState');
const akhir = app.indexOf('function loadAbsensiCamera() {');
assert.ok(mulai > 0 && akhir > mulai, 'potongan kode kartu shift tidak ditemukan');
const potongan = app.slice(mulai, akhir);

function elemen() {
  return { textContent: '', innerHTML: '', hidden: false, style: {}, _display: '' };
}
const dom = {
  'shift-saya-card': elemen(),
  'shift-saya-nama': elemen(),
  'shift-saya-jam': elemen(),
  'shift-saya-ganti': elemen(),
  'shift-saya-note': elemen(),
  'shift-saya-pilih': elemen(),
};
const context = {
  console,
  currentUser: { id: 'u1', nama: 'Reyfan', bagian: 'Packing' },
  cacheClearAction: () => {},
  showToast: t => { context._toast = t; },
  gasCall: (aksi, args, ok) => { context._aksi = { aksi, args, ok }; },
  document: { getElementById: id => dom[id] || null },
};
vm.createContext(context);
vm.runInContext(potongan + '\n;this.__render = renderShiftSaya; this.__buka = bukaPilihShift; this.__pilih = pilihShiftSaya; this.__load = loadShiftSaya; this.__state = _shiftSayaState;', context);

// data contoh: hari Sabtu, Shift Siang 12:00-20:00, belum absen
context.__state.data = {
  success: true, tanggal: '2026-11-21', hari: 6, bolehGanti: true, terkunci: false,
  shift: { nama: 'Shift Siang', jamMasuk: '12:00', jamPulang: '20:00', sumber: 'PENEMPATAN' },
  pilihan: [
    { kode: 'PAGI', nama: 'Shift Pagi', jamMasuk: '08:00', jamPulang: '18:00', khususHariIni: false },
    { kode: 'SIANG', nama: 'Shift Siang', jamMasuk: '12:00', jamPulang: '20:00', khususHariIni: true },
  ],
};
context.__render();
assert.equal(dom['shift-saya-card'].style.display, 'block');
assert.equal(dom['shift-saya-nama'].textContent, 'Shift Siang');
assert.equal(dom['shift-saya-jam'].textContent, '12:00 - 20:00');
assert.match(dom['shift-saya-note'].textContent, /berlaku terus sampai diganti/);
assert.equal(dom['shift-saya-pilih'].hidden, true, 'daftar pilihan tertutup sebelum tombol Ganti');

// buka pilihan -> dua tombol, Sabtu ditandai khusus hari ini
context.__buka();
assert.equal(dom['shift-saya-pilih'].hidden, false);
assert.match(dom['shift-saya-pilih'].innerHTML, /Shift Pagi/);
assert.match(dom['shift-saya-pilih'].innerHTML, /Shift Siang/);
assert.match(dom['shift-saya-pilih'].innerHTML, /khusus hari ini/);
assert.match(dom['shift-saya-pilih'].innerHTML, /shift-pilih-btn is-on/, 'shift aktif ditandai');

// sudah absen masuk -> terkunci, catatan berubah
context.__state.terbuka = false;
context.__state.data.terkunci = true;
context.__render();
assert.match(dom['shift-saya-note'].textContent, /berlaku besok/);

// pilih shift -> memanggil aksi pilihShiftSaya
context.__pilih('PAGI');
assert.equal(context._aksi.aksi, 'pilihShiftSaya');
assert.equal(Array.from(context._aksi.args).join(','), 'PAGI');

console.log('shift fleksibel (Sabtu 12:00-20:00 + pilih sendiri): OK');
