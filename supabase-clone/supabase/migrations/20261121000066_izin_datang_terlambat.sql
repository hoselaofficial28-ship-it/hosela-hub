-- Izin datang terlambat: upah bulanan / hari kerja bulan / menit shift.
-- Tidak memigrasikan keputusan historis atau mengubah slip terbit otomatis.
begin;

-- Cadangan definisi pertama, tanpa menyalin data karyawan. Tidak dapat diakses client.
create table if not exists public.migration_66_backup (
 object_key text primary key, definition text not null, saved_at timestamptz not null default now()
);
alter table public.migration_66_backup enable row level security;
revoke all on public.migration_66_backup from public,anon,authenticated;
insert into public.migration_66_backup(object_key,definition)
 select p.oid::regprocedure::text,pg_get_functiondef(p.oid)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('_apply_late_review_to_detail','get_late_reviews',
 'review_late_attendance','_total_denda_bulan_ledger','process_absensi_app_to_rekap',
 '_snapshot_payroll_items','refresh_payroll_from_attendance','get_absensi_rekap_base')
on conflict(object_key) do nothing;
insert into public.migration_66_backup(object_key,definition)
 select conrelid::regclass::text||'.'||conname,pg_get_constraintdef(oid)
 from pg_constraint where conname in ('attendance_details_tipe_check','payroll_items_tipe_check')
 and connamespace='public'::regnamespace
on conflict(object_key) do nothing;

alter table public.attendance_details drop constraint if exists attendance_details_tipe_check;
alter table public.attendance_details add constraint attendance_details_tipe_check check (tipe in (
 'HADIR','TELAT','IZIN_TELAT','ABSEN','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR',
 'ANOMALI_PENDING','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL','REWARD_MANUAL'));
alter table public.payroll_items drop constraint if exists payroll_items_tipe_check;
alter table public.payroll_items add constraint payroll_items_tipe_check check (tipe in (
 'BONUS_KERAJINAN','DENDA_SP','DENDA_TELAT','DENDA_MANUAL','REWARD_MANUAL',
 'LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ABSEN','POTONGAN_ABSEN',
 'POTONGAN_IZIN','ADJUSTMENT_PLUS','ADJUSTMENT_MINUS'));
alter table public.late_reviews add column if not exists basis_izin jsonb;

-- Murni: pembulatan hanya sekali, di nominal akhir. Durasi tidak dibulatkan ke jam.
create or replace function public.calc_potongan_izin(
 p_gaji numeric, p_hari integer, p_menit_shift integer, p_menit_izin integer
) returns integer language plpgsql immutable set search_path = public as $$
begin
 if p_gaji is null or p_gaji < 0 or p_hari is null or p_hari <= 0
    or p_menit_shift is null or p_menit_shift <= 0 or p_menit_izin is null
    or p_menit_izin < 0 or p_menit_izin > p_menit_shift then
   raise exception 'Dasar perhitungan izin tidak valid';
 end if;
 return round(p_gaji / p_hari / p_menit_shift * p_menit_izin)::integer;
end; $$;

create or replace function public._basis_izin_telat(p_user uuid, p_tanggal date, p_masuk time)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare j record; g integer; h integer; m integer; dur integer;
begin
 select * into j from public.get_jadwal_karyawan(p_user,p_tanggal);
 m := (extract(epoch from (j.jam_pulang-j.jam_masuk))/60)::integer;
 if m is null or m <= 0 or p_masuk is null then raise exception 'Jadwal atau jam masuk belum tersedia'; end if;
 -- Hari kerja terjadwal, bukan jumlah hadir; libur hari Minggu tidak dikurangi dua kali.
 select count(*)::integer into h
 from generate_series(date_trunc('month',p_tanggal::timestamp),
   date_trunc('month',p_tanggal::timestamp)+interval '1 month - 1 day',interval '1 day') d
 cross join lateral public.get_jadwal_karyawan(p_user,d::date) s
 where extract(isodow from d) <> 7 and s.jam_pulang > s.jam_masuk
   and not exists(select 1 from public.holidays x where x.tanggal=d::date and x.difasilitasi);
 if h <= 0 then raise exception 'Tidak ada hari kerja pada bulan ini'; end if;
 select s.gaji_bulanan into g from public.profiles p
 cross join lateral public.get_effective_salary_setting(p.id,to_char(p_tanggal,'YYYY-MM'),p.gaji_bulanan,150000) s
 where p.id=p_user;
 if g is null or g <= 0 then raise exception 'Gaji pokok karyawan belum diatur untuk bulan ini'; end if;
 if extract(isodow from p_tanggal)=7 or exists(select 1 from public.holidays where tanggal=p_tanggal and difasilitasi) then
   raise exception 'Izin datang terlambat hanya berlaku pada hari kerja';
 end if;
 dur := least(m,greatest(0,floor(extract(epoch from (p_masuk-j.jam_masuk))/60)::integer));
 return jsonb_build_object('gajiBulanan',g,'hariKerja',h,'menitShift',m,'menitIzin',dur,
   'jadwalMasuk',to_char(j.jam_masuk,'HH24:MI'),'jadwalPulang',to_char(j.jam_pulang,'HH24:MI'),
   'tarifPerJam',g::numeric/h/m*60,'potonganIzin',public.calc_potongan_izin(g,h,m,dur));
