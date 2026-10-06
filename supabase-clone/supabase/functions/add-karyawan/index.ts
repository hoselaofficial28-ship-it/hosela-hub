// ============================================================================
// Hosela Hub — Supabase Clone — Edge Function: addKaryawanBaru
// ============================================================================
// Replikasi addKaryawanBaru (GAP endpoint, tidak pernah ada backend-nya di
// app lama -- kontrak direkonstruksi dari js/app.js, lihat
// docs/clone-supabase/07-DATA-DICTIONARY.md). Owner-only, insert LANGSUNG
// status AKTIF (tanpa lewat alur PENDING), password default "hosela".
//
// Butuh Edge Function (bukan RPC SQL biasa) karena harus memanggil Supabase
// Auth Admin API (buat user + set password) -- itu HTTP API terpisah yang
// butuh service_role key, dan service_role key TIDAK BOLEH ada di browser
// (CLAUDE.md). RPC Postgres tidak bisa memanggil Admin API secara langsung.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ success: false, msg: 'Harus login' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Identitas pemanggil diverifikasi dari token asli (bukan diklaim dari body).
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerData.user) return json({ success: false, msg: 'Sesi tidak valid' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: callerProfile } = await adminClient.from('profiles').select('bagian').eq('id', callerData.user.id).single()
    if (!callerProfile || callerProfile.bagian !== 'Owner') {
      return json({ success: false, msg: 'Akses ditolak: hanya Owner yang boleh menambah karyawan' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const nama = String(body.nama || '').trim()
    const bagian = String(body.bagian || '').trim()
    const jabatan = String(body.jabatan || '').trim()
    const email = String(body.email || '').trim()
    if (!nama || !bagian || !jabatan || !email) {
      return json({ success: false, msg: 'Nama, bagian, jabatan, dan email wajib diisi.' }, 400)
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: 'hosela',
      email_confirm: true,
      user_metadata: { nama, bagian, jabatan },
    })
    if (createErr || !created?.user) {
      let msg = createErr?.message || 'Gagal membuat akun'
      if (/already.*registered|already exists/i.test(msg)) msg = 'Email ini sudah terdaftar.'
      return json({ success: false, msg }, 400)
    }

    // Trigger handle_new_user (migration 0004) membuat baris profiles status
    // PENDING -- di sini langsung AKTIF-kan (Owner yang menambahkan langsung,
    // bukan daftar-sendiri yang butuh approval).
    await adminClient.from('profiles').update({ status: 'AKTIF' }).eq('id', created.user.id)

    await adminClient.from('audit_logs').insert({
      actor: callerData.user.id,
      action: 'ADD_KARYAWAN_BARU',
      target: created.user.id,
      after_data: { nama, bagian, jabatan, email },
    })

    return json({ success: true, id: created.user.id })
  } catch (e) {
    return json({ success: false, msg: String(e) }, 500)
  }
})
