-- ============================================================================
-- Cegah baris kehadiran ganda (alasan/potongan dobel) — 21 Nov 2026
--
-- Kasus: 18 Nov 2026 muncul dua baris IZIN_TELAT dengan alasan sama, sehingga
-- potongan izin tampil dua kali (Rp 19.947 x 2). Penyebabnya proses rekap dan
-- review Owner menulis baris untuk tanggal & tipe yang sama.
--
-- Perbaikan:
--   1) gabungkan baris ganda yang sudah ada (simpan satu baris, nilai terbesar),
--   2) trigger BEFORE INSERT menolak/menggabungkan baris TELAT / IZIN_TELAT ganda
--      untuk karyawan + tanggal yang sama, sehingga ke depan tidak bisa dobel.
-- Aman dijalankan berulang (idempoten).
-- ============================================================================

begin;

-- 1) Bersihkan baris ganda: pertahankan satu baris (nilai terbesar, created_at terbaru).
with peringkat as (
  select id,
         row_number() over (
           partition by user_id, tanggal, tipe
           order by nilai desc, created_at desc, id desc
         ) as rn
    from public.attendance_details
   where tipe in ('TELAT','IZIN_TELAT')
)
delete from public.attendance_details d
 using peringkat p
 where d.id = p.id and p.rn > 1;

-- 2) Trigger pencegah duplikasi untuk ke depan.
create or replace function public._gabung_detail_telat_ganda()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.tipe in ('TELAT','IZIN_TELAT') and new.user_id is not null and new.tanggal is not null then
    update public.attendance_details d
       set tipe = new.tipe,
           nilai = greatest(coalesce(d.nilai, 0), coalesce(new.nilai, 0)),
           keterangan = coalesce(nullif(new.keterangan, ''), d.keterangan),
           waktu = coalesce(new.waktu, d.waktu)
     where d.user_id = new.user_id
       and d.tanggal = new.tanggal
       and d.tipe = new.tipe
       and d.id <> new.id;

    if found then
      -- baris untuk tanggal ini sudah ada: jangan tambah baris baru
      return null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists gabung_detail_telat_ganda on public.attendance_details;
create trigger gabung_detail_telat_ganda
before insert on public.attendance_details
for each row execute function public._gabung_detail_telat_ganda();

revoke all on function public._gabung_detail_telat_ganda() from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';
