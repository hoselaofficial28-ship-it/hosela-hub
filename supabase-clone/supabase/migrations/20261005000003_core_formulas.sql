-- ============================================================================
-- Hosela Hub — Supabase Clone — Fungsi Rumus Inti (PURE, bisa dites langsung)
-- ============================================================================
-- Fungsi di bawah ini TIDAK menyentuh tabel sama sekali — murni input→output,
-- sesuai mandat CLAUDE.md "port logika bisnis jadi fungsi murni yang bisa
-- diuji". Setiap rumus bersitasi ke docs/clone-supabase/07-DATA-DICTIONARY.md
-- dan baris asli gas/Code.gs hasil audit.
--
-- Fungsi yang MENULIS ke tabel (proses absensi, SP, payroll draft/confirm/
-- publish — termasuk replikasi sengaja bug SP2 dobel sesuai keputusan Ko)
-- menyusul di migration terpisah (orkestrasi), supaya fungsi rumus di sini
-- tetap murni dan gampang dites.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Denda telat = ceil(menitTelat/10) x Rp10.000
-- Sitasi: gas/Code.gs:1273,3391,3138 (identik di 3 jalur lama)
-- ---------------------------------------------------------------------------
create or replace function public.calc_denda_telat(menit_telat integer)
returns integer
language sql immutable as $$
  select case when menit_telat <= 0 then 0
    else ceil(menit_telat::numeric / 10) * 10000 end::integer;
$$;

-- ---------------------------------------------------------------------------
-- Lembur pulang: mulai dihitung setelah >=60 menit dari jam pulang wajib,
-- dibulatkan TURUN ke kelipatan 30 menit, reward = jumlah blok 30 menit x Rp10rb.
-- Sitasi: gas/Code.gs:1285-1297,3397-3409,3141-3152
-- Edge case (dari audit): 59 menit = Rp0 (bukan dibulatkan ke blok terdekat);
-- lompatan dari 0 ke 1 blok PERSIS di menit ke-60, bukan di menit ke-30.
-- ---------------------------------------------------------------------------
create or replace function public.calc_lembur_pulang(menit_selisih integer)
returns table(lembur_menit integer, reward integer)
language sql immutable as $$
  select
    case when menit_selisih >= 60 then floor(menit_selisih::numeric / 30) * 30 else 0 end::integer as lembur_menit,
    case when menit_selisih >= 60 then floor(menit_selisih::numeric / 30) * 10000 else 0 end::integer as reward;
$$;

-- ---------------------------------------------------------------------------
-- Gaji harian = gajiBulanan / hariKerjaEfektif (dibulatkan). Dipakai sbg
-- reward kerja Minggu/libur (satu gaji harian penuh, bukan pro-rata jam).
-- Sitasi: gas/Code.gs:1233,3354,3119 (pakai Math.max(1,...) jalur kamera/manual
-- supaya tidak pernah bagi nol — jalur upload lama fallback ke 0, TIDAK diikuti
-- di sini, kita pakai perilaku jalur kamera/manual yg aktif sekarang).
-- ---------------------------------------------------------------------------
create or replace function public.calc_gaji_harian(gaji_bulanan integer, hari_kerja_efektif integer)
returns integer
language sql immutable as $$
  select round(gaji_bulanan::numeric / greatest(1, hari_kerja_efektif))::integer;
$$;

-- ---------------------------------------------------------------------------
-- Status mingguan dari (absen+telat). Sitasi: gas/Code.gs:1317-1321,3427-3428
-- (ini rumus yg DISIMPAN ke kolom status attendance_weekly — jadi acuan
-- tunggal/kanonis). CATATAN AUDIT: getAllAbsensiRekap lama (gas/Code.gs:
-- 2141-2143) pakai rumus KEDUA yg beda (OR per-metrik, tanpa ORANGE) utk
-- layar "rekap semua karyawan" — ini INKONSISTENSI di app lama, bukan
-- fitur. Clone pakai SATU rumus ini saja utk semua layar (perlu persetujuan
-- Ko kalau nanti terlihat beda dari tampilan lama di layar rekap-semua).
-- ---------------------------------------------------------------------------
create or replace function public.calc_status_mingguan(absen integer, telat integer)
returns text
language sql immutable as $$
  select case
    when (coalesce(absen,0) + coalesce(telat,0)) >= 5 then 'MERAH'
    when (coalesce(absen,0) + coalesce(telat,0)) >= 3 then 'ORANGE'
    when (coalesce(absen,0) + coalesce(telat,0)) >= 1 then 'KUNING'
    else 'BAIK'
  end;
$$;

-- ---------------------------------------------------------------------------
-- hitungBintang() — skor & bintang. Sitasi: gas/Code.gs:754-913 (lengkap di
-- 07-DATA-DICTIONARY.md §3, fungsi hitungBintang).
-- ---------------------------------------------------------------------------

-- absenMurni = absenFisik - sakit - izin (dipakai KHUSUS utk skor/bintang —
-- JANGAN dipakai utk syarat bonus kerajinan, itu pakai absen FISIK, lihat
-- calc_payroll_total di bawah).
create or replace function public.calc_absen_murni(absen_fisik integer, total_sakit integer, total_izin integer)
returns integer
language sql immutable as $$
  select greatest(0, coalesce(absen_fisik,0) - coalesce(total_sakit,0) - coalesce(total_izin,0));
