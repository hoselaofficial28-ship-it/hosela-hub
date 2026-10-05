# Hosela Hub — Supabase Clone

Folder kerja untuk clone Hosela Hub berbasis Supabase. Aplikasi produksi di root tetap menjadi referensi dan tidak boleh ditimpa sampai seluruh parity test lulus.

Sebelum membuat kode:

1. Baca `../CLAUDE.md`.
2. Baca seluruh `../docs/clone-supabase/` sesuai urutan nomor.
3. Buat rencana schema, endpoint/RPC/Edge Function, fixture, dan test parity.
4. Jangan menghubungkan atau mengubah data produksi tanpa izin Ko Sanjaya.

Struktur target:

```text
app/
supabase/migrations/
supabase/functions/
supabase/seed/
tests/contract/
tests/business-rules/
tests/e2e/
```

Kredensial Supabase dan Google Drive harus berada di environment/secrets dan tidak boleh di-commit.
