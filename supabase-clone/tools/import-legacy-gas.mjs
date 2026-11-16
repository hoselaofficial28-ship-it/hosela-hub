// ============================================================================
// Impor data Hosela Hub LAMA (Google Apps Script + Google Sheets)
// ke Hosela Hub BARU (Supabase).
//
// Sumber : Temp/hosela-hub-lama.json  (hasil `node Temp/ekspor-sheet-ke-json.mjs`)
// Alat DB: migrasi 050 (import_legacy_rows / hapus_data_uji_hub / legacy_import_summary)
//
// Pakai:
//   1) laporan saja (tidak menulis apa pun):
//        node supabase-clone/tools/import-legacy-gas.mjs --dry-run
//   2) impor sungguhan:
//        node supabase-clone/tools/import-legacy-gas.mjs --apply
//
// Login Owner lewat env (jangan disimpan di file):
//   HUB_OWNER_NAMA=... HUB_OWNER_SANDI=...
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUMBER = process.env.HUB_SUMBER || join(AKAR, 'Temp', 'hosela-hub-lama.json');
const MODE_APPLY = process.argv.includes('--apply');
const LEWATI_BERSIH = process.argv.includes('--skip-cleanup');
const LEWATI_AKUN = process.argv.includes('--skip-accounts');
const BATCH = 200;
const TZ = 7 * 60 * 60 * 1000; // Asia/Jakarta (tanpa DST)
const EPOCH_GOOGLE = Date.UTC(1899, 11, 30);
const PASSWORD_AWAL = 'hosela';
const EMAIL_OWNER = 'hoselaofficial28@gmail.com';

const NAMA_OWNER = process.env.HUB_OWNER_NAMA || process.env.TES_NAMA;
const SANDI_OWNER = process.env.HUB_OWNER_SANDI || process.env.TES_SANDI;

// ---------------------------------------------------------------------------
// Konfigurasi Supabase (dibaca dari app, tidak di-hardcode)
// ---------------------------------------------------------------------------
const klien = readFileSync(join(AKAR, 'supabase-clone', 'app', 'js', 'supabase-client.js'), 'utf8');
const URL_SB = /SUPABASE_URL\s*=\s*'([^']+)'/.exec(klien)[1];
const ANON = /SUPABASE_ANON_KEY\s*=\s*'([^']+)'/.exec(klien)[1];

// ---------------------------------------------------------------------------
// Bantuan konversi nilai Sheets
// ---------------------------------------------------------------------------
const kosong = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

function seriKeMs(v) {
  // v = jumlah hari sejak 1899-12-30 (boleh pecahan)
  return EPOCH_GOOGLE + Number(v) * 86400000;
}

export function keTanggal(v) {
  if (kosong(v)) return null;
  if (typeof v === 'number') return new Date(seriKeMs(Math.floor(v))).toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d+(\.\d+)?$/.test(s)) return new Date(seriKeMs(Math.floor(Number(s)))).toISOString().slice(0, 10);
  return null;
}

export function keBulan(v) {
  if (kosong(v)) return null;
  if (typeof v === 'number') return new Date(seriKeMs(Math.floor(v))).toISOString().slice(0, 7);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  if (/^\d+(\.\d+)?$/.test(s)) return new Date(seriKeMs(Math.floor(Number(s)))).toISOString().slice(0, 7);
  return null;
}

