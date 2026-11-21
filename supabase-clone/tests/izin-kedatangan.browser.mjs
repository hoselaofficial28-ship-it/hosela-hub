// Local UI fixture only; blocks all network access. Uses existing Playwright.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const width of [375,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',route=>route.abort());
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main style="width:calc(100% - 32px);margin:16px" id="fixture"></main></body></html>');
  await page.addStyleTag({content:fs.readFileSync(new URL('../app/css/style.css',import.meta.url),'utf8')});
  await page.addScriptTag({content:`var sent=[],toasts=[];
   function esc(s){return String(s==null?'':s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
   function gasCall(action,args,ok){sent.push({action,args});ok({success:true,msg:'Tersimpan'});}
   function showToast(s){toasts.push(s);} function clearAttendanceMatrixCache(){} function loadReviewTelat(){} function loadAttendanceMatrix(){}
  `});
  await page.addScriptTag({content:fs.readFileSync(new URL('../app/js/late-leave.js',import.meta.url),'utf8')});
  await page.evaluate(()=>{
   const row={id:'fixture-id',nama:'Karyawan Contoh',tanggal:'2026-09-18',jamMasuk:'09:28',jadwalMasuk:'08:00',menitTelat:88,statusReview:'MENUNGGU',potonganFinal:90000,alasan:'',basisIzin:{potonganIzin:19179,menitIzin:88,hariKerja:26,menitShift:600,gajiBulanan:3400000}};
   document.getElementById('fixture').innerHTML=renderLateLeaveReviews([row]);
  });
  await page.getByRole('button',{name:'Jadikan Izin / Tinjau'}).click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('#late-leave-kind').inputValue(),'IZIN_KHUSUS');
  const box=await page.getByRole('dialog').boundingBox();
  assert.ok(box.x>=0 && box.x+box.width<=width,`dialog fits ${width}`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no overflow ${width}`);
  await page.getByRole('button',{name:'Simpan Keputusan'}).click();
  assert.equal(await page.locator('#late-leave-error').textContent(),'Isi alasan izin terlebih dahulu.');
  assert.equal(await page.evaluate(()=>sent.length),0,'invalid form does not save');
  await page.getByLabel('Alasan / keterangan').fill('Izin keluarga');
  if(process.env.UI_ARTIFACT_DIR) await page.screenshot({path:process.env.UI_ARTIFACT_DIR+'/izin-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Simpan Keputusan'}).click();
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.deepEqual(await page.evaluate(()=>sent[0]),{action:'reviewIzinTelat',args:['fixture-id','IZIN_KHUSUS',0,'Izin keluarga','','']});
  await page.getByRole('button',{name:'Jadikan Izin / Tinjau'}).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.close();
 }
 console.log('Browser fixture: 375px and 1440px, dialog fit, form validation, save and Escape passed');
} finally {await browser.close();}
