-- Pengajuan terpisah dari keputusan: menunggu/ditolak tidak mengubah ledger.
begin;
create table if not exists public.late_leave_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id), tanggal date not null,
 alasan text not null check(length(btrim(alasan)) between 1 and 1000),
 status text not null default 'MENUNGGU' check(status in ('MENUNGGU','DISETUJUI','DITOLAK')),
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id), unique(user_id,tanggal)
);
alter table public.late_leave_requests enable row level security;
revoke all on public.late_leave_requests from public,anon,authenticated;

create or replace function public.submit_late_leave_request(p_tanggal date,p_alasan text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rid uuid; jam time; jadwal record; nama text;
begin
 if uid is null then raise exception 'Silakan login dahulu' using errcode='42501'; end if;
 if not exists(select 1 from profiles where id=uid and status='AKTIF') then raise exception 'Akun belum aktif'; end if;
 if p_tanggal is null or p_tanggal>(now() at time zone 'Asia/Jakarta')::date then raise exception 'Tanggal belum terjadi'; end if;
 if nullif(btrim(p_alasan),'') is null or length(p_alasan)>1000 then raise exception 'Isi alasan antara 1 sampai 1000 karakter'; end if;
 perform pg_advisory_xact_lock(660066);
 if exists(select 1 from payroll_runs where bulan=to_char(p_tanggal,'YYYY-MM') and status='PUBLISHED') then raise exception 'Slip bulan ini sudah terbit. Hubungi Owner.'; end if;
 if exists(select 1 from late_reviews where user_id=uid and tanggal=p_tanggal) then raise exception 'Tanggal ini sudah diputuskan. Hubungi Owner untuk perubahan.'; end if;
 select waktu into jam from attendance_details where user_id=uid and tanggal=p_tanggal and tipe='TELAT' limit 1;
 if jam is null then
   select e.jam into jam from attendance_events e where e.user_id=uid and e.tanggal=p_tanggal and e.tipe='MASUK' and e.status='DITERIMA' order by e.created_at desc limit 1;
 end if;
 select * into jadwal from get_jadwal_karyawan(uid,p_tanggal);
 if jam is null or jam<=jadwal.jam_masuk or extract(isodow from p_tanggal)=7
 or exists(select 1 from holidays where tanggal=p_tanggal and difasilitasi) then raise exception 'Pengajuan hanya untuk absensi masuk terlambat yang diterima pada hari kerja'; end if;
 insert into late_leave_requests(user_id,tanggal,alasan) values(uid,p_tanggal,btrim(p_alasan))
 on conflict(user_id,tanggal) do nothing returning id into rid;
 if rid is null then return jsonb_build_object('success',true,'msg','Pengajuan tanggal ini sudah tercatat. Lihat status di kalender.'); end if;
 select p.nama into nama from profiles p where p.id=uid;
 insert into notifications(user_id,judul,isi,tipe,menu)
 select id,'Pengajuan izin kedatangan',nama||' · '||p_tanggal||': '||btrim(p_alasan),'INFO','s-review-telat'
 from profiles where bagian='Owner' and status='AKTIF';
 insert into audit_logs(actor,action,target,after_data) values(uid,'SUBMIT_LATE_LEAVE',rid::text,jsonb_build_object('tanggal',p_tanggal,'alasan',btrim(p_alasan)));
 return jsonb_build_object('success',true,'msg','Pengajuan dikirim ke Owner. Aturan telat tetap berlaku sampai disetujui.');
end; $$;

-- Pilihan Izin pada popup kamera lama kini juga mengirim pengajuan, bukan approval.
create or replace function public.catat_keterangan_absen(p_tanggal date,p_catatan text)
returns jsonb language sql security definer set search_path=public as $$
 select public.submit_late_leave_request(p_tanggal,p_catatan);
$$;

create or replace function public.get_late_leave_calendar(p_bulan text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Silakan login dahulu' using errcode='42501'; end if;
 if p_bulan!~'^\d{4}-\d{2}$' then raise exception 'Bulan tidak valid'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('userId',coalesce(r.user_id,q.user_id),
 'tanggal',coalesce(r.tanggal,q.tanggal),'alasan',coalesce(q.alasan,r.alasan,''),
 'catatanOwner',coalesce(r.alasan,''),'status',case when r.id is not null then
 case r.status_review when 'IZIN_TELAT_KHUSUS' then 'DISETUJUI' when 'BEBAS_POTONGAN' then 'BEBAS_POTONGAN' else 'DITOLAK' end else q.status end))
 from late_reviews r full join late_leave_requests q on q.user_id=r.user_id and q.tanggal=r.tanggal
 where to_char(coalesce(r.tanggal,q.tanggal),'YYYY-MM')=p_bulan
 and (coalesce(r.user_id,q.user_id)=auth.uid() or is_payroll_admin())),'[]'::jsonb);
