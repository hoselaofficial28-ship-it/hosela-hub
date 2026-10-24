# Mulai di Sini

> **Status aktif 24 Oktober 2026:** implementasi produksi sudah memakai Supabase
> untuk database dan bucket privat `attendance-photos` untuk foto. Google Drive
> dan Firebase hanya tersisa sebagai riwayat rancangan. Baca
> `11-STATUS-PRODUKSI.md` sebelum memakai dokumen perencanaan di bawah.

## Sasaran

Membuat Hosela Hub versi Supabase tanpa kehilangan perilaku aplikasi yang sekarang. Backend data berpindah dari Apps Script/Spreadsheet ke Supabase. Implementasi aktif menyimpan foto absensi kamera dan bukti sakit di Supabase Storage privat.

## Sumber kebenaran saat ini

| Bagian | Sumber |
|---|---|
| Struktur layar | `index.html` |
| Tampilan mobile dan PC | `css/style.css` |
| Navigasi, login, absensi, KPI, izin, notifikasi | `js/app.js` |
| Pengaturan gaji, payroll, slip, PDF | `js/payroll.js` |
| Rumus dan proses backend | `gas/Code.gs` |
| Kode GAS siap tempel | `gas/EDITOR.txt.txt` |
| Riwayat versi GAS | `gas-backup/`, `gas-paste/`, `gas-split/` |

Jangan memilih salah satu sumber lalu mengabaikan yang lain. Perilaku akhir terbentuk dari gabungan frontend dan backend.

## Struktur kerja yang disarankan

```text
hosela-hub/
├─ index.html, css/, js/, assets/       # aplikasi aktif; jangan ditimpa
├─ gas/, gas-backup/, gas-paste/        # backend dan arsip aktif; jangan dihapus
├─ docs/clone-supabase/                  # dokumen handoff ini
├─ supabase-clone/                       # aplikasi baru dibangun di sini
│  ├─ app/                               # frontend clone
│  ├─ supabase/
│  │  ├─ migrations/
│  │  ├─ functions/
│  │  └─ seed/
│  ├─ tests/
│  │  ├─ contract/
│  │  ├─ business-rules/
│  │  └─ e2e/
│  └─ README.md
└─ CLAUDE.md
```

## Dokumen yang harus dibaca

1. `01-INVENTARIS-FITUR.md`
2. `02-ATURAN-BISNIS.md`
3. `03-ARSITEKTUR-DATA.md`
4. `04-RENCANA-MIGRASI.md`
5. `05-ACCEPTANCE-TEST.md`
6. `06-API-PARITY.md`

## Informasi yang dulu diperlukan sebelum koneksi nyata

- Supabase project URL dan anon key.
- Konfirmasi project Supabase yang benar berdasarkan akun pada `supabase-clone/HANDOFF.local.md`.
- Rencana Drive dibatalkan; penyimpanan aktif memakai Supabase Storage privat.
- Data fixture anonim untuk membandingkan hasil perhitungan.

Semua nilai rahasia harus berada di environment/secrets dan `.env` harus di-ignore.
