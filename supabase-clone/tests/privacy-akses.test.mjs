import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mig = readFileSync(new URL('../supabase/migrations/20261014000028_privacy_hardening.sql', import.meta.url), 'utf8');
const rls = readFileSync(new URL('../supabase/migrations/20261005000002_rls.sql', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) RLS tabel: karyawan hanya barisnya sendiri, Owner/Finance semua
// ---------------------------------------------------------------------------
const wajibSendiri = [
  'baca izin sendiri',
  'baca attendance events sendiri',
  'baca attendance details sendiri',
  'baca attendance weekly sendiri',
  'baca anomali sendiri',
  'baca kpi laporan sendiri',
  'baca profil sendiri',
  'baca notifikasi sendiri',
  'tandai notifikasi sendiri dibaca'
];
for (const nama of wajibSendiri) {
  assert.match(rls, new RegExp('create policy "' + nama + '"'), 'policy hilang: ' + nama);
}
// Tiap policy "sendiri" harus menyebut auth.uid(). Pengecualian: pengumuman
// ("bagian sendiri atau ALL") memang memakai bagian, bukan user id.
for (const m of rls.matchAll(/create policy "([^"]+sendiri[^"]*)"[\s\S]{0,220}?using \(([^;]+)\);/g)) {
  if (/pengumuman/i.test(m[1])) continue;
  assert.match(m[2], /auth\.uid\(\)/, 'policy tanpa auth.uid(): ' + m[1]);
}
// Gaji hanya Owner/Finance; karyawan hanya slip yang sudah PUBLISHED
assert.match(rls, /create policy "payroll admin baca salary settings"[\s\S]*?is_payroll_admin\(\)/);
assert.match(rls, /create policy "karyawan baca slip sendiri yang published"[\s\S]*?is_payroll_admin\(\)/);

// ---------------------------------------------------------------------------
// 2) Migration pengetatan: penjagaan login & kepemilikan
// ---------------------------------------------------------------------------
// Fungsi yang sebelumnya bocor karena `<> auth.uid()` bernilai NULL saat belum login
for (const fn of ['get_payroll_detail', 'get_payroll_employee_slip', 'get_payroll_employee_slip_detail', 'get_papan_peringkat', 'get_ide', 'hitung_bintang']) {
  const badan = new RegExp('create or replace function public\\.' + fn + '\\([\\s\\S]*?\\$\\$;', 'i').exec(mig);
  assert.ok(badan, 'fungsi tidak ditulis ulang: ' + fn);
  assert.match(badan[0], /if auth\.uid\(\) is null then[\s\S]*?raise exception 'Harus login'/, 'tanpa penjagaan login: ' + fn);
}
// Gaji/denda: hanya diri sendiri atau Owner/Finance
assert.match(mig, /create or replace function public\.get_effective_salary_setting\([\s\S]*?coalesce\(p_user_id, auth\.uid\(\)\) <> auth\.uid\(\) and not public\.is_payroll_admin\(\)[\s\S]*?Akses ditolak: hanya boleh melihat data gaji sendiri/);
assert.match(mig, /create or replace function public\.get_total_denda_bulan\([\s\S]*?Akses ditolak: hanya boleh melihat data denda sendiri/);
assert.match(mig, /create or replace function public\.hitung_bintang\([\s\S]*?Akses ditolak: hanya boleh melihat data sendiri/);

// ---------------------------------------------------------------------------
// 3) Izin panggil: anon dicabut, authenticated hanya untuk yang dipakai aplikasi
// ---------------------------------------------------------------------------
assert.match(mig, /revoke execute on function %s from public, anon/);
assert.match(mig, /grant execute on function %s to service_role/);
assert.match(mig, /if r\.nama in \('resolve_login_email', 'get_daftar_options'\) then\s*\n\s*continue;/);
assert.match(mig, /notify pgrst, 'reload schema'/);
// Pemberian izin harus tahan terhadap fungsi yang belum ada di database
// (pernah gagal: attach_absensi_photo dari migrasi foto yang belum dijalankan).
assert.match(mig, /if to_regprocedure\(nama\) is not null then/);
assert.match(mig, /execute format\('grant execute on function %s to authenticated', nama\)/);
// Fungsi sensitif TIDAK boleh diberi izin ke authenticated (cukup dipakai internal)
for (const fn of ['get_effective_salary_setting', 'get_total_denda_bulan', 'hitung_bintang']) {
  assert.doesNotMatch(mig, new RegExp("'public\\." + fn + "\\("), 'jangan beri izin ke authenticated: ' + fn);
}
// Fungsi yang dipakai aplikasi tetap diberi izin (kalau tidak, aplikasi mati setelah PUBLIC dicabut)
for (const fn of ['get_absensi_rekap', 'get_all_users', 'get_salary_users', 'submit_izin', 'approve_izin', 'get_payroll_employee_slip', 'calc_hari_kerja_efektif']) {
  assert.match(mig, new RegExp("'public\\." + fn + "\\("), 'daftar grant hilang: ' + fn);
}

// ---------------------------------------------------------------------------
// 3b) Fungsi pembantu RLS wajib tetap bisa dipanggil pengguna yang login.
//     Pernah terjadi: izinnya ikut dicabut sehingga semua query ber-RLS gagal
//     ("permission denied for function current_bagian") dan aplikasi tidak bisa
//     login. Perbaikan ada di 028 (bagian 5) dan 029.
// ---------------------------------------------------------------------------
const fix029 = readFileSync(new URL('../supabase/migrations/20261014000029_fix_rls_helper_grants.sql', import.meta.url), 'utf8');
for (const helper of ['current_bagian', 'is_owner', 'is_finance', 'is_payroll_admin']) {
  const pola = new RegExp('grant execute on function public\\.' + helper + '\\(\\) to public, anon, authenticated, service_role');
  assert.match(fix029, pola, 'migrasi 029 tidak mengembalikan izin: ' + helper);
  assert.match(mig, pola, 'migrasi 028 tidak mengembalikan izin: ' + helper);
}
// Policy RLS yang memakai helper itu harus tetap ada (bukti kenapa ini wajib)
assert.match(rls, /create policy "owner finance baca semua profil"[\s\S]*?is_payroll_admin\(\)/);
assert.match(rls, /create policy "baca pengumuman untuk bagian sendiri atau ALL"[\s\S]*?current_bagian\(\)/);

// ---------------------------------------------------------------------------
// 4) Aplikasi: Owner bisa melihat & menyetujui pengajuan izin
// ---------------------------------------------------------------------------
assert.match(app, /if \(u\.bagian === 'Owner'\) \{[\s\S]{0,900}?menus\.push\(\{id:'s-kelola-izin'/);
// Karyawan tetap hanya memuat datanya sendiri lewat query ber-RLS
assert.match(backend, /getIzinKaryawan: async function \(args\) \{\s*\n\s*var userId = args\[0\];[\s\S]{0,200}?\.eq\('user_id', userId\)/);
assert.match(backend, /\.eq\('user_id', userId\)\.eq\('tanggal', tgl\)/);

console.log('privasi data karyawan (hanya lihat milik sendiri): ok');
