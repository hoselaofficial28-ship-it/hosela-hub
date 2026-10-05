// Koneksi ke project Supabase ASLI milik Ko. anon key AMAN ditaruh di kode
// frontend (bukan rahasia) — akses sebenarnya dibatasi oleh RLS di database,
// bukan oleh key ini. JANGAN PERNAH taruh service_role key di file ini.
(function () {
  'use strict';
  var SUPABASE_URL = 'https://lhiepqldpiaqcctmqjss.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaWVwcWxkcGlhcWNjdG1xanNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExOTA0NTQsImV4cCI6MjEwNjc2NjQ1NH0.tFgp0NW02mwdJcSMPTYgda5DVqDqLvUQ9deRzBPhhC4';

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('[SUPABASE] Library @supabase/supabase-js belum termuat — cek <script> CDN di index.html.');
    return;
  }
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hh_sb_session' }
  });
})();
