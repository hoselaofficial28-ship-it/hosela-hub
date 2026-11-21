// Local PostgreSQL/WASM only. No URL, key, or connection to Supabase production.
// Set PGLITE_MODULE to the separately installed test tool's dist/index.js.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const pglitePath = process.env.PGLITE_MODULE || 'C:/Users/WINDOW-MASTER/Documents/Codex/hosela-test-tools/node_modules/@electric-sql/pglite/dist/index.js';
if (!fs.existsSync(pglitePath)) {
  console.log('SKIP: modul PGlite tidak ditemukan. Set PGLITE_MODULE=<path dist/index.js> untuk menjalankan tes ini.');
  process.exit(0);
}
const { PGlite } = await import(pathToFileURL(pglitePath).href);
const db = new PGlite();
let stage = 'bootstrap';
let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
try {
 await db.exec(`set check_function_bodies=off;
 create role anon; create role authenticated; create role service_role;
 create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',encrypted_password text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
 create function auth.role() returns text language sql stable as $$ select current_user::text $$;`);
 const migrations = new URL('../supabase/migrations/',import.meta.url);
 // Storage/Telegram/import cleanup are separate services and not used by this feature.
 const excluded = new Set([38,47,50,51,52,54]);
 for(const name of fs.readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort()) {
  const n=Number(name.slice(8,14));
  if(excluded.has(n)) continue;
  if(n===66) await db.exec('set check_function_bodies=on');
  stage=name;
  const sql=fs.readFileSync(new URL(name,migrations),'utf8').replace('create extension if not exists pgcrypto;','');
  await db.exec(sql);
 }
 stage='repeat migration';
 await db.exec(fs.readFileSync(new URL('20261121000066_izin_datang_terlambat.sql',migrations),'utf8'));
 stage='formula boundaries';
 for(const [g,h,s,m,expected] of [[2600000,26,600,60,10000],[2600000,26,600,120,20000],
 [3400000,26,600,88,19179],[3400000,22,600,88,22667],[3400000,26,480,88,23974],
 [3400000,26,600,1,218],[3400000,26,600,0,0],[3400000,26,600,600,130769]]) {
   check(await scalar(`select public.calc_potongan_izin(${g},${h},${s},${m})`),expected,`${h} days/${s} min/${m} leave`);
 }
 const owner='00000000-0000-4000-8000-000000000001',user='00000000-0000-4000-8000-000000000002';
 stage='fixture';
 await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values
 ('${owner}','owner@example.invalid','{"nama":"Owner Fixture"}'),('${user}','staff@example.invalid','{"nama":"Staff Fixture"}');
 update profiles set bagian='Owner',jabatan='Owner',status='AKTIF' where id='${owner}';
 update profiles set bagian='Gudang',jabatan='Picker',status='AKTIF',gaji_bulanan=3400000 where id='${user}';
 select set_config('request.jwt.claim.sub','${owner}',false);
 insert into salary_settings(user_id,bulan,gaji_bulanan,bonus_kerajinan) values('${user}','2026-09',3400000,200000);
 insert into attendance_details(user_id,minggu,tanggal,waktu,tipe,keterangan,nilai)
 select '${user}',to_char(t,'IYYY-"W"IW'),t,'09:28','TELAT','Fixture late',90000
 from unnest(array['2026-09-02'::date,'2026-09-04','2026-09-08','2026-09-10','2026-09-15']) t;
 insert into attendance_details(user_id,minggu,tanggal,waktu,tipe,keterangan,nilai)
 select user_id,minggu,tanggal,waktu,'HADIR','Fixture present',0 from attendance_details where tipe='TELAT';
 insert into attendance_weekly(user_id,minggu,hadir,telat)
 select user_id,minggu,5,5 from attendance_details group by user_id,minggu;`);
 const detail=await scalar(`select id from attendance_details where user_id='${user}' and tanggal='2026-09-02' and tipe='TELAT'`);
 stage='preview';
 const rows=await scalar("select get_late_reviews('ALL','2026-09')");
 check(rows.length,5,'all late records visible');
 check(rows[0].basisIzin.hariKerja,26,'September scheduled days');
 check(rows[0].basisIzin.menitShift,600,'morning shift');
 stage='review';
 const review=()=>scalar(`select review_late_attendance('${detail}','IZIN_KHUSUS',999,'Izin fixture','','spoofed name')`);
 check((await review()).success,true,'approval');
 check(await scalar(`select tipe from attendance_details where id='${detail}'`),'IZIN_TELAT','classified as leave');
 check(await scalar(`select nilai from attendance_details where id='${detail}'`),19179,'minute exact deduction');
 check(await scalar(`select count(*)::int from attendance_details where tipe='TELAT' and user_id='${user}'`),4,'not five late events');
 check(await scalar(`select count(*)::int from attendance_details where tipe='DENDA_SP' and user_id='${user}'`),0,'no monthly late fine after approval');
 check(await scalar(`select bonus_kerajinan from get_rekap_bulanan_semua('2026-09') where user_id='${user}'`),200000,'diligence retained');
 check(await scalar(`select reviewed_by_name from late_reviews where user_id='${user}'`),'Owner Fixture','actor server-side');
 const before=await scalar('select count(*)::int from audit_logs');
 await review();
 check(await scalar('select count(*)::int from audit_logs'),before,'idempotent retry');
 stage='payroll';
 const draft=await scalar("select create_payroll_draft('2026-09')");
 check(draft.success,true,'draft creation');
 const pid=await scalar(`select id from payroll_details where user_id='${user}'`);
 check(await scalar(`select sum(nominal)::int from payroll_items where payroll_detail_id='${pid}' and tipe='POTONGAN_IZIN'`),19179,'separate slip item');
 check(await scalar(`select total_denda from payroll_details where id='${pid}'`),379179,'four late fines plus leave, no duplication');
 stage='cancel';
 check((await scalar(`select review_late_attendance('${detail}','NORMAL',0,'Batal izin','','')`)).success,true,'restore normal');
 check(await scalar(`select tipe from attendance_details where id='${detail}'`),'TELAT','normal restored');
 check(await scalar(`select nilai from attendance_details where id='${detail}'`),90000,'normal amount restored');
 check(await scalar(`select count(*)::int from payroll_items where payroll_detail_id='${pid}' and tipe='POTONGAN_IZIN'`),0,'leave removed from draft');
 check(await scalar(`select total_denda from payroll_details where id='${pid}'`),500000,'five normal fines plus one monthly sanction');
 stage='re-approve and reprocess';
 await review();
 check(await scalar(`select count(*)::int from payroll_items where payroll_detail_id='${pid}' and tipe='POTONGAN_IZIN'`),1,'one leave item after reapproval');
 const recap=await scalar(`select get_absensi_rekap('${user}')`);
 check(recap.data.find(r=>r.bulan==='2026-09').totalTelat,4,'recap count agrees with payroll');
 check(recap.data.find(r=>r.bulan==='2026-09').detailPotonganIzin[0].nilai,19179,'recap exposes leave separately');
 await db.exec(`update attendance_details set tipe='TELAT',nilai=90000 where id='${detail}';`);
 check(await scalar(`select tipe from attendance_details where id='${detail}'`),'IZIN_TELAT','reprocessing keeps approved decision');
 check(await scalar(`select nilai from attendance_details where id='${detail}'`),19179,'reprocessing does not restore normal fine');
 stage='shift and calendar';
 await db.exec(`insert into employee_shift_overrides(user_id,tanggal,shift_id,shift_name,jam_masuk,jam_pulang)
 values('${user}','2026-09-18',(select id from work_shift_templates where kode='SIANG'),'Siang','14:00','22:00');`);
 const afternoon=await scalar(`select _basis_izin_telat('${user}','2026-09-18','15:28')`);
 check(afternoon.menitShift,480,'afternoon hours');
 check(afternoon.potonganIzin,23974,'afternoon minute rate');
 await db.exec("insert into holidays(tanggal,nama,difasilitasi) values('2026-09-06','Sunday holiday',true);");
 check((await scalar(`select _basis_izin_telat('${user}','2026-09-02','09:28')`)).hariKerja,26,'Sunday holiday not double subtracted');
 await db.exec("insert into holidays(tanggal,nama,difasilitasi) values('2026-09-21','Weekday holiday',true);");
 check((await scalar(`select _basis_izin_telat('${user}','2026-09-02','09:28')`)).hariKerja,25,'weekday holiday deducted once');
 stage='salary change refresh';
 await db.exec(`update salary_settings set gaji_bulanan=3900000 where user_id='${user}';`);
 await scalar(`select refresh_payroll_from_attendance((select payroll_run_id from payroll_details where id='${pid}'))`);
 check(await scalar(`select nominal from payroll_items where payroll_detail_id='${pid}' and tipe='POTONGAN_IZIN'`),22880,'refresh uses current wage and working days');
 stage='published guard';
 await db.exec("update payroll_runs set status='PUBLISHED';");
 await assert.rejects(review,/sudah terbit/); checks++;
 const publishedBefore=await scalar(`select to_jsonb(p) from payroll_details p where id='${pid}'`);
 check((await scalar(`select refresh_payroll_from_attendance((select payroll_run_id from payroll_details where id='${pid}'))`)).success,false,'published refresh rejected');
 check(await scalar(`select to_jsonb(p) from payroll_details p where id='${pid}'`),publishedBefore,'published snapshot unchanged');
 stage='unauthorized user';
 await db.exec(`select set_config('request.jwt.claim.sub','${user}',false);`);
 await assert.rejects(review,/Hanya Owner\/Finance/); checks++;
 await assert.rejects(()=>scalar("select get_late_reviews('ALL','2026-09')"),/Akses ditolak/); checks++;
 check(await scalar("select has_function_privilege('authenticated','public._snapshot_payroll_items(uuid,uuid,text,integer)','execute')"),false,'internal snapshot cannot be called by client');
 console.log(`izin-kedatangan integration: ${checks} assertions passed`);
} catch(e) { console.error('FAILED at '+stage+': '+e.message+'\n'+(e.where || '')+'\n'+(e.stack?.split('\n').slice(0,3).join('\n') || '')); process.exitCode=1; }
finally { await db.close(); }
