-- ============================================================================
-- Hosela Hub — pengelolaan jobdesk, tata tertib, dan lokasi kantor oleh Owner.
-- Jalankan manual di Supabase SQL Editor, terpisah dari deploy aplikasi statis.
-- ============================================================================

create or replace function public.get_my_jobdesk()
returns table(id uuid, bagian text, jabatan text, link text)
language sql security definer stable set search_path = public as $$
  select j.id, j.bagian, j.jabatan, j.link
  from public.profiles p
  left join lateral (
    select x.id, x.bagian, x.jabatan, x.link
    from public.jobdesks x
    where lower(trim(x.jabatan)) = lower(trim(p.jabatan))
      and (
        lower(trim(coalesce(x.bagian, ''))) = lower(trim(p.bagian))
        or lower(trim(p.bagian)) = case lower(trim(coalesce(x.bagian, '')))
          when 'packing' then 'gudang'
          when 'live' then 'live streaming'
          when 'ecommerce' then 'marketplace & ecommerce'
          else lower(trim(coalesce(x.bagian, '')))
        end
      )
    order by case when lower(trim(coalesce(x.bagian, ''))) = lower(trim(p.bagian)) then 0 else 1 end
    limit 1
  ) j on true
  where p.id = auth.uid() and p.status = 'AKTIF';
$$;

grant execute on function public.get_my_jobdesk() to authenticated;

create or replace function public.get_owner_jobdesks()
returns table(id uuid, bagian text, jabatan text, link text)
language plpgsql security definer stable set search_path = public as $$
begin
  if lower(coalesce(public.current_bagian(), '')) <> 'owner' then
    raise exception 'Akses ditolak: hanya Owner yang boleh mengelola jobdesk' using errcode = '42501';
  end if;
  return query
    select j.id, j.bagian, j.jabatan, j.link
    from public.jobdesks j
    where j.bagian is not null
    order by j.bagian, j.jabatan;
end;
$$;

grant execute on function public.get_owner_jobdesks() to authenticated;

create or replace function public.upsert_jobdesk_link(p_bagian text, p_jabatan text, p_link text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_before jsonb; v_after jsonb;
begin
  if lower(coalesce(public.current_bagian(), '')) <> 'owner' then
    raise exception 'Akses ditolak: hanya Owner yang boleh mengelola jobdesk' using errcode = '42501';
  end if;
  if nullif(trim(p_bagian), '') is null or nullif(trim(p_jabatan), '') is null then
    return jsonb_build_object('success', false, 'msg', 'Bagian dan jabatan wajib dipilih');
  end if;
  if nullif(trim(p_link), '') is null or trim(p_link) !~* '^https?://' then
    return jsonb_build_object('success', false, 'msg', 'Link Google Drive tidak valid');
  end if;

  select j.id, to_jsonb(j) into v_id, v_before
  from public.jobdesks j
  where lower(trim(coalesce(j.bagian, ''))) = lower(trim(p_bagian))
    and lower(trim(j.jabatan)) = lower(trim(p_jabatan))
  order by j.created_at limit 1;

  if v_id is null then
    insert into public.jobdesks(bagian, jabatan, link)
    values (trim(p_bagian), trim(p_jabatan), trim(p_link))
    returning id into v_id;
  else
    update public.jobdesks set link = trim(p_link)
    where id = v_id;
  end if;
  select to_jsonb(j) into v_after from public.jobdesks j where j.id = v_id;

  insert into public.audit_logs(actor, action, target, before_data, after_data, catatan)
  values (auth.uid(), 'UPSERT_JOBDESK_LINK', v_id::text, v_before, v_after, trim(p_bagian) || ' — ' || trim(p_jabatan));
  return jsonb_build_object('success', true, 'msg', 'Link jobdesk berhasil disimpan');
end;
$$;

grant execute on function public.upsert_jobdesk_link(text, text, text) to authenticated;

create or replace function public.get_office_settings()
returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if lower(coalesce(public.current_bagian(), '')) <> 'owner' then
    raise exception 'Akses ditolak: hanya Owner yang boleh melihat pengaturan kantor' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'OFFICE_LAT', (select value from public.app_settings where key = 'OFFICE_LAT'),
    'OFFICE_LNG', (select value from public.app_settings where key = 'OFFICE_LNG'),
    'OFFICE_RADIUS_M', coalesce((select value from public.app_settings where key = 'OFFICE_RADIUS_M'), '120')
  );
