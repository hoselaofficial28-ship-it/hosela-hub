import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mig = readFileSync(new URL('../supabase/migrations/20261014000031_proses_absensi_lengkap.sql', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const mig028 = readFileSync(new URL('../supabase/migrations/20261014000028_privacy_hardening.sql', import.meta.url), 'utf8');
const log = readFileSync(new URL('../../docs/clone-supabase/DECISION-LOG.md', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Fungsi proses lengkap: rekap + SP, urutan benar, anti-dobel
// ---------------------------------------------------------------------------
assert.match(mig, /create or replace function public\.process_absensi_lengkap\(p_bulan_key text\)/);
assert.match(mig, /if not public\.is_payroll_admin\(\) then[\s\S]{0,120}raise exception 'Akses ditolak/);
assert.match(mig, /if auth\.uid\(\) is null then[\s\S]{0,80}raise exception 'Harus login'/);

// (a) reset rekap mingguan dulu — tanpa ini proses ulang menumpuk angka
const posReset = mig.indexOf('delete from public.attendance_weekly');
const posRekap = mig.indexOf('v_rekap := public.process_absensi_app_to_rekap');
const posHapusSp = mig.indexOf("delete from public.warning_history");
const posSp = mig.indexOf('v_sp := public.process_sp_for_month');
assert.ok(posReset > 0 && posRekap > 0 && posHapusSp > 0 && posSp > 0, 'urutan langkah tidak lengkap');
assert.ok(posReset < posRekap, 'reset rekap mingguan harus SEBELUM proses rekap');
assert.ok(posRekap < posSp, 'SP harus dihitung SETELAH rekap absensi');
assert.ok(posHapusSp < posSp, 'SP lama harus dibersihkan sebelum menghitung ulang');
assert.match(mig, /where public\._minggu_ke_bulan\(minggu\) = p_bulan_key/);
assert.match(mig, /where tipe = 'DENDA_SP' and to_char\(tanggal, 'YYYY-MM'\) = p_bulan_key/);

// (b) notifikasi hanya untuk SP baru (tidak spam saat tombol ditekan ulang)
assert.match(mig, /v_baru := not \(v_sebelum @> array\[/);
assert.match(mig, /if v_baru then\s*\n\s*insert into public\.notifications/);
assert.match(mig, /'⚠️ ' \|\| r\.tipe_sp \|\| ' Dikenakan'/);
assert.match(mig, /case when r\.tipe_sp = 'SP1' then 'PERINGATAN' else 'SP' \|\| right\(r\.tipe_sp, 1\) end/);

// (c) izin panggil: bukan anon/PUBLIC, dan terdaftar di migrasi privasi
assert.match(mig, /revoke execute on function public\.process_absensi_lengkap\(text\) from public, anon;/);
assert.match(mig, /grant execute on function public\.process_absensi_lengkap\(text\) to authenticated, service_role;/);
assert.ok(mig028.indexOf("'public.process_absensi_lengkap(text)'") !== -1, '028 belum memuat izin fungsi baru');

// ---------------------------------------------------------------------------
// 2) Aplikasi memakai fungsi baru & memberi tahu jumlah SP
// ---------------------------------------------------------------------------
assert.match(backend, /processAbsensiAppToRekap: async function \(args\) \{[\s\S]{0,600}?rpc\('process_absensi_lengkap'/);
assert.doesNotMatch(backend, /processAbsensiAppToRekap: async function \(args\) \{[\s\S]{0,600}?rpc\('process_absensi_app_to_rekap'/, 'masih memanggil rekap lama');
assert.match(app, /SEKALIGUS menghitung SP & denda SP/);
assert.match(app, /'Rekap diperbarui: '\+\(res\.rekapRows \|\| 0\)\+' minggu · SP dihitung: '\+\(res\.spEntries \|\| 0\)/);

// ---------------------------------------------------------------------------
// 3) Keputusan tercatat
// ---------------------------------------------------------------------------
assert.match(log, /SP bulanan tidak punya pemicu/);
assert.match(log, /Ko memilih \(14 Okt\): SP dihitung menyatu dengan tombol/);

console.log('proses absensi + SP satu tombol (anti-dobel, ada notifikasi): ok');