end; $$;
revoke all on function public._basis_izin_telat(uuid,date,time) from public,anon,authenticated;

-- Keputusan baru memiliki basis perhitungan yang dibekukan untuk audit.
-- Review warisan tanpa basis tetap memakai perilaku lama sampai ditinjau ulang.
create or replace function public._apply_late_review_to_detail()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.late_reviews%rowtype;
begin
 if new.tipe not in ('TELAT','IZIN_TELAT') then return new; end if;
 select * into r from public.late_reviews where user_id=new.user_id and tanggal=new.tanggal;
 if r.id is not null then
   if r.status_review='IZIN_TELAT_KHUSUS' and r.basis_izin is not null then
     r.basis_izin := public._basis_izin_telat(new.user_id,new.tanggal,new.waktu);
     r.potongan_final := (r.basis_izin->>'potonganIzin')::integer;
     update public.late_reviews set basis_izin=r.basis_izin,potongan_final=r.potongan_final,
       tarif_per_jam=round((r.basis_izin->>'tarifPerJam')::numeric),
       durasi_izin_jam=(r.basis_izin->>'menitIzin')::numeric/60,updated_at=now() where id=r.id;
   end if;
   new.nilai := r.potongan_final;
   new.tipe := case when r.status_review='IZIN_TELAT_KHUSUS' and r.basis_izin is not null then 'IZIN_TELAT' else 'TELAT' end;
   new.keterangan := case when new.tipe='IZIN_TELAT' then
     'Izin datang terlambat '||(r.basis_izin->>'menitIzin')||' menit; '||coalesce(r.alasan,'')
     else split_part(coalesce(new.keterangan,''),' [Review Owner:',1)||' [Review Owner: '||replace(r.status_review,'_',' ')||']' end;
 end if;
 return new;
end; $$;
drop trigger if exists apply_late_review_before_detail on public.attendance_details;
create trigger apply_late_review_before_detail before insert or update of tipe,user_id,tanggal,waktu,nilai
on public.attendance_details for each row execute function public._apply_late_review_to_detail();

-- Ledger bulanan tetap satu sumber; izin adalah potongan upah, bukan jumlah telat.
create or replace function public._total_denda_bulan_ledger(p_user_id uuid,p_bulan_key text)
returns integer language sql stable security definer set search_path = public as $$
 select coalesce(sum(nilai),0)::integer from public.attendance_details
 where user_id=p_user_id and tanggal >= (p_bulan_key||'-01')::date
 and tanggal < (p_bulan_key||'-01')::date+interval '1 month'
 and tipe in ('TELAT','IZIN_TELAT','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL');
$$;

create or replace function public._sync_weekly_izin(p_bulan text)
returns void language sql security definer set search_path = public as $$
 update public.attendance_weekly w set telat=x.telat,total_denda=x.denda,
 status=public.calc_status_mingguan(w.absen,x.telat),updated_at=now()
 from (select d.user_id,d.minggu,count(*) filter(where d.tipe='TELAT')::integer telat,
   coalesce(sum(d.nilai) filter(where d.tipe in ('TELAT','IZIN_TELAT')),0)::integer denda
   from public.attendance_details d where d.minggu in
     (select distinct minggu from public.attendance_details where to_char(tanggal,'YYYY-MM')=p_bulan)
   group by d.user_id,d.minggu) x
 where w.user_id=x.user_id and w.minggu=x.minggu;
