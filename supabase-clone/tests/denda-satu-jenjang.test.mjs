import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mig = readFileSync(new URL('../supabase/migrations/20261014000037_denda_satu_jenjang.sql', import.meta.url), 'utf8');
const log = readFileSync(new URL('../../docs/clone-supabase/DECISION-LOG.md', import.meta.url), 'utf8');
const aturan = readFileSync(new URL('../../docs/clone-supabase/02-ATURAN-BISNIS.md', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Naik jenjang, bukan menumpuk: absen efektif 3-4 = SP2, >=5 = SP3 saja
// ---------------------------------------------------------------------------
assert.match(mig, /if v_absen_efektif >= 3 and v_absen_efektif < 5 then/);
assert.match(mig, /if v_absen_efektif >= 5 then/);
assert.match(mig, /perform public\._catat_denda_sp_detail\(r\.user_id, p_bulan_key, 'SP3', v_sp3_alasan, 100000\);/);

// Denda warisan aplikasi lama TIDAK boleh dipanggil lagi dari baris kode mana pun
// di 0037 (komentar yang menyebut nama fungsinya boleh, itu justru penanda sejarah).
assert.doesNotMatch(mig, /^\s*perform public\._tambah_denda_absen\(/m, 'denda warisan Rp50.000 masih dipanggil');
assert.match(mig, /-- CATATAN: dulu di sini ada perform public\._tambah_denda_absen/);

// Telat >=5 tetap seperti semula (SP2 Rp50.000)
assert.match(mig, /if r\.total_telat >= 5 then/);
assert.match(mig, /perform public\._catat_denda_sp_detail\(r\.user_id, p_bulan_key, 'SP2', v_alasan, 50000\);/);

// ---------------------------------------------------------------------------
// 2) Absen efektif tetap dipakai (izin/sakit disetujui tidak memicu denda)
// ---------------------------------------------------------------------------
assert.match(mig, /v_absen_efektif := greatest\(0, r\.total_absen_fisik - r\.total_izin\);/);
assert.match(mig, /lr\.status = 'DISETUJUI'/);
assert.match(mig, /if w\.telat >= 3 or w\.absen_efektif >= 2 then/);

// ---------------------------------------------------------------------------
// 3) Helper "yang terbesar menang" untuk denda SP vs SB
// ---------------------------------------------------------------------------
assert.match(mig, /create or replace function public\._terapkan_max_denda_sp_sb\(p_user_id uuid, p_bulan_key text\)/);
assert.match(mig, /and \(d\.keterangan like 'SP2%' or d\.keterangan like 'SP3%'\);/);
assert.match(mig, /and d\.keterangan like 'SB%';/);
assert.match(mig, /if v_sb > v_sp then/);
assert.match(mig, /return greatest\(v_sp, v_sb\);/);
assert.match(mig, /revoke execute on function public\._terapkan_max_denda_sp_sb\(uuid, text\) from public, anon, authenticated;/);

// ---------------------------------------------------------------------------
// 4) Sanksi Berulang: tidak menumpuk + bulan membaik membersihkan SB bulan itu
// ---------------------------------------------------------------------------
assert.match(mig, /perform public\._terapkan_max_denda_sp_sb\(r\.id, p_bulan_key\);/);
assert.doesNotMatch(mig, /\(d\.keterangan like 'SB%' or d\.keterangan like 'SP2%'\)/, 'SB masih menghapus baris denda SP2');
assert.match(mig, /update public\.sanksi_berulang set status = 'DIBATALKAN'\s*\n\s*where user_id = r\.id and bulan = p_bulan_key and status = 'AKTIF';/);
assert.match(mig, /if v_tingkat >= 2 then/);
assert.match(mig, /v_denda := 50000 \* v_tingkat;/);

// ---------------------------------------------------------------------------
// 5) Izin disetujui: hanya denda SP yang dibersihkan, denda SB tidak ikut hilang
// ---------------------------------------------------------------------------
assert.match(mig, /create or replace function public\._evaluasi_sp_setelah_izin\(p_user_id uuid, p_tanggal date\)/);
assert.doesNotMatch(mig, /perform public\._hapus_denda_sp\(/, 'denda SB ikut terhapus saat izin disetujui');
assert.match(mig, /and d\.keterangan like 'SP2%' and d\.keterangan like '%Absen%';/);
assert.match(mig, /perform public\._terapkan_max_denda_sp_sb\(p_user_id, v_bulan\);/);
assert.match(mig, /perform public\._update_bintang_dari_skor\(p_user_id, 2\);/);

// ---------------------------------------------------------------------------
// 6) Hak akses & dokumentasi
// ---------------------------------------------------------------------------
assert.match(mig, /if not public\.is_payroll_admin\(\) then\s*\n\s*raise exception 'Akses ditolak: hanya Owner\/Finance yang boleh memproses SP'/);
assert.match(mig, /security definer set search_path = public/);

assert.match(log, /Denda satu jenjang|satu jenjang/i);
assert.match(log, /denda warisan/i);
assert.match(aturan, /Satu jenjang, bukan menumpuk/i);
assert.match(aturan, /tidak menumpuk.*terbesar|terbesar.*antara denda SP/i);

console.log('denda satu jenjang (SP vs SB tidak menumpuk): ok');
