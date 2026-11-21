import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('app/js/app.js'),payroll=read('app/js/payroll.js');
const context=vm.createContext({console,Date,Number,Math,String,Array,Object,parseInt,isNaN,
 esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')});
function loadFunction(source,name) {
 const start=source.indexOf('function '+name+'(');
 assert.ok(start>=0,name);
 const end=source.indexOf('\n}',start)+2;
 vm.runInContext(source.slice(start,end),context);
}
for(const name of ['attendanceTimeToMinutes','attendanceDayIsLate'])loadFunction(app,name);
for(const name of ['payrollItemIsDeduction','payrollItemLabel','payrollLeaveDeduction'])loadFunction(payroll,name);
vm.runInContext(read('app/js/late-leave.js'),context);
assert.equal(context.attendanceDayIsLate({masuk:'09:28',jadwalMasuk:'08:00',telat:true,izinTelat:true},new Date('2026-09-02')),false);
assert.equal(context.attendanceDayIsLate({masuk:'09:28',jadwalMasuk:'08:00'},new Date('2026-09-02')),true);
assert.equal(context.attendanceDayIsLate({masuk:'14:00',jadwalMasuk:'14:00'},new Date('2026-09-02')),false);
assert.equal(context.payrollLeaveDeduction([{tipe:'POTONGAN_IZIN',nominal:19179},{tipe:'DENDA_TELAT',nominal:90000}]),19179);
assert.equal(context.payrollItemIsDeduction('POTONGAN_IZIN',19179),true);
assert.equal(context.payrollItemLabel('POTONGAN_IZIN'),'Potongan izin datang terlambat');
const row={id:'fixture',nama:'<img src=x onerror=alert(1)>',tanggal:'2026-09-02',jamMasuk:'09:28',jadwalMasuk:'08:00',menitTelat:88,statusReview:'MENUNGGU',potonganFinal:90000,basisIzin:{potonganIzin:19179},alasan:'izin keluarga'};
const html=context.renderLateLeaveReviews([row]);
assert.ok(html.includes('Rp 19.179'));
assert.ok(html.includes('&lt;img'));
assert.ok(!html.includes('<img'));
assert.ok(context.renderLateLeaveReviews([{...row,terkunci:true}]).includes('Slip sudah terbit'));
assert.ok(!context.renderLateLeaveReviews([{...row,terkunci:true}]).includes('onclick'));
// Adapt real backend query fixture to ensure accepted leave is not re-marked late.
const fixtureSource=fs.readFileSync(new URL('./attendance-matrix.test.mjs',import.meta.url),'utf8');
assert.match(fixtureSource,/const fixtures/);
const backend=read('app/js/real-backend.js');
assert.match(backend,/row\.tipe === 'IZIN_TELAT'\) cell\.izinTelat = true/);
assert.match(backend,/!cell\.izinTelat && actual !== null/);
console.log('izin-kedatangan: UI, escaping, leave classification and payslip deductions passed');
