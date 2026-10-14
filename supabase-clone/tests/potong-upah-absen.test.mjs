import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mig = readFileSync(new URL('../supabase/migrations/20261014000036_potong_upah_dan_denda_absen_efektif.sql', import.meta.url), 'utf8');
const log = readFileSync(new URL('../../docs/clone-supabase/DECISION-LOG.md', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Upah hari tidak masuk dipotong dari gaji pokok
//    Rumus: gaji pokok = gaji bulanan - (gaji harian x jumlah hari tidak masuk)
//           gaji harian = gaji bulanan / hari kerja efektif
// ---------------------------------------------------------------------------
assert.match(mig, /create or replace function public\.get_rekap_bulanan_semua\(p_bulan_key text\)/);
assert.match(mig, /greatest\(0, s\.gaji_bulanan - \(public\.calc_gaji_harian\(s\.gaji_bulanan, v_hari_kerja\) \* coalesce\(w_agg\.absen, 0\)::integer\)\)/);
assert.match(mig, /v_hari_kerja := public\.calc_hari_kerja_efektif\(p_bulan_key\);/);
assert.doesNotMatch(mig, /^\s*s\.gaji_bulanan,\s*$/m, 'gaji pokok masih dipakai utuh tanpa potong absen');

// ---------------------------------------------------------------------------
// 2) Denda/SP absen pakai absen EFEKTIF (absen fisik - izin/sakit DISETUJUI)
// ---------------------------------------------------------------------------
assert.match(mig, /v_absen_efektif := greatest\(0, r\.total_absen_fisik - r\.total_izin\);/);
assert.match(mig, /lr\.status = 'DISETUJUI'\s*\n\s*and to_char\(lr\.tanggal,'YYYY-MM'\) = p_bulan_key/);
assert.match(mig, /if v_absen_efektif >= 3 then/);
assert.match(mig, /if v_absen_efektif >= 5 then/);
assert.doesNotMatch(mig, /if r\.total_absen_fisik >= 3 then/, 'SP2 absen masih memakai absen fisik');

// SP1 mingguan: absen efektif per minggu (pakai rentang tanggal minggu ISO)
assert.match(mig, /create or replace function public\._tanggal_awal_minggu\(p_minggu text\)/);
assert.match(mig, /split_part\(p_minggu, '-W', 1\) \|\| '-' \|\| split_part\(p_minggu, '-W', 2\) \|\| '-1', 'IYYY-IW-ID'/);
assert.match(mig, /lr\.tanggal between public\._tanggal_awal_minggu\(wk\.minggu\)\s*\n\s*and public\._tanggal_awal_minggu\(wk\.minggu\) \+ 6/);
assert.match(mig, /if w\.telat >= 3 or w\.absen_efektif >= 2 then/);
assert.doesNotMatch(mig, /if w\.telat >= 3 or w\.absen >= 2 then/, 'SP1 mingguan masih memakai absen fisik');
assert.match(mig, /grant execute on function public\._tanggal_awal_minggu\(text\) to authenticated, service_role;/);

// ---------------------------------------------------------------------------
// 3) Telat tidak berubah + bug warisan SP2 denda dobel tetap direplikasi
// ---------------------------------------------------------------------------
assert.match(mig, /if r\.total_telat >= 5 then/);
assert.match(mig, /-- BUG WARISAN yang sengaja direplikasi[\s\S]{0,200}perform public\._tambah_denda_absen\(r\.user_id, p_bulan_key, 50000\);/);
assert.match(mig, /perform public\._catat_denda_sp_detail\(r\.user_id, p_bulan_key, 'SP3', v_sp3_alasan, 100000\);/);

// ---------------------------------------------------------------------------
// 4) Hak akses & notifikasi schema tetap
// ---------------------------------------------------------------------------
assert.match(mig, /if not public\.is_payroll_admin\(\) then\s*\n\s*raise exception 'Akses ditolak: hanya Owner\/Finance yang boleh memproses SP'/);
assert.match(mig, /if not public\.is_payroll_admin\(\) then\s*\n\s*raise exception 'Akses ditolak: hanya Owner\/Finance yang boleh melihat rekap payroll'/);
assert.match(mig, /security definer set search_path = public/);
assert.match(mig, /notify pgrst, 'reload schema'/);

// ---------------------------------------------------------------------------
// 5) Keputusan tercatat di DECISION-LOG
// ---------------------------------------------------------------------------
assert.match(log, /tidak masuk|tidak dapat upah|Potong upah/i);
assert.match(log, /absen efektif|tanpa izin/i);

console.log('potong upah hari tidak masuk + denda absen efektif: ok');