end;
$$;

grant execute on function public.get_office_settings() to authenticated;

create or replace function public.set_office_settings(p_lat numeric, p_lng numeric, p_radius integer default 120)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_before jsonb; v_after jsonb;
begin
  if lower(coalesce(public.current_bagian(), '')) <> 'owner' then
    raise exception 'Akses ditolak: hanya Owner yang boleh mengatur lokasi kantor' using errcode = '42501';
  end if;
  if p_lat is null or p_lat < -90 or p_lat > 90 or p_lng is null or p_lng < -180 or p_lng > 180 then
    return jsonb_build_object('success', false, 'msg', 'Koordinat lokasi tidak valid');
  end if;
  if p_radius < 20 or p_radius > 2000 then
    return jsonb_build_object('success', false, 'msg', 'Radius harus antara 20–2000 meter');
  end if;

  select jsonb_object_agg(key, value) into v_before from public.app_settings
  where key in ('OFFICE_LAT','OFFICE_LNG','OFFICE_RADIUS_M');
  insert into public.app_settings(key, value) values
    ('OFFICE_LAT', p_lat::text), ('OFFICE_LNG', p_lng::text), ('OFFICE_RADIUS_M', p_radius::text)
  on conflict (key) do update set value = excluded.value;
  select jsonb_object_agg(key, value) into v_after from public.app_settings
  where key in ('OFFICE_LAT','OFFICE_LNG','OFFICE_RADIUS_M');
  insert into public.audit_logs(actor, action, target, before_data, after_data, catatan)
  values (auth.uid(), 'SET_OFFICE_LOCATION', 'app_settings', v_before, v_after, 'Lokasi kantor dan radius absensi diperbarui');
  return jsonb_build_object('success', true, 'msg', 'Lokasi kantor berhasil disimpan');
end;
$$;

grant execute on function public.set_office_settings(numeric, numeric, integer) to authenticated;

create or replace function public.save_rule(p_id uuid, p_kategori text, p_isi text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_before jsonb; v_after jsonb; v_no integer;
begin
  if lower(coalesce(public.current_bagian(), '')) <> 'owner' then
    raise exception 'Akses ditolak: hanya Owner yang boleh mengelola peraturan' using errcode = '42501';
  end if;
  if nullif(trim(p_kategori), '') is null or nullif(trim(p_isi), '') is null then
    return jsonb_build_object('success', false, 'msg', 'Kategori dan isi peraturan wajib diisi');
  end if;
  if p_id is null then
    select coalesce(max(no_urut), 0) + 1 into v_no from public.rules;
    insert into public.rules(no_urut, kategori, isi)
    values (v_no, trim(p_kategori), trim(p_isi))
    returning id into v_id;
  else
    select to_jsonb(r) into v_before from public.rules r where r.id = p_id;
    update public.rules set kategori = trim(p_kategori), isi = trim(p_isi), updated_at = now()
    where id = p_id returning id into v_id;
    if v_id is null then return jsonb_build_object('success', false, 'msg', 'Peraturan tidak ditemukan'); end if;
  end if;
  select to_jsonb(r) into v_after from public.rules r where r.id = v_id;
  insert into public.audit_logs(actor, action, target, before_data, after_data, catatan)
  values (auth.uid(), 'SAVE_RULE', v_id::text, v_before, v_after, trim(p_kategori));
  return jsonb_build_object('success', true, 'msg', case when p_id is null then 'Peraturan berhasil ditambahkan' else 'Peraturan berhasil diperbarui' end);
end;
$$;

grant execute on function public.save_rule(uuid, text, text) to authenticated;
