-- ============================================================================
-- 20261023000048 — Review keterlambatan terhubung ke kehadiran dan payroll
-- ============================================================================
-- Keputusan review disimpan per karyawan + tanggal, bukan menempel pada ID
-- attendance_details. Dengan begitu keputusan tetap berlaku saat rekap bulan
-- diproses ulang dan baris detail absensi dibuat ulang.

begin;

create table if not exists public.late_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null,
  status_review text not null check (status_review in (
    'TELAT_NORMAL','IZIN_TELAT_KHUSUS','BEBAS_POTONGAN'
  )),
  durasi_izin_jam numeric(5,2) not null default 0 check (durasi_izin_jam >= 0 and durasi_izin_jam <= 24),
  alasan text,
  catatan text,
  denda_normal integer not null default 0 check (denda_normal >= 0),
  tarif_per_jam integer not null default 0 check (tarif_per_jam >= 0),
  potongan_final integer not null default 0 check (potongan_final >= 0),
  reviewed_by uuid references public.profiles(id),
  reviewed_by_name text,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tanggal)
);

alter table public.late_reviews enable row level security;

-- Tidak ada policy tulis/baca langsung. Semua akses melalui RPC tervalidasi.
revoke all on table public.late_reviews from public, anon, authenticated;
grant all on table public.late_reviews to service_role;

-- Saat rekap dibangun ulang, keputusan Owner diterapkan kembali otomatis.
create or replace function public._apply_late_review_to_detail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.late_reviews%rowtype;
begin
  if new.tipe <> 'TELAT' then return new; end if;

  select * into v_review
  from public.late_reviews
  where user_id = new.user_id and tanggal = new.tanggal;

  if v_review.id is not null then
    new.nilai := v_review.potongan_final;
    new.keterangan := split_part(coalesce(new.keterangan, ''), ' [Review Owner:', 1) ||
      ' [Review Owner: ' || replace(v_review.status_review, '_', ' ') || ']';
  end if;
  return new;
end;
$$;

drop trigger if exists apply_late_review_before_detail on public.attendance_details;
create trigger apply_late_review_before_detail
before insert or update of tipe, user_id, tanggal, nilai on public.attendance_details
for each row execute function public._apply_late_review_to_detail();

create or replace function public.get_late_reviews(p_status text, p_bulan text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mereview keterlambatan' using errcode = '42501';
  end if;
  if coalesce(p_bulan, 'ALL') <> 'ALL' and p_bulan !~ '^\\d{4}-\\d{2}$' then
    raise exception 'Bulan tidak valid';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.detail_id,
    'nama', x.nama,
    'userId', x.user_id,
    'tanggal', x.tanggal,
    'bulan', to_char(x.tanggal, 'YYYY-MM'),
    'statusReview', x.status_review,
    'jamMasuk', to_char(x.jam_masuk, 'HH24:MI:SS'),
    'jadwalMasuk', to_char(x.jadwal_masuk, 'HH24:MI:SS'),
    'menitTelat', x.menit_telat,
    'dendaNormal', x.denda_normal,
    'tarifPerJam', x.tarif_per_jam,
    'potonganFinal', x.potongan_final,
    'alasan', x.alasan,
    'catatan', x.catatan
  ) order by x.tanggal desc, x.nama), '[]'::jsonb)
  into v_result
  from (
    select
      d.id detail_id, d.user_id, p.nama, d.tanggal, d.waktu jam_masuk,
      j.jam_masuk jadwal_masuk,
      greatest(0,
        extract(hour from d.waktu)::integer * 60 + extract(minute from d.waktu)::integer
        - extract(hour from j.jam_masuk)::integer * 60 - extract(minute from j.jam_masuk)::integer
      ) menit_telat,
      coalesce(r.status_review, 'MENUNGGU') status_review,
      coalesce(r.denda_normal, d.nilai, 0) denda_normal,
      coalesce(r.tarif_per_jam,
        round(public.calc_gaji_harian(s.gaji_bulanan, public.calc_hari_kerja_efektif(to_char(d.tanggal,'YYYY-MM')))::numeric / 8)::integer,
        0
      ) tarif_per_jam,
      coalesce(r.potongan_final, d.nilai, 0) potongan_final,
      coalesce(r.alasan, '') alasan,
      coalesce(r.catatan, '') catatan
    from public.attendance_details d
    join public.profiles p on p.id = d.user_id
    cross join lateral public.get_jadwal_hari(d.tanggal) j
    cross join lateral public.get_effective_salary_setting(
      p.id, to_char(d.tanggal,'YYYY-MM'), p.gaji_bulanan, 150000
    ) s
    left join public.late_reviews r on r.user_id = d.user_id and r.tanggal = d.tanggal
    where d.tipe = 'TELAT'
      and (coalesce(p_bulan, 'ALL') = 'ALL' or to_char(d.tanggal,'YYYY-MM') = p_bulan)
      and (coalesce(p_status, 'MENUNGGU') = 'ALL'
        or coalesce(r.status_review, 'MENUNGGU') = p_status)
  ) x;

  return v_result;
end;
$$;

