// Hosela Hub — kirim notifikasi Telegram untuk absensi kamera yang diterima.
// Secrets yang wajib tersedia di Supabase:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeError(value: unknown) {
  const text = value instanceof Error ? value.message : String(value || 'Kesalahan tidak diketahui')
  return text.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED]').slice(0, 500)
}

async function sendTelegramMessage(botToken: string, chatId: string, message: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.ok !== true) {
    throw new Error(result?.description || `Telegram HTTP ${response.status}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, msg: 'Metode tidak diizinkan' }, 405)

  let eventId = ''
  let adminClient: ReturnType<typeof createClient> | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ success: false, msg: 'Harus login' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID') || ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ success: false, msg: 'Konfigurasi Supabase belum lengkap' }, 500)
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: callerData, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerData.user) return json({ success: false, msg: 'Sesi tidak valid' }, 401)

    const body = await req.json().catch(() => ({}))

    if (body?.test === true) {
      if (!botToken || !chatId) throw new Error('Secret Telegram belum dipasang di Supabase')
      const { data: ownerProfile, error: ownerError } = await createClient(supabaseUrl, serviceRoleKey)
        .from('profiles')
        .select('bagian')
        .eq('id', callerData.user.id)
        .single()
      if (ownerError || ownerProfile?.bagian !== 'Owner') {
        return json({ success: false, msg: 'Uji Telegram hanya dapat dilakukan Owner' }, 403)
      }
      const testMessage = [
        '<b>Uji Notifikasi Hosela Hub</b>',
        'Koneksi Telegram berhasil dan siap menerima notifikasi absensi kamera.',
        `Waktu uji: ${escapeHtml(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))} WIB`,
      ].join('\n')
      await sendTelegramMessage(botToken, chatId, testMessage)
      return json({ success: true, test: true })
    }

    eventId = String(body.eventId || '').trim()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
      return json({ success: false, msg: 'ID absensi tidak valid' }, 400)
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: event, error: eventError } = await adminClient
      .from('attendance_events')
      .select('id,user_id,tanggal,jam,tipe,jarak_kantor_meter,status,source')
      .eq('id', eventId)
      .single()

    if (eventError || !event) return json({ success: false, msg: 'Absensi tidak ditemukan' }, 404)
    if (event.user_id !== callerData.user.id) return json({ success: false, msg: 'Akses ditolak' }, 403)
    if (event.status !== 'DITERIMA' || event.source !== 'CAMERA' || !['MASUK', 'PULANG'].includes(event.tipe)) {
      return json({ success: false, msg: 'Hanya absensi kamera yang diterima dapat diberitahukan' }, 400)
    }

    const { data: existing } = await adminClient
      .from('attendance_telegram_notifications')
      .select('status,attempts,updated_at')
      .eq('event_id', eventId)
      .maybeSingle()

    if (existing?.status === 'SENT') return json({ success: true, alreadySent: true })
    if (existing?.status === 'SENDING') {
      const ageMs = Date.now() - new Date(existing.updated_at).getTime()
      if (Number.isFinite(ageMs) && ageMs < 120000) {
        return json({ success: true, processing: true })
      }
    }

    if (existing) {
      const { error: retryError } = await adminClient
        .from('attendance_telegram_notifications')
        .update({
          status: 'SENDING',
          attempts: Number(existing.attempts || 0) + 1,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
      if (retryError) throw retryError
    } else {
      const { error: claimError } = await adminClient
        .from('attendance_telegram_notifications')
        .insert({ event_id: eventId, status: 'SENDING', attempts: 1 })
      if (claimError) {
        // Dua permintaan bersamaan: event_id adalah primary key, jadi hanya
        // satu pengiriman yang boleh meneruskan ke Telegram.
        if (claimError.code === '23505') return json({ success: true, processing: true })
        throw claimError
      }
    }

    if (!botToken || !chatId) throw new Error('Secret Telegram belum dipasang di Supabase')

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('nama,bagian,jabatan')
      .eq('id', event.user_id)
      .single()
    if (profileError || !profile) throw new Error('Profil karyawan tidak ditemukan')

    const label = event.tipe === 'PULANG' ? 'Pulang' : 'Datang'
    const waktu = String(event.jam || '').slice(0, 5)
    const bagianJabatan = [profile.bagian, profile.jabatan].filter(Boolean).join(' · ')
    const message = [
      `<b>Absensi ${label}</b>`,
      `Nama: <b>${escapeHtml(profile.nama)}</b>`,
      bagianJabatan ? `Bagian: ${escapeHtml(bagianJabatan)}` : '',
      `Waktu: ${escapeHtml(event.tanggal)} · ${escapeHtml(waktu)} WIB`,
      `Jarak kantor: ${Math.round(Number(event.jarak_kantor_meter || 0))} meter`,
    ].filter(Boolean).join('\n')

    await sendTelegramMessage(botToken, chatId, message)

    const { error: sentError } = await adminClient
      .from('attendance_telegram_notifications')
      .update({ status: 'SENT', sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
      .eq('event_id', eventId)
    if (sentError) throw sentError

    return json({ success: true })
  } catch (error) {
    const message = safeError(error)
    if (adminClient && eventId) {
      await adminClient
        .from('attendance_telegram_notifications')
        .update({ status: 'FAILED', last_error: message, updated_at: new Date().toISOString() })
        .eq('event_id', eventId)
    }
    return json({ success: false, msg: message }, 500)
  }
})
