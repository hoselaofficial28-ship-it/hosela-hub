-- ============================================================================
-- Lembur pulang harus disetujui Owner (24 Nov 2026)
--
-- Sebelumnya: pulang ≥60 menit setelah jam shift otomatis dicatat LEMBUR_PULANG
-- dan langsung menambah penghargaan (mis. pulang 23.26 padahal shift siang
-- berakhir 22.00 -> Rp 20.000) walau bukan lembur.
--
-- Sekarang: setiap LEMBUR_PULANG yang dibuat mesin rekap ditahan menjadi
-- pengajuan (status MENUNGGU). Owner menyetujui -> barulah baris lembur masuk
-- dan reward dihitung. Ditolak -> tidak ada reward.
--
-- Aman dijalankan berulang.
-- ============================================================================

begin;

create table if not exists public.overtime_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null,
  menit_lembur integer not null default 0,
  reward integer not null default 0,
  keterangan text,
  status text not null default 'MENUNGGU' check (status in ('MENUNGGU','DISETUJUI','DITOLAK')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  unique (user_id, tanggal)
);

alter table public.overtime_requests enable row level security;
revoke all on public.overtime_requests from public, anon, authenticated;

-- Tahan LEMBUR_PULANG otomatis menjadi pengajuan (kecuali sedang disetujui).
create or replace function public._lembur_perlu_persetujuan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nama text;
  v_menit integer;
begin
  if new.tipe <> 'LEMBUR_PULANG' then
    return new;
  end if;
  if coalesce(current_setting('app.lembur_disetujui', true), '0') = '1' then
    return new;
  end if;

  v_menit := greatest(0, (coalesce(new.nilai, 0) / 10000) * 30);

  insert into public.overtime_requests(user_id, tanggal, menit_lembur, reward, keterangan)
  values (new.user_id, new.tanggal, v_menit, coalesce(new.nilai, 0), new.keterangan)
  on conflict (user_id, tanggal) do update
    set menit_lembur = excluded.menit_lembur,
        reward = excluded.reward,
        keterangan = excluded.keterangan
    where public.overtime_requests.status = 'MENUNGGU';

  select p.nama into v_nama from public.profiles p where p.id = new.user_id;

  insert into public.notifications(user_id, judul, isi, tipe, menu)
  select id, 'Pengajuan lembur pulang',
         coalesce(v_nama, 'Karyawan') || ' · ' || new.tanggal || ': lembur ' || v_menit ||
         ' menit (Rp ' || to_char(coalesce(new.nilai,0), 'FM999G999G999') || ')',
         'INFO', 's-review-telat'
    from public.profiles
   where bagian = 'Owner' and status = 'AKTIF';

  -- jangan masukkan baris lembur sebelum disetujui
  return null;
end;
$$;

drop trigger if exists lembur_perlu_persetujuan on public.attendance_details;
create trigger lembur_perlu_persetujuan
before insert on public.attendance_details
for each row execute function public._lembur_perlu_persetujuan();

-- Daftar pengajuan lembur untuk Owner/Finance.
create or replace function public.get_pending_overtime_requests(p_bulan text default 'ALL')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_payroll_admin() then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', q.id, 'userId', q.user_id, 'nama', p.nama, 'bagian', p.bagian,
             'tanggal', q.tanggal, 'menitLembur', q.menit_lembur, 'reward', q.reward,
             'keterangan', q.keterangan, 'status', q.status,
             'terkunci', exists(select 1 from public.payroll_runs r
                                 where r.bulan = to_char(q.tanggal,'YYYY-MM') and r.status = 'PUBLISHED')
           ) order by q.created_at)
      from public.overtime_requests q
      join public.profiles p on p.id = q.user_id
     where q.status = 'MENUNGGU'
       and (p_bulan = 'ALL' or to_char(q.tanggal,'YYYY-MM') = p_bulan)
  ), '[]'::jsonb);
end;
$$;

-- Keputusan Owner: setujui -> baris lembur dibuat; tolak -> tidak ada reward.
create or replace function public.decide_overtime_request(p_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  q public.overtime_requests%rowtype;
  v_waktu time;
  v_minggu text;
  v_nama text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and bagian = 'Owner' and status = 'AKTIF'
  ) then
    raise exception 'Hanya Owner dapat memutuskan lembur' using errcode = '42501';
  end if;
  if p_approve is null then
    raise exception 'Pilih keputusan' using errcode = '22023';
  end if;

  select * into q from public.overtime_requests where id = p_id for update;
  if q.id is null then
    raise exception 'Pengajuan lembur tidak ditemukan' using errcode = 'P0002';
  end if;
  if q.status <> 'MENUNGGU' then
    return jsonb_build_object('success', true, 'msg', 'Pengajuan sudah diputuskan.');
  end if;

  select p.nama into v_nama from public.profiles p where p.id = q.user_id;

  if p_approve then
    select max(e.jam) into v_waktu
      from public.attendance_events e
     where e.user_id = q.user_id and e.tanggal = q.tanggal
       and e.tipe = 'PULANG' and e.status = 'DITERIMA';
    v_minggu := to_char(q.tanggal, 'IYYY-"W"IW');

    perform set_config('app.lembur_disetujui', '1', true);
    insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai, is_generated)
    values (q.user_id, v_minggu, q.tanggal, coalesce(v_waktu, '18:00'::time), 'LEMBUR_PULANG',
            coalesce(q.keterangan, 'Lembur pulang disetujui Owner'), q.reward, false);
    perform set_config('app.lembur_disetujui', '0', true);

    update public.attendance_weekly w
       set total_denda = w.total_denda, updated_at = now()
     where w.user_id = q.user_id and w.minggu = v_minggu;

    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (q.user_id, 'Lembur pulang disetujui',
            'Lembur ' || q.menit_lembur || ' menit pada ' || q.tanggal || ' disetujui (Rp ' ||
            to_char(q.reward, 'FM999G999G999') || ').', 'INFO', 's-slip-gaji');
  else
    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (q.user_id, 'Lembur pulang tidak disetujui',
            'Pengajuan lembur pada ' || q.tanggal || ' tidak disetujui Owner.', 'INFO', 's-slip-gaji');
  end if;

  update public.overtime_requests
     set status = case when p_approve then 'DISETUJUI' else 'DITOLAK' end,
         reviewed_at = now(), reviewed_by = auth.uid()
   where id = q.id;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (auth.uid(), 'PUTUSKAN_LEMBUR', q.id::text,
          jsonb_build_object('tanggal', q.tanggal, 'menit', q.menit_lembur, 'reward', q.reward, 'setuju', p_approve),
          'Owner memutuskan lembur ' || coalesce(v_nama, '') || ' tanggal ' || q.tanggal);

  return jsonb_build_object(
    'success', true,
    'status', case when p_approve then 'DISETUJUI' else 'DITOLAK' end,
    'reward', case when p_approve then q.reward else 0 end,
    'nama', v_nama, 'tanggal', q.tanggal
  );
end;
$$;

revoke all on function public.get_pending_overtime_requests(text) from public, anon;
revoke all on function public.decide_overtime_request(uuid, boolean) from public, anon;
revoke all on function public._lembur_perlu_persetujuan() from public, anon, authenticated;
grant execute on function public.get_pending_overtime_requests(text) to authenticated, service_role;
grant execute on function public.decide_overtime_request(uuid, boolean) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