export function keJam(v) {
  if (kosong(v)) return null;
  if (typeof v === 'number') {
    const detik = Math.round((v % 1) * 86400);
    const j = Math.floor(detik / 3600) % 24;
    const m = Math.floor((detik % 3600) / 60);
    const s = detik % 60;
    return [j, m, s].map(x => String(x).padStart(2, '0')).join(':');
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}:${m[3] || '00'}`;
  if (/^\d+(\.\d+)?$/.test(s)) return keJam(Number(s));
  return null;
}

export function keWaktu(v) {
  if (kosong(v)) return null;
  if (typeof v === 'number') {
    const iso = new Date(seriKeMs(v) + TZ).toISOString().slice(0, 19);
    return iso + '+07:00';
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return keWaktu(Number(s));
  return null;
}

const keAngka = v => (kosong(v) ? 0 : Math.round(Number(v) || 0));const keAngkaAtauNull = v => (kosong(v) ? null : Math.round(Number(v) || 0));
const keBool = v => (kosong(v) ? false : /^(ya|true|1|y)$/i.test(String(v).trim()));
const keTeks = v => (kosong(v) ? null : String(v).trim());
const keTeksWajib = (v, bawaan = '-') => (kosong(v) ? bawaan : String(v).trim());

// Kode minggu ISO dari tanggal ('2026-03-02' -> '2026-W10').
export function mingguDariTanggal(tanggal) {
  if (!tanggal) return null;
  const d = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const hari = d.getUTCDay() || 7; // Senin=1 ... Minggu=7
  d.setUTCDate(d.getUTCDate() + 4 - hari); // Kamis pada minggu itu
  const awalTahun = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const minggu = Math.ceil(((d - awalTahun) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(minggu).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Baca JSON hasil ekspor
// ---------------------------------------------------------------------------
if (!existsSync(SUMBER)) {
  console.error(`GAGAL: sumber data tidak ada -> ${SUMBER}`);
  console.error('Jalankan dulu: node Temp/ekspor-sheet-ke-json.mjs');
  process.exit(1);
}
const BUKU = JSON.parse(readFileSync(SUMBER, 'utf8'));

function baris(sheet) {
  const rows = BUKU[sheet];
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const kepala = rows[0].map((h, i) => (kosong(h) ? `KOLOM_${i}` : String(h).trim()));
  const hasil = [];
  for (const r of rows.slice(1)) {
    if (!Array.isArray(r) || r.every(kosong)) continue;
    const o = {};
    kepala.forEach((k, i) => { o[k] = r[i] === undefined ? null : r[i]; });
    hasil.push(o);
  }
  return hasil;
}

// ---------------------------------------------------------------------------
// Modal ke Supabase: login Owner dulu (semua RPC hanya untuk Owner)
// ---------------------------------------------------------------------------
let HEADER = null;
let tokenOwner = null;

async function login() {
  if (!NAMA_OWNER || !SANDI_OWNER) {
    console.error('GAGAL: set env HUB_OWNER_NAMA dan HUB_OWNER_SANDI dulu.');
    process.exit(1);
  }
  const email = await (await fetch(`${URL_SB}/rest/v1/rpc/resolve_login_email`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_nama: NAMA_OWNER }),
  })).json();
  const tok = await (await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: SANDI_OWNER }),
  })).json();
  if (!tok.access_token) {
    console.error('GAGAL login Owner:', JSON.stringify(tok).slice(0, 300));
    process.exit(1);
  }
  tokenOwner = tok.access_token;
  HEADER = { apikey: ANON, Authorization: `Bearer ${tok.access_token}` };
}

async function rpc(nama, args = {}) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nama}`, {
    method: 'POST',
    headers: { ...HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const teks = await r.text();
  let isi;
  try { isi = JSON.parse(teks); } catch { isi = teks; }
  if (!r.ok) {
    const pesan = typeof isi === 'object' ? (isi.message || JSON.stringify(isi)) : String(isi);
    const galat = new Error(`${nama} gagal (HTTP ${r.status}): ${pesan}`);
    galat.detail = isi;
    throw galat;
  }
  return isi;
}

async function ambil(path) {
  const r = await fetch(`${URL_SB}/rest/v1/${path}`, { headers: HEADER });
  const teks = await r.text();
  if (!r.ok) throw new Error(`GET ${path} gagal (HTTP ${r.status}): ${teks.slice(0, 300)}`);
  return JSON.parse(teks);
}

async function panggilEdge(nama, body) {
  const r = await fetch(`${URL_SB}/functions/v1/${nama}`, {
    method: 'POST',
    headers: { ...HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const teks = await r.text();
  let isi;
  try { isi = JSON.parse(teks); } catch { isi = teks; }
  return { ok: r.ok, status: r.status, data: isi };
}

// ---------------------------------------------------------------------------
// Laporan
// ---------------------------------------------------------------------------
const laporan = { mode: MODE_APPLY ? 'apply' : 'dry-run', tabel: {}, catatan: [], galat: [], akun: [] };
const hitung = (tabel, jumlah) => { laporan.tabel[tabel] = (laporan.tabel[tabel] || 0) + jumlah; };

async function kirimKe(tabel, rows, kunci = 'legacy_id') {
  if (rows.length === 0) return;
  hitung(tabel, rows.length);
  if (!MODE_APPLY) return;
  for (let i = 0; i < rows.length; i += BATCH) {
    const potong = rows.slice(i, i + BATCH);
    try {
      await rpc('import_legacy_rows', { p_tabel: tabel, p_rows: potong, p_kunci: kunci });
    } catch (e) {
      laporan.galat.push(`${tabel} baris ${i}..${i + potong.length}: ${e.message}`);
      const contoh = potong[0];
      laporan.galat.push('contoh baris: ' + JSON.stringify(contoh).slice(0, 500));
      throw e;
    }
  }
  process.stdout.write(`  ${tabel}: ${rows.length} baris dikirim\n`);
}

// ---------------------------------------------------------------------------
// 1) Akun & peta karyawan
// ---------------------------------------------------------------------------
const GELAR_EMAIL = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

function daftarUser() {
  return baris('USERS').filter(u => !kosong(u.ID_User) && !kosong(u.Nama));
}

async function pastikanAkun(users) {
  const profil = await ambil('profiles?select=id,legacy_id,nama,email,bagian,status');
  const peta = { byLegacy: new Map(), byEmail: new Map(), byNama: new Map() };
  for (const p of profil) {
    if (p.legacy_id) peta.byLegacy.set(p.legacy_id, p);
    if (p.email) peta.byEmail.set(String(p.email).toLowerCase(), p);
    peta.byNama.set(String(p.nama).toLowerCase(), p);
  }

  const ownerLama = peta.byEmail.get(EMAIL_OWNER) || profil.find(p => p.bagian === 'Owner');

  for (const u of users) {
    const legacy = String(u.ID_User).trim();
    const nama = String(u.Nama).trim();
    const aktif = String(u.Status || '').toUpperCase() === 'AKTIF';
    const emailLama = keTeks(u.Email);

    // Owner lama dipetakan ke akun Owner yang sudah ada.
    if (String(u.Bagian || '') === 'Owner' && ownerLama) {
      laporan.akun.push({ legacy, nama, email: ownerLama.email, aksi: 'pakai akun Owner yang sudah ada', status: 'AKTIF' });
      peta.byLegacy.set(legacy, ownerLama);
      continue;
    }

    let email = emailLama ? emailLama.toLowerCase() : `${GELAR_EMAIL(nama)}@hoselaofficial.com`;
    let ada = peta.byEmail.get(email) || peta.byNama.get(nama.toLowerCase());

    if (!ada) {
      if (!MODE_APPLY || LEWATI_AKUN) {
        // Mode laporan: pakai id sementara supaya jumlah baris tetap bisa dihitung.
        const sementara = { id: `dry-${legacy}`, legacy_id: legacy, nama, email, bagian: u.Bagian, status: aktif ? 'AKTIF' : 'NONAKTIF' };
        peta.byLegacy.set(legacy, sementara);
        laporan.akun.push({ legacy, nama, email, aksi: MODE_APPLY ? 'dilewati (--skip-accounts)' : 'akan dibuat', status: aktif ? 'AKTIF' : 'NONAKTIF' });
        continue;
      }
      const hasil = await panggilEdge('add-karyawan', {
        nama,
        bagian: keTeksWajib(u.Bagian),
        jabatan: keTeksWajib(u.Jabatan),
        email,
      });
      if (!hasil.ok || hasil.data?.success === false) {
        const pesan = String(hasil.data?.msg || JSON.stringify(hasil.data) || '');
        if (/sudah terdaftar|already/i.test(pesan)) {
          const ulang = await ambil(`profiles?select=id,legacy_id,nama,email,bagian,status&email=eq.${encodeURIComponent(email)}`);
          ada = ulang[0];
        }
        if (!ada) {
          laporan.galat.push(`akun ${nama} (${email}) gagal dibuat: ${pesan}`);
          continue;
        }
      } else {
        const baru = await ambil(`profiles?select=id,legacy_id,nama,email,bagian,status&email=eq.${encodeURIComponent(email)}`);
        ada = baru[0];
      }
      if (!ada) {
        laporan.galat.push(`akun ${nama} (${email}) tidak ditemukan setelah dibuat`);
        continue;
      }
      peta.byEmail.set(email, ada);
      peta.byNama.set(nama.toLowerCase(), ada);
      laporan.akun.push({ legacy, nama, email, aksi: 'akun dibuat', status: aktif ? 'AKTIF' : 'NONAKTIF' });
    } else {
      laporan.akun.push({ legacy, nama, email, aksi: 'akun sudah ada', status: aktif ? 'AKTIF' : 'NONAKTIF' });
    }
    peta.byLegacy.set(legacy, ada);
  }

  return { peta, ownerLama };
}

// ---------------------------------------------------------------------------
// 2) Baris-baris yang akan diimpor
// ---------------------------------------------------------------------------
function barisProfil(users, peta) {
  const out = [];
  for (const u of users) {
    const legacy = String(u.ID_User).trim();
    const p = peta.byLegacy.get(legacy);
    if (!p) { laporan.galat.push(`profil ${legacy} (${u.Nama}) tidak punya akun login -> dilewati`); continue; }
    const status = String(u.Status || 'AKTIF').toUpperCase() === 'AKTIF' ? 'AKTIF' : 'NONAKTIF';
    out.push({
      id: p.id,
      legacy_id: legacy,
      nama: keTeksWajib(u.Nama),
      bagian: keTeksWajib(u.Bagian),
      jabatan: keTeksWajib(u.Jabatan),
      email: keTeks(u.Email) || p.email || null,
      status,
      bintang: Math.max(0, Math.min(5, keAngka(u.Bintang))),
      skor: Math.max(0, Math.min(100, keAngka(u.Skor))),
      skor_kpi: Math.max(0, Math.min(100, keAngka(u.SkorKPI))),
      gaji_bulanan: keAngka(u.Gaji_Bulanan),
      final_score: Math.max(0, Math.min(100, keAngka(u.FinalScore))),
      nonaktif_at: status === 'NONAKTIF' ? keWaktu(u.Tgl_Keluar) : null,
    });
  }
  return out;
}

function barisGaji(users, peta) {
  const kunci = new Map(); // userId|bulan -> baris
  const sumber = [
    ['SALARY_HISTORY', 'SALARY_HISTORY'],
    ['GAJI_HISTORY', 'GAJI_HISTORY'],
  ];
  for (const [sheet, label] of sumber) {
    for (const r of baris(sheet)) {
      const legacyUser = String(r.ID_User || r.userId || '').trim();
      const user = peta.byLegacy.get(legacyUser);
      if (!user) { laporan.galat.push(`gaji ${sheet}: user ${legacyUser} tidak dikenal`); continue; }
      const bulan = keBulan(r.Bulan_Berlaku ?? r.bulan);
      if (!bulan) { laporan.galat.push(`gaji ${sheet}: bulan tidak valid (${r.Bulan_Berlaku ?? r.bulan})`); continue; }
      const id = String(r.ID || r.id || `${label}-${legacyUser}-${bulan}`);
      const barisBaru = {
        legacy_id: id,
        user_id: user.id,
        bulan,
        gaji_bulanan: keAngka(r.Gaji_Bulanan ?? r.gajiBulanan),
        bonus_kerajinan: keAngka(r.bonusKerajinan),
        catatan: keTeks(r.Catatan ?? r.catatan),
        migrated_source: label,
        created_at: keWaktu(r.Dibuat_Pada ?? r.dibuatPada) || null,
      };
      const kk = `${user.id}|${bulan}`;
      const lama = kunci.get(kk);
      if (!lama) { kunci.set(kk, barisBaru); continue; }
      // Sumber yang punya bonus kerajinan (GAJI_HISTORY) diprioritaskan.
      if (barisBaru.bonus_kerajinan > 0 || !lama.bonus_kerajinan) kunci.set(kk, barisBaru);
    }
  }
  return [...kunci.values()];
}

function petaUserAbaikanYangTidakDikenal(laporanBaris, asal) {
  return laporanBaris.filter(r => {
    if (!r.user_id) { laporan.galat.push(`${asal}: ada baris tanpa user_id`); return false; }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Langkah migrasi
// ---------------------------------------------------------------------------
const WAKTU_MULAI = Date.now();

async function main() {
  await login();

  const users = daftarUser();
  const { peta, ownerLama } = await pastikanAkun(users);

  process.stdout.write(`\n=== Mode: ${MODE_APPLY ? 'IMPOR SUNGGUHAN' : 'LAPORAN SAJA (tidak menulis)'} ===\n`);
  process.stdout.write(`Karyawan di sheet: ${users.length} | akun siap: ${peta.byLegacy.size}\n`);

  if (MODE_APPLY && !LEWATI_BERSIH) {
    const bersih = await rpc('hapus_data_uji_hub');
    process.stdout.write(`Bersih-bersih data uji: ${JSON.stringify(bersih.dihapus)}\n`);
    laporan.catatan.push('data uji dibersihkan: ' + JSON.stringify(bersih.dihapus));
  }

  // --- master data ---
  process.stdout.write('\nMaster data...\n');
  await kirimKe('kpi_templates', baris('KPI_TEMPLATE').map(r => ({
    legacy_id: String(r.ID_KPI), jabatan: keTeksWajib(r.Posisi), no_urut: keAngka(r.No),
    indikator: keTeksWajib(r.Indikator), keterangan: keTeks(r.Keterangan),
  })));

  await kirimKe('jobdesks', baris('JOBDESK').map(r => ({
    legacy_id: String(r.ID_Jobdesk), bagian: keTeksWajib(r.Bagian), jabatan: keTeksWajib(r.Jabatan),
    link: keTeks(r.Link_Doc), created_at: keWaktu(r.Terakhir_Update) || null,
  })));

  await kirimKe('rules', baris('PERATURAN').map(r => ({
    legacy_id: `RULE-${keAngka(r.No)}`, no_urut: keAngka(r.No),
    kategori: keTeksWajib(r.Kategori), isi: keTeksWajib(r.Isi_Peraturan),
  })));

  await kirimKe('holidays', baris('KALENDER_LIBUR').map(r => {
    const tanggal = keTanggal(r.Tanggal);
    return {
      legacy_id: `${String(r.ID_Libur)}@${tanggal}`,
      tanggal, nama: keTeksWajib(r.Nama_Libur),
      difasilitasi: keBool(r.Difasilitasi), created_at: keWaktu(r.Tgl_Input) || null,
    };
  }).filter(r => r.tanggal));

  await kirimKe('announcements', baris('PENGUMUMAN').map(r => ({
    legacy_id: String(r.ID_Pengumuman), judul: keTeksWajib(r.Judul), isi: keTeksWajib(r.Isi),
    kategori: keTeksWajib(r.Kategori, 'INFO'), target_bagian: keTeksWajib(r.Target_Bagian, 'ALL'),
    status: keTeksWajib(r.Status, 'AKTIF'), created_at: keWaktu(r.Tgl_Dibuat) || null,
  })));

  await kirimKe('work_schedules', baris('JADWAL_KHUSUS').map((r, i) => ({
    legacy_id: `JADWAL-${i + 1}`, urutan: i + 1,
    dari: keTanggal(r.Dari_Tgl), sampai: keTanggal(r.Sampai_Tgl),
    jam_masuk: keJam(r.Jam_Masuk), jam_pulang: keJam(r.Jam_Pulang),
  })).filter(r => r.dari && r.sampai));

  // PENGATURAN: koordinat disimpan tanpa desimal (x100.000.000) -> dibagi lagi.
  const pengaturan = [];
  for (const r of baris('PENGATURAN')) {
    const kunci = keTeks(r.Kunci);
    if (!kunci) continue;
    let nilai = String(r.Nilai ?? '').trim();
    if (kunci === 'OFFICE_LAT' || kunci === 'OFFICE_LNG') {
      const n = Number(nilai);
      if (Number.isFinite(n) && Math.abs(n) > 1000) nilai = String(n / 1e8);
    }
    pengaturan.push({ key: kunci, value: nilai });
  }
  await kirimKe('app_settings', pengaturan, 'key');

  // --- profil karyawan ---
  process.stdout.write('\nKaryawan...\n');
  await kirimKe('profiles', barisProfil(users, peta), 'id');

  // --- gaji (salary_settings) ---
  process.stdout.write('\nRiwayat gaji...\n');
  await kirimKe('salary_settings', barisGaji(users, peta));

  // --- absensi ---
  process.stdout.write('\nAbsensi...\n');
  await kirimKe('attendance_legacy_raw', baris('ABSENSI_RAW').map(r => ({
    legacy_id: String(r.ID_Raw), nama_text: keTeksWajib(r.Nama_Fingerprint),
    tanggal: keTanggal(r.Tanggal), jam_masuk: keJam(r.Jam_Masuk), jam_pulang: keJam(r.Jam_Keluar),
    minggu: keTeks(r.Minggu_Upload), uploaded_at: keWaktu(r.Tgl_Upload) || null,
  })).filter(r => r.tanggal));

  const events = [];
  for (const r of baris('ABSENSI_APP')) {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`absensi ${r.ID}: user ${r.ID_User} tidak dikenal`); continue; }
    const tanggal = keTanggal(r.Tanggal);
    if (!tanggal) { laporan.galat.push(`absensi ${r.ID}: tanggal tidak valid (${r.Tanggal})`); continue; }
    events.push({
      legacy_id: String(r.ID), user_id: user.id, tanggal, jam: keJam(r.Jam) || '00:00:00',
      tipe: keTeksWajib(r.Tipe, 'MASUK'), latitude: r.Latitude ?? null, longitude: r.Longitude ?? null,
      akurasi_meter: keAngkaAtauNull(r.Akurasi_Meter), jarak_kantor_meter: keAngkaAtauNull(r.Jarak_Kantor_Meter),
      status: keTeksWajib(r.Status, 'DITERIMA'), source: 'LEGACY_GAS',
      drive_web_view_url: keTeks(r.Foto_URL), upload_status: 'OK',
      catatan: keTeks(r.Catatan), created_at: keWaktu(r.Created_At) || null,
    });
  }
  await kirimKe('attendance_events', events);

  const details = [];
  for (const r of baris('ABSENSI_DETAIL')) {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`detail ${r.ID_Detail}: user ${r.ID_User} tidak dikenal`); continue; }
    const tanggal = keTanggal(r.Tanggal);
    if (!tanggal) { laporan.galat.push(`detail ${r.ID_Detail}: tanggal tidak valid (${r.Tanggal})`); continue; }
    details.push({
      legacy_id: String(r.ID_Detail), user_id: user.id, minggu: keTeks(r.Minggu) || mingguDariTanggal(tanggal), tanggal,
      tipe: keTeksWajib(r.Tipe), keterangan: keTeks(r.Keterangan), nilai: keAngka(r.Nilai),
      is_generated: true,
    });
  }
  await kirimKe('attendance_details', details);

  await kirimKe('attendance_weekly', baris('ABSENSI_REKAP').map(r => {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`rekap ${r.KOLOM_0}: user ${r.ID_User} tidak dikenal`); return null; }
    return {
      legacy_id: String(r.KOLOM_0), user_id: user.id, minggu: keTeksWajib(r.Minggu),
      hadir: keAngka(r.Total_Hadir), telat: keAngka(r.Total_Telat), absen: keAngka(r.Total_Absen),
      lembur_minggu: keAngka(r.Total_Lembur_Minggu), lembur_libur: keAngka(r.Total_Lembur_Libur),
      status: keTeksWajib(r.Status_Peringatan, 'BAIK'), total_denda: 0,
    };
  }).filter(Boolean));

  await kirimKe('attendance_anomalies', baris('ANOMALI').map(r => {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`anomali ${r.ID_Anomali}: user ${r.ID_User} tidak dikenal`); return null; }
    return {
      legacy_id: String(r.ID_Anomali), user_id: user.id, tanggal: keTanggal(r.Tanggal), jam: keJam(r.Jam),
      tipe: keTeksWajib(r.Tipe), status: keTeksWajib(r.Status), created_at: keWaktu(r.Tgl_Upload) || null,
      deadline: keWaktu(r.Tgl_Deadline) || null,
    };
  }).filter(r => r && r.tanggal));

  // --- izin, SP, review telat, notifikasi ---
  process.stdout.write('\nIzin, SP, notifikasi...\n');
  await kirimKe('warning_history', baris('SP_HISTORY').map(r => {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`SP ${r.ID_SP}: user ${r.ID_User} tidak dikenal`); return null; }
    return {
      legacy_id: String(r.ID_SP), user_id: user.id, bulan: keBulan(r.Bulan),
      tipe_sp: keTeksWajib(r.Tipe_SP), alasan: keTeks(r.Alasan), created_at: keWaktu(r.Tgl_Dibuat) || null,
    };
  }).filter(r => r && r.bulan));

  await kirimKe('leave_requests', baris('IZIN').map(r => {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`izin ${r.ID_Izin}: user ${r.ID_User} tidak dikenal`); return null; }
    return {
      legacy_id: String(r.ID_Izin), user_id: user.id, tanggal: keTanggal(r.Tanggal),
      jenis: keTeksWajib(r.Jenis, 'IZIN'), keterangan: keTeks(r.Keterangan),
      status: keTeksWajib(r.Status, 'MENUNGGU'), submitted_at: keWaktu(r.Tgl_Submit) || null,
    };
  }).filter(r => r && r.tanggal));

  await kirimKe('late_reviews', baris('IZIN_TELAT').map(r => {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`review telat ${r.ID}: user ${r.ID_User} tidak dikenal`); return null; }
    return {
      legacy_id: String(r.ID), user_id: user.id, tanggal: keTanggal(r.Tanggal),
      status_review: keTeksWajib(r.Status_Review, 'MENUNGGU'),
      durasi_izin_jam: r.Durasi_Izin_Jam === null || r.Durasi_Izin_Jam === undefined ? null : Number(r.Durasi_Izin_Jam),
      alasan: keTeks(r.Alasan), catatan: keTeks(r.Catatan),
      denda_normal: keAngkaAtauNull(r.Denda_Normal), tarif_per_jam: keAngkaAtauNull(r.Tarif_Per_Jam),
      potongan_final: keAngkaAtauNull(r.Potongan_Final),
      reviewed_by_name: keTeks(r.Diputuskan_Oleh), reviewed_at: keWaktu(r.Diputuskan_Pada) || null,
    };
  }).filter(r => r && r.tanggal));

  await kirimKe('notifications', baris('NOTIFIKASI').map(r => {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`notif ${r.ID_Notif}: user ${r.ID_User} tidak dikenal`); return null; }
    return {
      legacy_id: String(r.ID_Notif), user_id: user.id, judul: keTeksWajib(r.Judul), isi: keTeksWajib(r.Isi),
      tipe: keTeksWajib(r.Tipe, 'INFO'), status: keTeksWajib(r.Status, 'BELUM'),
      menu: keTeks(r.KOLOM_7) || 's-notifikasi', created_at: keWaktu(r.Tgl_Dibuat) || null,
    };
  }).filter(Boolean));

  // --- payroll: gabungkan run per bulan, lalu detail + item ---
  // Catatan data lama:
  //   * 24 PAYROLL_RUN hanya mewakili 4 bulan -> digabung jadi 1 run per bulan.
  //   * 25 slip merujuk run yang sudah tidak ada di sheet (total Rp 76.559.444);
  //     bulannya disimpulkan dari tanggal rincian slip (PAYROLL_ITEM), lalu dibuat
  //     run susulan untuk bulan tersebut. Semua kasus dicatat di laporan.
  process.stdout.write('\nPayroll historis...\n');
  const runLama = baris('PAYROLL_RUN');
  const detailLama = baris('PAYROLL_DETAIL');
  const itemLama = baris('PAYROLL_ITEM');
  const PRIORITAS = { DRAFT: 1, CONFIRMED: 2, PUBLISHED: 3 };
  const bulanPerRun = new Map();
  const runBulan = new Map(); // bulan -> { status tertinggi, periode, tanggal }

  for (const r of runLama) {
    const bulan = keBulan(r.bulan);
    if (!bulan) { laporan.galat.push(`payroll run ${r.id}: bulan tidak valid (${r.bulan})`); continue; }
    bulanPerRun.set(String(r.id), bulan);
    const status = String(r.status || 'DRAFT').toUpperCase();
    const prioritas = PRIORITAS[status] || 0;
    const ada = runBulan.get(bulan);
    if (!ada) {
      runBulan.set(bulan, {
        bulan, status, prioritas,
        periode_mulai: keTanggal(r.periodeMulai), periode_akhir: keTanggal(r.periodeAkhir),
        dibuat_pada: keWaktu(r.dibuatPada) || null, dipublish_pada: keWaktu(r.dipublishPada) || null,
      });
    } else if (prioritas > ada.prioritas) {
      ada.status = status;
      ada.prioritas = prioritas;
      ada.dipublish_pada = keWaktu(r.dipublishPada) || ada.dipublish_pada;
    }
  }

  // Bulan cadangan untuk slip yang run-nya hilang: ambil bulan terbanyak dari rincian slip.
  const bulanPerSlip = new Map();
  for (const it of itemLama) {
    const t = keTanggal(it.tanggal);
    if (!t) continue;
    const kunciSlip = String(it.payrollDetailId);
    if (!bulanPerSlip.has(kunciSlip)) bulanPerSlip.set(kunciSlip, new Map());
    const petaBulan = bulanPerSlip.get(kunciSlip);
    const b = t.slice(0, 7);
    petaBulan.set(b, (petaBulan.get(b) || 0) + 1);
  }
  const bulanTerbanyak = kunciSlip => {
    const petaBulan = bulanPerSlip.get(kunciSlip);
    if (!petaBulan) return null;
    return [...petaBulan.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  // Bulan per run yang hilang (dipakai kalau ada slip tanpa tanggal rincian sama sekali):
  // diambil dari bulan terbanyak slip-slip lain yang memakai run yang sama.
  const bulanPerRunHilang = new Map();
  for (const r of detailLama) {
    const bulanRun = bulanPerRun.get(String(r.payrollRunId));
    if (bulanRun) continue;
    const bulanSlip = bulanTerbanyak(String(r.id));
    if (!bulanSlip) continue;
    const kunci = String(r.payrollRunId);
    if (!bulanPerRunHilang.has(kunci)) bulanPerRunHilang.set(kunci, new Map());
    const petaBulan = bulanPerRunHilang.get(kunci);
    petaBulan.set(bulanSlip, (petaBulan.get(bulanSlip) || 0) + 1);
  }
  const bulanRunHilang = kunciRun => {
    const petaBulan = bulanPerRunHilang.get(kunciRun);
    if (!petaBulan) return null;
    return [...petaBulan.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  const detailsSlip = [];
  const slipRunHilang = [];
  for (const r of detailLama) {
    const user = peta.byLegacy.get(String(r.userId || '').trim());
    if (!user) { laporan.galat.push(`slip ${r.id}: user ${r.userId} tidak dikenal`); continue; }

    let bulan = bulanPerRun.get(String(r.payrollRunId)) || null;
    if (!bulan) {
      bulan = bulanTerbanyak(String(r.id)) || bulanRunHilang(String(r.payrollRunId));
      if (!bulan) { laporan.galat.push(`slip ${r.id}: bulan tidak bisa ditentukan (run ${r.payrollRunId} hilang)`); continue; }
      slipRunHilang.push({ slip: String(r.id), run: String(r.payrollRunId), bulan, total: keAngka(r.totalGaji) });
    }

    const statusSlip = String(r.statusSlip || 'DRAFT').toUpperCase();
    const prioritasSlip = PRIORITAS[statusSlip] || 0;
    const runAda = runBulan.get(bulan);
    if (!runAda) {
      runBulan.set(bulan, {
        bulan, status: statusSlip, prioritas: prioritasSlip,
        periode_mulai: `${bulan}-01`, periode_akhir: null,
        dibuat_pada: null, dipublish_pada: null,
      });
    } else if (prioritasSlip > runAda.prioritas) {
      runAda.status = statusSlip;
      runAda.prioritas = prioritasSlip;
    }

    detailsSlip.push({
      legacy_id: String(r.id), _bulan: bulan, user_id: user.id, nama: keTeksWajib(r.nama),
      gaji_pokok: keAngka(r.gajiPokok), hari_kerja: keAngka(r.hariKerja), hadir: keAngka(r.hadir),
      absen: keAngka(r.absen), telat: keAngka(r.telat), lembur_pulang: keAngka(r.lemburPulang),
      lembur_minggu: keAngka(r.lemburMinggu), lembur_libur: keAngka(r.lemburLibur),
      total_reward: keAngka(r.totalReward), total_denda: keAngka(r.totalDenda),
      bonus_kerajinan: keAngka(r.bonusKerajinan), adjustment_plus: keAngka(r.adjustmentPlus),
      adjustment_minus: keAngka(r.adjustmentMinus), catatan_adjustment: keTeks(r.catatanAdjustment),
      total_gaji: keAngka(r.totalGaji), status_slip: statusSlip,
    });
  }

  if (slipRunHilang.length) {
    const total = slipRunHilang.reduce((a, s) => a + s.total, 0);
    laporan.catatan.push(
      `${slipRunHilang.length} slip menunjuk payroll run yang sudah tidak ada di sheet; ` +
      `bulannya disimpulkan dari tanggal rincian (total Rp ${total.toLocaleString('id-ID')}). ` +
      `Rincian: ` + JSON.stringify(slipRunHilang)
    );
    process.stdout.write(`  ${slipRunHilang.length} slip tanpa run -> bulan disimpulkan dari rincian (Rp ${total.toLocaleString('id-ID')})\n`);
  }

  const runs = [...runBulan.values()]
    .sort((a, b) => a.bulan.localeCompare(b.bulan))
    .map(({ prioritas, ...sisa }) => ({ legacy_id: `RUN-${sisa.bulan}`, ...sisa }));
  await kirimKe('payroll_runs', runs);

  const petaRun = new Map();
  if (MODE_APPLY) {
    for (const r of await ambil('payroll_runs?select=id,legacy_id')) petaRun.set(r.legacy_id, r.id);
  } else {
    for (const r of runs) petaRun.set(r.legacy_id, `dry-${r.bulan}`);
  }

  for (const d of detailsSlip) {
    d.payroll_run_id = petaRun.get(`RUN-${d._bulan}`);
    delete d._bulan;
  }
  await kirimKe('payroll_details', detailsSlip);

  const petaDetail = new Map();
  if (MODE_APPLY) {
    for (const r of await ambil('payroll_details?select=id,legacy_id')) petaDetail.set(r.legacy_id, r.id);
  } else {
    for (const d of detailsSlip) petaDetail.set(d.legacy_id, `dry-${d.legacy_id}`);
  }

  await kirimKe('payroll_items', itemLama.map(r => {
    const detailId = petaDetail.get(String(r.payrollDetailId));
    if (!detailId) { laporan.galat.push(`item ${r.id}: slip ${r.payrollDetailId} tidak ditemukan`); return null; }
    return {
      legacy_id: String(r.id), payroll_detail_id: detailId, tipe: keTeksWajib(r.tipe),
      tanggal: keTanggal(r.tanggal), keterangan: keTeks(r.keterangan), nominal: keAngka(r.nominal),
    };
  }).filter(Boolean));

  // --- KPI & audit ---
  process.stdout.write('\nKPI & audit...\n');
  const petaKpi = new Map();
  for (const r of await ambil('kpi_templates?select=id,legacy_id')) petaKpi.set(r.legacy_id, r.id);

  await kirimKe('kpi_reports', baris('KPI_LAPORAN').map(r => {
    const user = peta.byLegacy.get(String(r.ID_User || '').trim());
    if (!user) { laporan.galat.push(`KPI ${r.ID_Laporan}: user ${r.ID_User} tidak dikenal`); return null; }
    return {
      legacy_id: String(r.ID_Laporan), user_id: user.id, minggu: keTeksWajib(r.Minggu),
      kpi_template_id: petaKpi.get(String(r.ID_KPI || '')) || null,
      indikator: keTeksWajib(r.Indikator), selesai: keBool(r.Selesai),
      catatan: keTeks(r.Catatan), submitted_at: keWaktu(r.Tgl_Submit) || null,
    };
  }).filter(Boolean));

  const petaNama = new Map();
  for (const [legacy, p] of peta.byLegacy) petaNama.set(p.id, p);
  const namaKeId = new Map([...peta.byLegacy.entries()].map(([legacy, p]) => [String(users.find(u => String(u.ID_User) === legacy)?.Nama || '').toLowerCase(), p.id]));
  if (ownerLama) namaKeId.set('sanjaya', ownerLama.id);

  await kirimKe('audit_logs', baris('AUDIT_LOG').map(r => ({
    legacy_id: String(r.ID), waktu: keWaktu(r.Waktu) || null,
    actor: namaKeId.get(String(r.Actor || '').toLowerCase()) || null,
    action: keTeksWajib(r.Action), target: keTeks(r.Target), catatan: keTeks(r.Catatan),
  })));

  // --- rekonsiliasi ---
  process.stdout.write('\n=== Rekonsiliasi ===\n');
  if (MODE_APPLY) {
    const ringkas = await rpc('legacy_import_summary');
    laporan.ringkas = ringkas;
    for (const r of ringkas) {
      process.stdout.write(`  ${String(r.tabel).padEnd(24)} ${String(r.jumlah).padStart(6)} baris (${r.dengan_legacy} ber-legacy_id)\n`);
    }
    const kurang = await rpc('legacy_missing_payroll');
    laporan.bulanTanpaPayroll = kurang;
    if (kurang.length) {
      process.stdout.write('\n  Bulan yang payroll-nya perlu disusulkan: ' + kurang.map(k => `${k.bulan} (${k.baris_absensi} baris absensi)`).join(', ') + '\n');
    }
  } else {
    for (const [t, n] of Object.entries(laporan.tabel).sort()) {
      process.stdout.write(`  ${t.padEnd(24)} ${String(n).padStart(6)} baris akan diimpor\n`);
    }
  }

  laporan.durasiDetik = Math.round((Date.now() - WAKTU_MULAI) / 1000);
  const keluar = join(AKAR, 'Temp', MODE_APPLY ? 'laporan-impor.json' : 'laporan-impor-dryrun.json');
  writeFileSync(keluar, JSON.stringify(laporan, null, 2), 'utf8');

  process.stdout.write(`\nLaporan: ${keluar}\n`);
  if (laporan.galat.length) {
    process.stdout.write(`\n${laporan.galat.length} catatan/galat (10 pertama):\n`);
    for (const g of laporan.galat.slice(0, 10)) process.stdout.write('  - ' + g + '\n');
    process.exitCode = MODE_APPLY ? 1 : 0;
  } else {
    process.stdout.write('\nTidak ada galat.\n');
  }
}

main().catch(e => {
  console.error('\nGAGAL: ' + e.message);
  if (e.detail) console.error('Detail: ' + JSON.stringify(e.detail).slice(0, 800));
  process.exit(1);
});
