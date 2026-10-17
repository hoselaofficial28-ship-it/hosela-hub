begin;

-- Owner dapat menarik kembali slip yang telanjur diterbitkan.
-- Data payroll tidak dihapus: status dikembalikan ke CONFIRMED supaya
-- dapat diperiksa dan diterbitkan ulang setelah koreksi.
create or replace function public.cancel_published_payroll(p_payroll_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.payroll_runs%rowtype;
  r record;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;

  if not public.is_owner() then
    raise exception 'Akses ditolak: hanya Owner yang boleh membatalkan slip terbit' using errcode = '42501';
  end if;

  select * into v_run
  from public.payroll_runs
  where id = p_payroll_run_id
  for update;

  if v_run.id is null then
    return jsonb_build_object('success', false, 'msg', 'Penggajian tidak ditemukan.');
  end if;

  if v_run.status <> 'PUBLISHED' then
    return jsonb_build_object('success', false, 'msg', 'Slip hanya dapat dibatalkan jika sudah diterbitkan.');
  end if;

  update public.payroll_runs
  set status = 'CONFIRMED',
      dipublish_oleh = null,
      dipublish_pada = null
  where id = p_payroll_run_id;

  update public.payroll_details
  set status_slip = 'DRAFT'
  where payroll_run_id = p_payroll_run_id;

  for r in
    select user_id
    from public.payroll_details
    where payroll_run_id = p_payroll_run_id
  loop
    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (
      r.user_id,
      'Slip gaji ditarik kembali',
      'Slip gaji ' || v_run.bulan || ' sedang diperiksa kembali oleh Owner dan sementara tidak tersedia.',
      'INFO',
      's-notifikasi'
    );
  end loop;

  insert into public.audit_logs(actor, action, target, before_data, after_data, catatan)
  values (
    auth.uid(),
    'CANCEL_PUBLISHED_PAYROLL',
    p_payroll_run_id::text,
    jsonb_build_object('status', v_run.status, 'dipublishPada', v_run.dipublish_pada),
    jsonb_build_object('status', 'CONFIRMED'),
    'Slip ditarik dari karyawan tanpa menghapus data payroll.'
  );

  return public.get_payroll_run_payload(p_payroll_run_id);
end;
$$;

revoke execute on function public.cancel_published_payroll(uuid) from public, anon;
grant execute on function public.cancel_published_payroll(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
