-- ============================================================================
-- Konfirmasi baca Peraturan Kantor — 17 Nov 2026
--
-- Tujuan: setiap karyawan punya bukti "sudah membaca peraturan sampai habis".
-- Aplikasi mencatat progres per pasal di perangkat, lalu saat semua pasal
-- terbaca karyawan menekan "Saya sudah membaca" -> tersimpan di server.
--
-- Isi: 1 tabel + 2 fungsi (catat & status). Tidak mengubah data peraturan.
-- Aman dijalankan berulang.
-- ============================================================================

begin;

create table if not exists public.rule_acknowledgements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  total_pasal integer not null default 0,
  catatan text
);

alter table public.rule_acknowledgements enable row level security;

revoke all on table public.rule_acknowledgements from public, anon, authenticated;
grant all on table public.rule_acknowledgements to service_role;

drop policy if exists rule_ack_owner_read on public.rule_acknowledgements;
create policy rule_ack_owner_read on public.rule_acknowledgements
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.bagian in ('Owner','Finance')
    )
  );

grant select on public.rule_acknowledgements to authenticated;

comment on table public.rule_acknowledgements is
  'Bukti karyawan sudah membaca seluruh peraturan kantor (satu baris per karyawan, diperbarui bila konfirmasi diulang).';

-- ---------------------------------------------------------------------------
-- Catat konfirmasi baca (dipanggil dari tombol "Saya sudah membaca")
-- ---------------------------------------------------------------------------
create or replace function public.catat_baca_peraturan(p_total_pasal integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nama text;
  v_tanggal timestamptz;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;

  select p.nama into v_nama from public.profiles p where p.id = v_uid;
  if v_nama is null then
    raise exception 'Profil tidak ditemukan' using errcode = 'P0002';
  end if;

  insert into public.rule_acknowledgements(user_id, acknowledged_at, total_pasal, catatan)
  values (v_uid, now(), greatest(0, coalesce(p_total_pasal, 0)), 'Konfirmasi dari aplikasi')
  on conflict (user_id) do update
     set acknowledged_at = now(),
         total_pasal = excluded.total_pasal,
         catatan = excluded.catatan
  returning acknowledged_at into v_tanggal;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (v_uid, 'BACA_PERATURAN', v_uid::text,
          jsonb_build_object('total_pasal', greatest(0, coalesce(p_total_pasal, 0))),
          'Konfirmasi membaca peraturan: ' || v_nama);

  return jsonb_build_object(
    'success', true,
    'tanggal', to_char(v_tanggal at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') || ' WIB',
    'totalPasal', greatest(0, coalesce(p_total_pasal, 0))
  );
end;
$$;

revoke execute on function public.catat_baca_peraturan(integer) from public, anon;
grant execute on function public.catat_baca_peraturan(integer) to authenticated, service_role;

comment on function public.catat_baca_peraturan(integer) is
  'Menyimpan konfirmasi karyawan bahwa seluruh peraturan sudah dibaca (upsert + audit log).';

-- ---------------------------------------------------------------------------
-- Status konfirmasi: milik sendiri + ringkasan kepatuhan tim (Owner/Finance)
-- ---------------------------------------------------------------------------
create or replace function public.get_status_baca_peraturan()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
  v_tgl timestamptz;
  v_total integer;
  v_jumlah integer := 0;
  v_target integer := 0;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;

  select exists(
    select 1 from public.profiles p
     where p.id = v_uid and p.bagian in ('Owner','Finance')
  ) into v_admin;

  select r.acknowledged_at, r.total_pasal into v_tgl, v_total
    from public.rule_acknowledgements r where r.user_id = v_uid;

  if v_admin then
    select count(*) into v_jumlah from public.rule_acknowledgements;
    select count(*) into v_target from public.profiles
     where status = 'AKTIF' and bagian not in ('Owner','Finance');
  end if;

  return jsonb_build_object(
    'success', true,
    'tanggal', case when v_tgl is null then null
                    else to_char(v_tgl at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') || ' WIB' end,
    'totalPasal', coalesce(v_total, 0),
    'admin', v_admin,
    'sudahBaca', v_jumlah,
    'targetKaryawan', v_target
  );
end;
$$;

revoke execute on function public.get_status_baca_peraturan() from public, anon;
grant execute on function public.get_status_baca_peraturan() to authenticated, service_role;

comment on function public.get_status_baca_peraturan() is
  'Status konfirmasi baca peraturan untuk diri sendiri, plus jumlah karyawan yang sudah membaca bagi Owner/Finance.';

commit;

notify pgrst, 'reload schema';
