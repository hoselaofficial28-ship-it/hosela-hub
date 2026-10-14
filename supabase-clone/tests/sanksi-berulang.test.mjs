import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mig = readFileSync(new URL('../supabase/migrations/20261014000034_sanksi_berulang.sql', import.meta.url), 'utf8');
const mig028 = readFileSync(new URL('../supabase/migrations/20261014000028_privacy_hardening.sql', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const log = readFileSync(new URL('../../docs/clone-supabase/DECISION-LOG.md', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Tabel riwayat + RLS
// ---------------------------------------------------------------------------
assert.match(mig, /create table if not exists public\.sanksi_berulang \(/);
for (const kolom of ['tingkat integer not null', 'denda integer not null', 'kerajinan_hilang boolean', 'telat integer', 'absen_efektif integer', 'status text not null default \'AKTIF\'', 'unique \(user_id, bulan\)']) {
  assert.ok(mig.indexOf(kolom) !== -1, 'kolom hilang: ' + kolom);
}
assert.match(mig, /alter table public\.sanksi_berulang enable row level security/);
assert.match(mig, /create policy "baca sanksi berulang sendiri" on public\.sanksi_berulang for select\s*\n\s*using \(user_id = auth\.uid\(\) or public\.is_payroll_admin\(\)\)/);

// ---------------------------------------------------------------------------
// 2) Pemicu: telat >= 5 ATAU absen efektif >= 3 (absen dikurangi izin/sakit disetujui)
// ---------------------------------------------------------------------------
assert.match(mig, /v_bermasalah := \(coalesce\(v_telat, 0\) >= 5\) or \(v_absen_efektif >= 3\)/);
assert.match(mig, /v_absen_efektif := greatest\(0, coalesce\(v_absen_fisik, 0\) - coalesce\(v_izin, 0\)\)/);
assert.match(mig, /from public\.leave_requests lr\s*\n\s*where lr\.user_id = r\.id and lr\.status = 'DISETUJUI'/);

// ---------------------------------------------------------------------------
// 3) Tangga denda: 50.000 x tingkat (50rb, 100rb, 150rb, 200rb, ...)
//    tingkat = tingkat bulan lalu + 1
// ---------------------------------------------------------------------------
assert.match(mig, /v_denda := 50000 \* v_tingkat;/);
assert.match(mig, /select s\.tingkat into v_tingkat_lalu from public\.sanksi_berulang s\s*\n\s*where s\.user_id = r\.id and s\.bulan = v_bulan_lalu and s\.status = 'AKTIF'/);
assert.match(mig, /if found then\s*\n\s*v_tingkat := coalesce\(v_tingkat_lalu, 0\) \+ 1;\s*\n\s*end if;/);

// ---------------------------------------------------------------------------
// 4) Kerajinan hilang sejak tingkat 2 (dan hanya di sumber angka yang dipakai slip)
// ---------------------------------------------------------------------------
assert.match(mig, /kerajinan_hilang = excluded\.kerajinan_hilang|v_tingkat >= 2, coalesce\(v_telat, 0\)/);
assert.match(mig, /create or replace function public\.bonus_kerajinan_efektif\(/);
assert.match(mig, /and s\.status = 'AKTIF' and s\.tingkat >= 2\s*\n\s*\) then 0\s*\n\s*else public\.calc_bonus_kerajinan\(p_absen_fisik, p_bonus_setting\)/);
assert.match(mig, /public\.bonus_kerajinan_efektif\(p\.id, p_bulan_key, coalesce\(w_agg\.absen, 0\)::integer, s\.bonus_kerajinan\)/);
assert.doesNotMatch(mig, /public\.calc_bonus_kerajinan\(coalesce\(w_agg\.absen, 0\)::integer, s\.bonus_kerajinan\)/, 'rekap masih memakai calc_bonus_kerajinan langsung');

// ---------------------------------------------------------------------------
// 5) Bulan membaik: batalkan hanya denda yang BELUM dibayar (slip PUBLISHED utuh)
// ---------------------------------------------------------------------------
assert.match(mig, /select exists\(select 1 from public\.payroll_runs pr\s*\n\s*where pr\.bulan = x\.bulan and pr\.status = 'PUBLISHED'\) into v_published;/);
assert.match(mig, /if v_published then\s*\n\s*v_tidak_ditarik := v_tidak_ditarik \+ 1;\s*\n\s*else/);
assert.match(mig, /update public\.sanksi_berulang set status = 'DIBATALKAN' where id = x\.id;/);
assert.match(mig, /d\.keterangan like 'SB%'/);

// ---------------------------------------------------------------------------
// 6) Anti-dobel + denda SB menggantikan denda SP2 datar pada tingkat >= 2
// ---------------------------------------------------------------------------
assert.match(mig, /delete from public\.attendance_details d\s*\n\s*where d\.user_id = r\.id and d\.tipe = 'DENDA_SP'\s*\n\s*and to_char\(d\.tanggal,'YYYY-MM'\) = p_bulan_key\s*\n\s*and \(d\.keterangan like 'SB%' or d\.keterangan like 'SP2%'\);/);
assert.match(mig, /values \(r\.id, v_minggu, v_hari_terakhir, null, 'DENDA_SP',/);
assert.match(mig, /'SB' \|\| v_tingkat \|\| ' – Sanksi Berulang bulan ke-' \|\| v_tingkat/);

// ---------------------------------------------------------------------------
// 7) Ikut jalan saat tombol Proses Absensi + notifikasi + hak akses
// ---------------------------------------------------------------------------
assert.match(mig, /v_sb := public\.evaluasi_sanksi_berulang\(p_bulan_key\);/);
assert.match(mig, /'sanksiBerulang', coalesce\(v_sb->>'sanksi', '0'\)::integer/);
assert.match(mig, /insert into public\.notifications\(user_id, judul, isi, tipe, menu\)\s*\n\s*values \(r\.id, '⚠️ SB' \|\| v_tingkat \|\| ' – Sanksi Berulang'/);
assert.match(mig, /if not public\.is_payroll_admin\(\) then\s*\n\s*raise exception 'Akses ditolak: hanya Owner\/Finance yang boleh menghitung sanksi berulang'/);
assert.match(mig, /revoke execute on function public\.evaluasi_sanksi_berulang\(text\) from public, anon;/);
assert.match(mig, /grant execute on function public\.evaluasi_sanksi_berulang\(text\) to authenticated, service_role;/);
assert.match(mig, /notify pgrst, 'reload schema'/);
assert.ok(mig028.indexOf("'public.process_absensi_lengkap(text)'") !== -1, 'migrasi 028 harus tetap memberi izin proses lengkap');

// ---------------------------------------------------------------------------
// 8) Aplikasi menampilkan hasil sanksi berulang + keputusan tercatat
// ---------------------------------------------------------------------------
assert.match(app, /'Rekap diperbarui: '\+\(res\.rekapRows \|\| 0\)\+' minggu · SP: '\+\(res\.spEntries \|\| 0\)\+' · Sanksi Berulang: '\+\(res\.sanksiBerulang \|\| 0\)/);
assert.match(log, /Sanksi Berulang/i);
assert.match(log, /Rp50\.000 x tingkat|50\.000 x tingkat|SB1/);

// ---------------------------------------------------------------------------
// 4b) Kerajinan: hari SAKIT/IZIN yang disetujui tidak menghilangkan kerajinan
//     (keputusan Ko 14 Okt 2026 — berbeda dari aplikasi lama yang pakai absen fisik)
// ---------------------------------------------------------------------------
const migKerajinan = readFileSync(new URL('../supabase/migrations/20261014000035_kerajinan_toleransi_izin.sql', import.meta.url), 'utf8');
assert.match(migKerajinan, /create or replace function public\.bonus_kerajinan_efektif\(/);
assert.match(migKerajinan, /select count\(\*\) into v_izin\s*\n\s*from public\.leave_requests lr\s*\n\s*where lr\.user_id = p_user_id\s*\n\s*and lr\.status = 'DISETUJUI'/);
assert.match(migKerajinan, /v_absen_efektif := greatest\(0, coalesce\(p_absen_fisik, 0\) - coalesce\(v_izin, 0\)\)/);
assert.match(migKerajinan, /if v_absen_efektif > 0 then\s*\n\s*return 0;\s*\n\s*end if;/);
assert.match(migKerajinan, /and s\.status = 'AKTIF' and s\.tingkat >= 2/);
assert.match(migKerajinan, /return greatest\(0, coalesce\(p_bonus_setting, 0\)\);/);
assert.match(migKerajinan, /notify pgrst, 'reload schema'/);

console.log('sanksi berulang (SB): tangga denda, kerajinan, pembatalan: ok');