$$;
revoke all on function public._sync_weekly_izin(text) from public,anon,authenticated;

-- Patch terukur: pertahankan perbaikan shift/rekap yang sudah ada.
do $patch$
declare def text; next_def text;
begin
 select pg_get_functiondef('public.process_absensi_app_to_rekap(text)'::regprocedure) into def;
 if position('perform public._sync_weekly_izin(p_bulan_key);' in def)=0 then
   next_def := replace(def,'select count(*) into v_rekap_count from _touched_weeks;',
     'perform public._sync_weekly_izin(p_bulan_key); select count(*) into v_rekap_count from _touched_weeks;');
   if next_def=def then raise exception 'Pola rekap berubah; migrasi dibatalkan'; end if;
   execute next_def;
 end if;
 select pg_get_functiondef('public._snapshot_payroll_items(uuid,uuid,text,integer)'::regprocedure) into def;
 if position('POTONGAN_IZIN' in def)=0 then
   next_def := replace(def,$s$case when d.tipe in ('DENDA_SP','DENDA_ANOMALI') then 'DENDA_SP' else d.tipe end$s$,
     $s$case when d.tipe='IZIN_TELAT' then 'POTONGAN_IZIN' when d.tipe in ('DENDA_SP','DENDA_ANOMALI') then 'DENDA_SP' else d.tipe end$s$);
   next_def := replace(next_def,$s$'LEMBUR_LIBUR','ABSEN')$s$,$s$'LEMBUR_LIBUR','ABSEN','IZIN_TELAT')$s$);
   next_def := replace(next_def,$s$pi.tipe in ('DENDA_SP','DENDA_MANUAL')$s$,$s$pi.tipe in ('DENDA_SP','DENDA_MANUAL','POTONGAN_IZIN')$s$);
   if next_def=def then raise exception 'Pola snapshot berubah; migrasi dibatalkan'; end if;
   execute next_def;
 end if;
 select pg_get_functiondef('public.refresh_payroll_from_attendance(uuid)'::regprocedure) into def;
 if position('Refresh basis izin sesuai gaji' in def)=0 then
   next_def := replace(def,'v_hari_kerja := public.calc_hari_kerja_efektif(v_run.bulan);',
     $s$-- Refresh basis izin sesuai gaji/jadwal sebelum mengambil rekap.
     update public.attendance_details set nilai=nilai
       where tipe='IZIN_TELAT' and to_char(tanggal,'YYYY-MM')=v_run.bulan;
     perform public._sync_weekly_izin(v_run.bulan);
     v_hari_kerja := public.calc_hari_kerja_efektif(v_run.bulan);$s$);
   if next_def=def then raise exception 'Pola sinkronisasi payroll berubah; migrasi dibatalkan'; end if;
   execute next_def;
 end if;
end; $patch$;
revoke execute on function public._snapshot_payroll_items(uuid,uuid,text,integer) from public,anon,authenticated;

