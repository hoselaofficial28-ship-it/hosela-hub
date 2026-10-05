# API Parity Manifest

Hasil audit statis pada 5 Oktober 2026: frontend memiliki 68 pemanggilan `gasCall` bernama tetap. `ADA` berarti memiliki case pada dispatcher `handleAPI`; `GAP` berarti UI memanggilnya tetapi case dispatcher aktif tidak ditemukan.

**Update 2026-10-05 (audit mendalam)**: seluruh 9 `GAP` di bawah sudah diinvestigasi tuntas — dikonfirmasi ulang nol implementasi di `gas/Code.gs` maupun seluruh arsip (`gas-backup`/`gas-paste`/`gas-split`). Kontrak lengkap (payload, response, UI pemicu, draft rancangan RPC) ada di [07-DATA-DICTIONARY.md §6](07-DATA-DICTIONARY.md). Keputusan Ko untuk 3 dari 9 aksi (sandi saat approve, hapus-vs-simpan saat tolak) tercatat di `DECISION-LOG.md`.

| Aksi frontend | Dispatcher GAS |
|---|---|
| `addIde` | ADA |
| `addKaryawanBaru` | GAP |
| `addLibur` | ADA |
| `addPengumuman` | ADA |
| `addSanksiManual` | ADA |
| `approveIzin` | ADA |
| `approveRegistrasi` | GAP |
| `batalSanksiManual` | ADA |
| `confirmPayroll` | ADA |
| `createPayrollDraft` | ADA |
| `daftarAkun` | GAP |
| `deactivateSalaryUser` | ADA |
| `gantiPIN` | ADA |
| `getAbsensiCameraToday` | ADA |
| `getAbsensiRekap` | ADA |
| `getAllAbsensiRekap` | ADA |
| `getAllUsers` | ADA |
| `getAnomaliPending` | ADA |
| `getDaftarOptions` | GAP |
| `getHomeData` | ADA |
| `getIde` | ADA |
| `getIzinKaryawan` | ADA |
| `getIzinPending` | ADA |
| `getIzinPendingCount` | ADA |
| `getIzinTelatReview` | GAP |
| `getJobdeskByJabatan` | ADA |
| `getJobdeskList` | ADA |
| `getKalenderLibur` | ADA |
| `getKPILaporan` | ADA |
| `getKPITemplate` | ADA |
| `getNotifikasi` | ADA |
| `getPapanPeringkat` | ADA |
| `getPayrollDetail` | ADA |
| `getPayrollEmployeeSlip` | ADA |
| `getPayrollEmployeeSlipDetail` | ADA |
| `getPayrollPreview` | ADA |
| `getPengaturan` | ADA |
| `getPengumuman` | ADA |
| `getPeraturan` | ADA |
| `getRegistrasiPending` | GAP |
| `getRekapBulananSemua` | ADA |
| `getSalaryUsers` | ADA |
| `getSanksiManual` | ADA |
| `getStaffByBagian` | ADA |
| `hapusLibur` | GAP |
| `hapusNotifikasi` | ADA |
| `hapusSemuaNotifikasi` | ADA |
| `importAbsensiUploadToApp` | ADA |
| `konfirmasiAnomali` | ADA |
| `nonaktifkanUser` | ADA |
| `ping` | ADA |
| `processAbsensiAppToRekap` | ADA |
| `processAbsensiUpload` | ADA |
| `publishPayroll` | ADA |
| `reviewIzinTelat` | GAP |
| `submitAbsensiCamera` | ADA |
| `submitIzin` | ADA |
| `submitKPILaporan` | ADA |
| `tandaiDibaca` | ADA |
| `tandaiMenuDibaca` | ADA |
| `tolakRegistrasi` | GAP |
| `triggerNotifPeraturan` | ADA |
| `updateAbsensiMatrixDay` | ADA |
| `updateEmail` | ADA |
| `updatePayrollAdjustment` | ADA |
| `updateSalaryUsersBatch` | ADA |
| `updateUserSalary` | ADA |
| `validateLogin` | ADA |

Dispatcher juga memiliki aksi yang dapat dipanggil secara dinamis atau tidak tampak pada pencarian literal, termasuk `getAbsensiMatrix`, `getAbsensiMatrixUser`, `getUserProfile`, `getNotifCountByMenu`, `getSPHistory`, `hitungBintang`, `notifPeraturanBaru`, dan endpoint debug. Audit runtime/network tetap wajib; tabel ini bukan pengganti contract test.

**Temuan tambahan dari audit mendalam** (jangan ikut di-port ke clone):
- `validatePIN(pin)` (`gas/Code.gs:135`) — dead code, selalu `{success:false}`, nol pemanggil. Dispatcher case `'validatePIN'` (`gas/Code.gs:38`) adalah alias legacy yang sebenarnya memanggil `validateLogin` — dua hal bernama sama, tidak saling terhubung.
- `hapusAbsenDetail` (`gas/Code.gs:4463`) — dead code, nol pemanggil di seluruh file.
- `getNotifCountByMenu` terdaftar di dispatcher (`gas/Code.gs:101`) tapi **tidak pernah dipanggil langsung dari frontend** — hanya dipakai internal oleh `getHomeData`.
- Frontend `gasCall` (`js/app.js:570-650`) **tidak pernah memeriksa field `.error`** pada response sukses — akar penyebab beberapa aksi GAP menampilkan "toast sukses palsu" atau pesan error yang menyamarkan sebab asli (detail per-aksi di 07-DATA-DICTIONARY.md §6). Client clone wajib selalu cek `.success` eksplisit.

Untuk setiap aksi, implementasi Supabase harus mencatat:

- role yang boleh menjalankan;
- input dan validasi;
- bentuk response sukses/error;
- tabel yang dibaca/ditulis;
- side effect notifikasi/email/Drive/audit;
- aturan idempotency dan transaksi;
- fixture serta test parity.