$$;

create or replace function public.calc_skor_attendance(
  absen_murni integer, total_izin integer, total_sakit integer, total_telat integer, total_lembur integer
) returns integer
language sql immutable as $$
  select greatest(0, least(100,
    100
    - (coalesce(absen_murni,0) * 12)
    - (coalesce(total_izin,0)  * 4)
    - (coalesce(total_sakit,0) * 2)
    - (coalesce(total_telat,0) * 3)
    + least(10, coalesce(total_lembur,0) * 3)
  ));
$$;

create or replace function public.calc_skor_akhir(pct_kpi integer, skor_attendance integer)
returns integer
language sql immutable as $$
  select greatest(0, least(100, round((coalesce(pct_kpi,0) + coalesce(skor_attendance,0)) / 2.0)::integer));
$$;

-- Bintang dasar dari skor, lalu di-gate oleh absenMurni.
-- Gate: absenMurni>=3 -> maks 2 bintang; absenMurni>=2 -> maks 3 bintang.
-- KEPUTUSAN KO (DECISION-LOG 2026-10-05): TIDAK ada gate tambahan dari SP,
-- walau teks notifikasi SP2/SP3 lama menjanjikan itu — jangan tambah syarat
-- SP di sini.
create or replace function public.calc_bintang(skor_akhir integer, absen_murni integer)
returns integer
language sql immutable as $$
  select least(
    case
      when skor_akhir >= 85 then 5
      when skor_akhir >= 75 then 4
      when skor_akhir >= 65 then 3
      when skor_akhir >= 50 then 2
      else 1
    end,
    case
      when coalesce(absen_murni,0) >= 3 then 2
      when coalesce(absen_murni,0) >= 2 then 3
      else 5
    end
  );
$$;

-- finalScore (dipakai KHUSUS urutan papan peringkat, BEDA dari skor yg
-- tampil di profil karyawan).
create or replace function public.calc_final_score_ranking(skor_akhir integer, absen_murni integer)
returns integer
language sql immutable as $$
  select greatest(0, coalesce(skor_akhir,0) - (coalesce(absen_murni,0) * 5));
$$;

-- ---------------------------------------------------------------------------
-- Payroll: total gaji. Sitasi: gas/Code.gs:387,3599,3746-3753,3862 (identik
-- di 4 lokasi). TIDAK ada Math.round di formula ini sendiri (semua input
-- sudah integer) — pembulatan cuma terjadi di hulu (calc_gaji_harian di atas).
-- ---------------------------------------------------------------------------
create or replace function public.calc_payroll_total(
  gaji_pokok integer, total_reward integer, bonus_kerajinan integer,
  adjustment_plus integer, total_denda integer, adjustment_minus integer
) returns integer
language sql immutable as $$
  select greatest(0,
    coalesce(gaji_pokok,0) + coalesce(total_reward,0) + coalesce(bonus_kerajinan,0) + coalesce(adjustment_plus,0)
    - coalesce(total_denda,0) - coalesce(adjustment_minus,0)
  );
$$;

-- Syarat bonus kerajinan: absen FISIK (BUKAN absen murni) harus 0.
-- Sitasi: gas/Code.gs:2282,2052 + komentar tegas approveIzin gas/Code.gs:4451
-- ("Hari absen TIDAK dikurangi — izin hanya menghapus SP dan denda SP").
create or replace function public.calc_bonus_kerajinan(absen_fisik integer, bonus_setting integer)
returns integer
language sql immutable as $$
  select case when coalesce(absen_fisik,0) = 0 then coalesce(bonus_setting,0) else 0 end;
$$;

-- ---------------------------------------------------------------------------
-- Mekanisme anti-dobel bonus kerajinan pada slip (applyEffectivePayrollBonus_).
-- Sitasi: gas/Code.gs:3727-3756 — dipanggil SETIAP slip dibaca, termasuk yg
-- PUBLISHED (angka tetap sama, cuma presentasinya yg dihitung ulang).
-- ---------------------------------------------------------------------------
create or replace function public.calc_effective_payroll_bonus(
  original_bonus integer, effective_bonus_setting integer, original_adjustment_plus integer
) returns table(
  effective_bonus integer,
  effective_adjustment_plus integer,
  absorbed boolean,
  absorbed_amount integer
)
language sql immutable as $$
  with base as (
    select
      greatest(0, coalesce(original_bonus,0)) as ob,
      greatest(0, coalesce(effective_bonus_setting, original_bonus, 0)) as eb,
      greatest(0, coalesce(original_adjustment_plus,0)) as oap
  ), calc as (
    select ob, eb, oap, greatest(0, eb - ob) as delta from base
  )
  select
    case when ob <= 0 then 0 else eb end,
    case when ob <= 0 then 0
         when delta > 0 and oap = delta then 0
         else oap end,
    (ob > 0 and delta > 0 and oap = delta),
    case when ob > 0 and delta > 0 and oap = delta then delta else 0 end
  from calc;
$$;
comment on function public.calc_effective_payroll_bonus is 'Syarat "diserap" harus PERSIS (oap = delta), bukan >=. Kalau originalBonus<=0 (karyawan absen saat draft dibuat), tidak pernah override setting terbaru -- meniru original_bonus<=0 return detail apa adanya di kode lama.';
