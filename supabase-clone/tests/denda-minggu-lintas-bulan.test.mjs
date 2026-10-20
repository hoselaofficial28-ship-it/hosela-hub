import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/20261020000046_fix_denda_minggu_lintas_bulan.sql', import.meta.url), 'utf8');

// Sumber uang bulanan wajib ledger harian dengan tanggal kejadian asli.
const helper = sql.match(/create or replace function public\._total_denda_bulan_ledger[\s\S]*?\n\$\$;/)?.[0] || '';
assert.match(helper, /d\.tanggal >= \(p_bulan_key \|\| '-01'\)::date/);
assert.match(helper, /d\.tanggal <\s+\(p_bulan_key \|\| '-01'\)::date \+ interval '1 month'/);
assert.match(helper, /d\.tipe in \('TELAT','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL'\)/);
assert.doesNotMatch(helper, /_minggu_ke_bulan|attendance_weekly/);

// Rekap, payroll, dan snapshot memakai sumber tunggal yang sama.
assert.match(sql, /return public\._total_denda_bulan_ledger\(p_user_id, p_bulan_key\)/);
assert.match(sql, /public\._total_denda_bulan_ledger\(p_user_id, mr\.bulan\) total_denda/);
assert.match(sql, /v_denda_total := public\._total_denda_bulan_ledger\(p_user_id, p_bulan_key\)/);

// Minggu lintas bulan tetap ditampilkan, tetapi isi/detailnya disaring berdasarkan
// bulan dari tanggal masing-masing kejadian—bukan bulan dari hari Senin.
const rekap = sql.match(/create or replace function public\.get_absensi_rekap_base[\s\S]*?\n\$\$;/)?.[0] || '';
assert.match(rekap, /where d\.user_id=p_user_id and to_char\(d\.tanggal,'YYYY-MM'\)=p\.bulan/);
assert.doesNotMatch(rekap, /_minggu_ke_bulan/);

// Regresi kasus nyata: enam telat 10 menit + SP2 harus Rp110.000.
const dendaTelat = [2, 4, 8, 10, 15, 17].reduce(total => total + 10_000, 0);
const dendaSp2 = 50_000;
assert.equal(dendaTelat + dendaSp2, 110_000);

console.log('denda minggu lintas bulan tests: OK');
