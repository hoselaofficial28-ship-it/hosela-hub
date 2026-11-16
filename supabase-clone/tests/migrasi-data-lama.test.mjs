import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mig = readFileSync(new URL('../supabase/migrations/20261116000050_import_legacy_gas.sql', import.meta.url), 'utf8');
const alat = readFileSync(new URL('../tools/import-legacy-gas.mjs', import.meta.url), 'utf8');
const rencana = readFileSync(new URL('../../docs/clone-supabase/12-RENCANA-MIGRASI-DATA-LAMA.md', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Migrasi 050: kunci impor `legacy_id` untuk tabel yang belum punya
// ---------------------------------------------------------------------------
for (const tabel of ['rules', 'work_schedules', 'late_reviews', 'audit_logs']) {
  assert.match(mig, new RegExp(`alter table public\\.${tabel}\\s+add column if not exists legacy_id text;`));
  assert.match(mig, new RegExp(`create unique index if not exists ${tabel}_legacy_id_key`));
}

// ---------------------------------------------------------------------------
// 2) Log batch impor + hanya Owner yang boleh membaca
// ---------------------------------------------------------------------------
assert.match(mig, /create table if not exists public\.legacy_import_batches/);
assert.match(mig, /alter table public\.legacy_import_batches enable row level security;/);
assert.match(mig, /legacy_import_batches_owner_read/);
assert.match(mig, /lower\(coalesce\(auth\.jwt\(\) ->> 'email', ''\)\) = 'hoselaofficial28@gmail\.com'/);

// ---------------------------------------------------------------------------
// 3) import_legacy_rows: daftar tabel putih, upsert, batas batch, khusus Owner
// ---------------------------------------------------------------------------
assert.match(mig, /create or replace function public\.import_legacy_rows\(\s*p_tabel text,\s*p_rows jsonb,\s*p_kunci text default 'legacy_id'/);
assert.match(mig, /'profiles','salary_settings','attendance_events','attendance_details','attendance_weekly'/);
assert.match(mig, /if not \(p_tabel = any\(v_tabel_diizinkan\)\) then/);
assert.match(mig, /if p_kunci not in \('legacy_id', 'id', 'key'\) then/);
assert.match(mig, /if jsonb_array_length\(p_rows\) > 2000 then/);
assert.match(mig, /jsonb_populate_recordset\(null::public\.%1\$I, \$1\)/);
assert.match(mig, /on conflict \(%3\$s\) do update set %4\$s/);
assert.match(mig, /get diagnostics v_jumlah = row_count;/);
assert.match(mig, /revoke execute on function public\.import_legacy_rows\(text, jsonb, text\) from public, anon;/);
assert.match(mig, /grant execute on function public\.import_legacy_rows\(text, jsonb, text\) to authenticated, service_role;/);

// ---------------------------------------------------------------------------
// 4) Bersih-bersih data uji: hanya Owner, tidak menghapus akun/app_settings
// ---------------------------------------------------------------------------
assert.match(mig, /create or replace function public\.hapus_data_uji_hub\(\)/);
assert.match(mig, /delete from public\.attendance_events where true;/);
assert.match(mig, /delete from public\.attendance_details where true;/);
assert.match(mig, /delete from public\.payroll_items where true;/);
assert.match(mig, /update public\.profiles set status = 'NONAKTIF'/);
assert.doesNotMatch(mig, /delete from public\.app_settings/, 'app_settings tidak boleh dikosongkan');
assert.doesNotMatch(mig, /delete from auth\.users/, 'akun login tidak boleh dihapus otomatis');

// Supabase menolak DELETE tanpa WHERE ("DELETE requires a WHERE clause", 21000) â€”
// setiap DELETE wajib punya klausa WHERE.
assert.ok((mig.match(/where true;/g) || []).length >= 17, 'DELETE tanpa WHERE akan ditolak Supabase');
assert.doesNotMatch(mig, /^\s*delete from public\.[a-z_]+;\s*$/m, 'ada DELETE tanpa WHERE');

// Perbaikan fungsi yang sama (migrasi 051) juga harus memakai WHERE.
const fix = readFileSync(new URL('../supabase/migrations/20261116000051_fix_hapus_data_uji.sql', import.meta.url), 'utf8');
assert.match(fix, /create or replace function public\.hapus_data_uji_hub\(\)/);
assert.ok((fix.match(/where true;/g) || []).length >= 17);
assert.doesNotMatch(fix, /delete from public\.app_settings/);

// ---------------------------------------------------------------------------
// 4b) Nilai kosong pada kolom wajib memakai nilai bawaan kolom (migrasi 052)
//     Tanpa ini impor ditolak: "null value in column created_at ... violates
//     not-null constraint" (23502).
// ---------------------------------------------------------------------------
const fixNilai = readFileSync(new URL('../supabase/migrations/20261116000052_fix_import_nilai_kosong.sql', import.meta.url), 'utf8');
assert.match(fixNilai, /create or replace function public\.import_legacy_rows\(/);
assert.match(fixNilai, /is_nullable = 'NO' and column_default is not null/);
assert.match(fixNilai, /format\('coalesce\(%1\$I, %2\$s\)', column_name, column_default\)/);
assert.match(fixNilai, /format\('%1\$I = coalesce\(excluded\.%1\$I, %2\$s\)', column_name, column_default\)/);
assert.match(fixNilai, /from jsonb_populate_recordset\(null::public\.%1\$I, \$1\)/);
assert.doesNotMatch(fixNilai, /delete from/i, 'migrasi 052 tidak boleh menghapus data');

// ---------------------------------------------------------------------------
// 5) Rekonsiliasi + daftar payroll yang perlu disusulkan
// ---------------------------------------------------------------------------
assert.match(mig, /create or replace function public\.legacy_import_summary\(\)/);
assert.match(mig, /create or replace function public\.legacy_missing_payroll\(\)/);
assert.match(mig, /not exists \(select 1 from public\.payroll_runs r where r\.bulan = a\.bulan\)/);
assert.match(mig, /notify pgrst, 'reload schema'/);

// ---------------------------------------------------------------------------
// 6) Alat impor: aman secara bawaan (dry-run) dan tidak menyimpan sandi di file
// ---------------------------------------------------------------------------
assert.match(alat, /const MODE_APPLY = process\.argv\.includes\('--apply'\);/);
assert.match(alat, /const BATCH = 200;/);
assert.match(alat, /const PASSWORD_AWAL = 'hosela';/);
assert.match(alat, /HUB_OWNER_NAMA/);
assert.doesNotMatch(alat, /password\s*=\s*'hosela';/, 'sandi tidak boleh di-hardcode sebagai kredensial login');
assert.match(alat, /const EPOCH_GOOGLE = Date\.UTC\(1899, 11, 30\);/);
assert.match(alat, /export function keTanggal/);
assert.match(alat, /export function keBulan/);
assert.match(alat, /export function keJam/);
assert.match(alat, /export function keWaktu/);
// Kolom wajib terisi: minggu dihitung dari tanggal, jam tidak boleh kosong
assert.match(alat, /export function mingguDariTanggal/);
assert.match(alat, /minggu: keTeks\(r\.Minggu\) \|\| mingguDariTanggal\(tanggal\)/);
assert.match(alat, /jam: keJam\(r\.Jam\) \|\| '00:00:00'/);

// Konversi koordinat kantor yang tersimpan tanpa desimal
assert.match(alat, /kunci === 'OFFICE_LAT' \|\| kunci === 'OFFICE_LNG'/);
assert.match(alat, /nilai = String\(n \/ 1e8\)/);

// Payroll: digabung per bulan + slip tanpa run disimpulkan dari tanggal rincian
assert.match(alat, /legacy_id: `RUN-\$\{sisa\.bulan\}`/);
assert.match(alat, /const PRIORITAS = \{ DRAFT: 1, CONFIRMED: 2, PUBLISHED: 3 \};/);
assert.match(alat, /const bulanTerbanyak = kunciSlip =>/);
assert.match(alat, /const bulanRunHilang = kunciRun =>/);

// Semua pengiriman lewat satu pintu (RPC import_legacy_rows)
assert.match(alat, /await rpc\('import_legacy_rows', \{ p_tabel: tabel, p_rows: potong, p_kunci: kunci \}\)/);
assert.match(alat, /await rpc\('hapus_data_uji_hub'\)/);
assert.match(alat, /await rpc\('legacy_import_summary'\)/);

// ---------------------------------------------------------------------------
// 7) Rencana migrasi memuat keputusan Ko 16 Nov 2026
// ---------------------------------------------------------------------------
assert.match(rencana, /Hosela Hub Lama/i);
assert.match(rencana, /legacy_id/);
assert.match(rencana, /OFFICE_LAT/);
assert.match(rencana, /payroll/i);

console.log('migrasi data lama (GAS/Sheets -> Supabase): ok');