end; $$;

create or replace function public.get_pending_late_leave_requests(p_bulan text default 'ALL')
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not is_payroll_admin() then raise exception 'Akses ditolak' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'requestId',q.id,'userId',q.user_id,'nama',p.nama,
 'tanggal',q.tanggal,'alasan',q.alasan,'statusReview','MENUNGGU','terkunci',exists(select 1 from payroll_runs where bulan=to_char(q.tanggal,'YYYY-MM') and status='PUBLISHED')) order by q.created_at)
 from late_leave_requests q join profiles p on p.id=q.user_id where q.status='MENUNGGU'
 and (p_bulan='ALL' or to_char(q.tanggal,'YYYY-MM')=p_bulan)),'[]'::jsonb);
end; $$;

-- Keputusan langsung Owner/Finance juga menutup pengajuan pada tanggal yang sama.
create or replace function public._resolve_late_leave_request()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 update late_leave_requests set status=case when new.status_review='IZIN_TELAT_KHUSUS' then 'DISETUJUI' else 'DITOLAK' end,
 reviewed_at=now(),reviewed_by=auth.uid() where user_id=new.user_id and tanggal=new.tanggal;
 return new;
end; $$;
drop trigger if exists resolve_late_leave_request on public.late_reviews;
create trigger resolve_late_leave_request after insert or update of status_review on public.late_reviews
for each row execute function public._resolve_late_leave_request();

create or replace function public.decide_late_leave_request(p_id uuid,p_approve boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare q late_leave_requests%rowtype; did uuid; result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from profiles where id=auth.uid() and bagian='Owner' and status='AKTIF') then raise exception 'Hanya Owner dapat memutuskan pengajuan' using errcode='42501'; end if;
 if p_approve is null then raise exception 'Pilih keputusan'; end if;
 perform pg_advisory_xact_lock(660066);
 select * into q from late_leave_requests where id=p_id for update;
 if q.id is null then raise exception 'Pengajuan tidak ditemukan'; end if;
 if q.status<>'MENUNGGU' then return jsonb_build_object('success',true,'msg','Pengajuan sudah diputuskan.'); end if;
 select id into did from attendance_details where user_id=q.user_id and tanggal=q.tanggal and tipe in ('TELAT','IZIN_TELAT') limit 1;
 if did is null then raise exception 'Proses ke Rekap Resmi untuk bulan ini di Catatan Kehadiran, lalu tinjau pengajuan kembali.'; end if;
 result:=review_late_attendance(did,case when p_approve then 'IZIN_KHUSUS' else 'NORMAL' end,0,q.alasan,'','');
 return result;
end; $$;
revoke all on function public._resolve_late_leave_request() from public,anon,authenticated;
revoke all on function public.submit_late_leave_request(date,text),public.get_late_leave_calendar(text),public.get_pending_late_leave_requests(text),public.decide_late_leave_request(uuid,boolean) from public,anon;
grant execute on function public.submit_late_leave_request(date,text),public.get_late_leave_calendar(text),public.get_pending_late_leave_requests(text),public.decide_late_leave_request(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