-- Rincian izin ikut payload Catatan Kehadiran, terpisah dari daftar telat.
do $patch$
declare def text; next_def text;
begin
 select pg_get_functiondef('public.get_absensi_rekap_base(uuid)'::regprocedure) into def;
 if position('detailPotonganIzin' in def)=0 then
   next_def := replace(def,$s$'detailAbsen',$s$,$s$'detailPotonganIzin',coalesce((select jsonb_agg(jsonb_build_object(
     'keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal)
     from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan
     and d.tipe='IZIN_TELAT'),'[]'::jsonb),'detailAbsen',$s$);
   if next_def=def then raise exception 'Pola rincian kehadiran berubah; migrasi dibatalkan'; end if;
   next_def := replace(next_def,$s$('TELAT','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL')$s$,
     $s$('TELAT','IZIN_TELAT','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL')$s$);
   execute next_def;
 end if;
end; $patch$;

-- Satu gaji yang belum diatur tidak boleh memblokir daftar seluruh tim.
create or replace function public._preview_izin_telat(p_user uuid,p_tanggal date,p_masuk time)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 return public._basis_izin_telat(p_user,p_tanggal,p_masuk);
exception when raise_exception then return jsonb_build_object('error',sqlerrm);
end; $$;
revoke all on function public._preview_izin_telat(uuid,date,time) from public,anon,authenticated;

create or replace function public.get_late_reviews(p_status text,p_bulan text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_payroll_admin() then raise exception 'Akses ditolak' using errcode='42501'; end if;
 if coalesce(p_bulan,'ALL') <> 'ALL' and p_bulan !~ '^\d{4}-\d{2}$' then raise exception 'Bulan tidak valid'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',d.id,'nama',p.nama,'userId',d.user_id,'tanggal',d.tanggal,'bulan',to_char(d.tanggal,'YYYY-MM'),
   'jamMasuk',to_char(d.waktu,'HH24:MI'),'jadwalMasuk',b.v->>'jadwalMasuk',
   'menitTelat',(b.v->>'menitIzin')::integer,'statusReview',coalesce(r.status_review,'MENUNGGU'),
   'dendaNormal',coalesce(r.denda_normal,d.nilai),'tarifPerJam',b.v->'tarifPerJam',
   'potonganFinal',coalesce(r.potongan_final,d.nilai),'basisIzin',b.v,
   'alasan',coalesce(r.alasan,''),'catatan',coalesce(r.catatan,''),
   'terkunci',exists(select 1 from public.payroll_runs pr where pr.bulan=to_char(d.tanggal,'YYYY-MM') and pr.status='PUBLISHED')
 ) order by d.tanggal desc,p.nama),'[]'::jsonb) into result
 from public.attendance_details d join public.profiles p on p.id=d.user_id
 left join public.late_reviews r on r.user_id=d.user_id and r.tanggal=d.tanggal
 cross join lateral (select public._preview_izin_telat(d.user_id,d.tanggal,d.waktu) v) b
 where d.tipe in ('TELAT','IZIN_TELAT')
 and (coalesce(p_bulan,'ALL')='ALL' or to_char(d.tanggal,'YYYY-MM')=p_bulan)
 and (coalesce(p_status,'MENUNGGU')='ALL' or coalesce(r.status_review,'MENUNGGU')=p_status);
 return result;
end; $$;