create or replace function public.review_late_attendance(
  p_attendance_detail_id uuid,
  p_jenis text,
  p_durasi numeric,
  p_alasan text,
  p_catatan text,
  p_reviewer_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detail public.attendance_details%rowtype;
  v_existing public.late_reviews%rowtype;
  v_status text;
  v_durasi numeric(5,2) := greatest(0, least(24, coalesce(p_durasi, 0)));
  v_denda_normal integer;
  v_gaji integer;
  v_tarif_per_jam integer;
  v_potongan_final integer;
  v_bulan text;
  v_run record;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menyimpan review' using errcode = '42501';
  end if;

  select * into v_detail
  from public.attendance_details
  where id = p_attendance_detail_id and tipe = 'TELAT'
  for update;
  if v_detail.id is null then
    return jsonb_build_object('success', false, 'msg', 'Data keterlambatan tidak ditemukan. Muat ulang halaman lalu coba lagi.');
  end if;

  v_bulan := to_char(v_detail.tanggal, 'YYYY-MM');
  if exists(select 1 from public.payroll_runs where bulan = v_bulan and status = 'PUBLISHED') then
    return jsonb_build_object('success', false,
      'msg', 'Slip bulan ini sudah diterbitkan. Batalkan penerbitan slip terlebih dahulu sebelum mengubah review telat.');
  end if;

  select * into v_existing from public.late_reviews
  where user_id = v_detail.user_id and tanggal = v_detail.tanggal;
  v_denda_normal := coalesce(v_existing.denda_normal, v_detail.nilai, 0);

  select s.gaji_bulanan into v_gaji
  from public.profiles p
  cross join lateral public.get_effective_salary_setting(
    p.id, v_bulan, p.gaji_bulanan, 150000
  ) s
  where p.id = v_detail.user_id;
  v_tarif_per_jam := greatest(0, round(
    public.calc_gaji_harian(coalesce(v_gaji, 0), public.calc_hari_kerja_efektif(v_bulan))::numeric / 8
  )::integer);

  case upper(coalesce(p_jenis, ''))
    when 'NORMAL' then
      v_status := 'TELAT_NORMAL';
      v_potongan_final := v_denda_normal;
      v_durasi := 0;
    when 'IZIN_KHUSUS' then
      if v_durasi <= 0 then
        return jsonb_build_object('success', false, 'msg', 'Durasi izin khusus wajib lebih dari 0 jam.');
      end if;
      v_status := 'IZIN_TELAT_KHUSUS';
      -- Izin khusus memakai upah per jam, tetapi tidak boleh menghasilkan
      -- potongan lebih besar daripada denda normal kejadian yang sama.
      v_potongan_final := least(v_denda_normal, round(v_tarif_per_jam * v_durasi)::integer);
    when 'BEBAS' then
      v_status := 'BEBAS_POTONGAN';
      v_potongan_final := 0;
      v_durasi := 0;
    else
      return jsonb_build_object('success', false, 'msg', 'Jenis keputusan tidak valid.');
  end case;

  insert into public.late_reviews(
    user_id, tanggal, status_review, durasi_izin_jam, alasan, catatan,
    denda_normal, tarif_per_jam, potongan_final,
    reviewed_by, reviewed_by_name, reviewed_at, updated_at
  ) values (
    v_detail.user_id, v_detail.tanggal, v_status, v_durasi,
    nullif(trim(coalesce(p_alasan, '')), ''), nullif(trim(coalesce(p_catatan, '')), ''),
    v_denda_normal, v_tarif_per_jam, v_potongan_final,
    auth.uid(), nullif(trim(coalesce(p_reviewer_name, '')), ''), now(), now()
  )
  on conflict (user_id, tanggal) do update set
    status_review = excluded.status_review,
    durasi_izin_jam = excluded.durasi_izin_jam,
    alasan = excluded.alasan,
    catatan = excluded.catatan,
    denda_normal = excluded.denda_normal,
    tarif_per_jam = excluded.tarif_per_jam,
    potongan_final = excluded.potongan_final,
    reviewed_by = excluded.reviewed_by,
    reviewed_by_name = excluded.reviewed_by_name,
    reviewed_at = excluded.reviewed_at,
    updated_at = now();

  update public.attendance_details
  set nilai = v_potongan_final,
      keterangan = split_part(coalesce(keterangan, ''), ' [Review Owner:', 1) ||
        ' [Review Owner: ' || replace(v_status, '_', ' ') || ']'
  where id = v_detail.id;

  insert into public.notifications(user_id, judul, isi, tipe, menu)
  values (
    v_detail.user_id,
    'Review keterlambatan selesai',
    'Keterlambatan tanggal ' || to_char(v_detail.tanggal, 'DD-MM-YYYY') ||
      ' diputuskan sebagai ' || replace(v_status, '_', ' ') ||
      '. Potongan final Rp ' || to_char(v_potongan_final, 'FM999G999G999') || '.',
    'INFO', 's-catatan-kehadiran'
  );

  insert into public.audit_logs(actor, action, target, before_data, after_data, catatan)
  values (
    auth.uid(), 'REVIEW_LATE_ATTENDANCE', v_detail.id::text,
    jsonb_build_object('dendaNormal', v_denda_normal),
    jsonb_build_object('status', v_status, 'durasiJam', v_durasi, 'potonganFinal', v_potongan_final),
    nullif(trim(coalesce(p_catatan, '')), '')
  );

  -- Draf/konfirmasi lama langsung dikembalikan ke Draf dan diselaraskan.
  for v_run in select id from public.payroll_runs where bulan = v_bulan and status <> 'PUBLISHED' loop
    perform public.refresh_payroll_from_attendance(v_run.id);
  end loop;

  return jsonb_build_object(
    'success', true,
    'msg', 'Keputusan keterlambatan tersimpan dan penggajian telah diselaraskan.',
    'statusReview', v_status,
    'potonganFinal', v_potongan_final
  );
end;
$$;

revoke execute on function public.get_late_reviews(text, text) from public, anon;
revoke execute on function public.review_late_attendance(uuid, text, numeric, text, text, text) from public, anon;
grant execute on function public.get_late_reviews(text, text) to authenticated, service_role;
grant execute on function public.review_late_attendance(uuid, text, numeric, text, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