create or replace function public.review_late_attendance(
 p_attendance_detail_id uuid,p_jenis text,p_durasi numeric,p_alasan text,p_catatan text,p_reviewer_name text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.attendance_details%rowtype; old_review public.late_reviews%rowtype;
 b jsonb; st text; amount integer; normal integer; v_bulan text; m record; run record; reviewer text;
begin
 if auth.uid() is null or not public.is_payroll_admin() then raise exception 'Hanya Owner/Finance boleh mengatur izin' using errcode='42501'; end if;
 -- Serialize review requests; lock payroll rows before checking published state.
 perform pg_advisory_xact_lock(660066);
 select * into d from public.attendance_details where id=p_attendance_detail_id and tipe in ('TELAT','IZIN_TELAT') for update;
 if d.id is null then raise exception 'Data berubah. Muat ulang catatan kehadiran.'; end if;
 v_bulan := to_char(d.tanggal,'YYYY-MM');
 perform 1 from public.payroll_runs order by public.payroll_runs.bulan for update;
 if exists(select 1 from public.payroll_runs pr where pr.bulan=v_bulan and pr.status='PUBLISHED') then
   raise exception 'Slip bulan ini sudah terbit. Batalkan penerbitannya sebelum mengubah izin.';
 end if;
 select * into old_review from public.late_reviews where user_id=d.user_id and tanggal=d.tanggal;
 normal := coalesce(old_review.denda_normal,d.nilai);
 b := public._basis_izin_telat(d.user_id,d.tanggal,d.waktu);
 if upper(p_jenis)='IZIN_KHUSUS' then
   if nullif(btrim(p_alasan),'') is null then raise exception 'Isi alasan izin terlebih dahulu'; end if;
   if (b->>'menitIzin')::integer <= 0 then raise exception 'Jam masuk tidak melewati jadwal'; end if;
   st := 'IZIN_TELAT_KHUSUS'; amount := (b->>'potonganIzin')::integer;
 elsif upper(p_jenis)='NORMAL' then st := 'TELAT_NORMAL'; amount := normal;
 elsif upper(p_jenis)='BEBAS' then st := 'BEBAS_POTONGAN'; amount := 0;
 else raise exception 'Keputusan tidak valid'; end if;
 if old_review.status_review=st and old_review.basis_izin=b
   and coalesce(old_review.alasan,'')=btrim(coalesce(p_alasan,''))
   and old_review.potongan_final=amount then
   return jsonb_build_object('success',true,'msg','Keputusan ini sudah tersimpan.','potonganFinal',amount);
 end if;
 select nama into reviewer from public.profiles where id=auth.uid();
 -- p_durasi/p_reviewer_name retained for old client compatibility, never trusted.
 insert into public.late_reviews(user_id,tanggal,status_review,durasi_izin_jam,alasan,catatan,
   denda_normal,tarif_per_jam,potongan_final,reviewed_by,reviewed_by_name,basis_izin)
 values(d.user_id,d.tanggal,st,case when st='IZIN_TELAT_KHUSUS' then (b->>'menitIzin')::numeric/60 else 0 end,
   nullif(btrim(p_alasan),''),nullif(btrim(p_catatan),''),normal,round((b->>'tarifPerJam')::numeric),amount,auth.uid(),reviewer,b)
 on conflict(user_id,tanggal) do update set status_review=excluded.status_review,durasi_izin_jam=excluded.durasi_izin_jam,
   alasan=excluded.alasan,catatan=excluded.catatan,potongan_final=excluded.potongan_final,
   tarif_per_jam=excluded.tarif_per_jam,basis_izin=excluded.basis_izin,
   reviewed_by=excluded.reviewed_by,reviewed_by_name=excluded.reviewed_by_name,reviewed_at=now(),updated_at=now();
 update public.attendance_details set tipe='TELAT',nilai=amount,
   keterangan='Masuk '||to_char(d.waktu,'HH24:MI')||', telat '||(b->>'menitIzin')||' menit'
 where id=d.id;
 -- Re-evaluate consequences chronologically, without rebuilding imported/raw attendance.
 for m in select distinct to_char(tanggal,'YYYY-MM') k from public.attendance_details
   where tanggal >= (least(v_bulan,public._minggu_ke_bulan(d.minggu))||'-01')::date order by k loop
   if exists(select 1 from public.payroll_runs pr where pr.bulan=m.k and pr.status='PUBLISHED') then continue; end if;
   perform public._sync_weekly_izin(m.k);
   delete from public.warning_history where public.warning_history.bulan=m.k and tipe_sp in ('SP1','SP2','SP3');
   delete from public.attendance_details where to_char(tanggal,'YYYY-MM')=m.k and tipe='DENDA_SP';
   perform public.process_sp_for_month(m.k);
   perform public.evaluasi_sanksi_berulang(m.k);
 end loop;
 -- SB bulan kemudian dapat membatalkan sanksi bulan sebelumnya. Refresh hanya
 -- setelah seluruh evaluasi selesai, termasuk draf sebelumnya yang terdampak.
 for run in select id from public.payroll_runs pr where pr.status<>'PUBLISHED' loop
   perform public.refresh_payroll_from_attendance(run.id);
 end loop;
 perform public.hitung_bintang(d.user_id);
 insert into public.audit_logs(actor,action,target,before_data,after_data,catatan)
 values(auth.uid(),'REVIEW_LATE_ATTENDANCE',d.id::text,to_jsonb(old_review),
   jsonb_build_object('status',st,'basis',b,'potonganFinal',amount),p_alasan);
 insert into public.notifications(user_id,judul,isi,tipe,menu)
 values(d.user_id,'Keputusan kehadiran diperbarui',d.tanggal::text||': '||replace(st,'_',' ')||'. Potongan Rp '||amount,'INFO','s-catatan-kehadiran');
 return jsonb_build_object('success',true,'statusReview',st,'potonganFinal',amount,
   'msg','Keputusan tersimpan. Kehadiran dan penggajian telah diselaraskan.');
end; $$;
revoke execute on function public.get_late_reviews(text,text) from public,anon;
revoke execute on function public.review_late_attendance(uuid,text,numeric,text,text,text) from public,anon;
grant execute on function public.get_late_reviews(text,text) to authenticated,service_role;
grant execute on function public.review_late_attendance(uuid,text,numeric,text,text,text) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
