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

async function findLatestHumanPrivateChat(botToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=25&timeout=0`)
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.ok !== true || !Array.isArray(result?.result)) return ''

  for (let index = result.result.length - 1; index >= 0; index -= 1) {
    const update = result.result[index]
    const message = update?.message || update?.edited_message || update?.channel_post
    const chat = message?.chat
    if (chat?.type === 'private' && message?.from?.is_bot !== true && chat?.id) {
      return String(chat.id)
    }
  }
  return ''
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

      const testUserId = String(body?.testUserId || '').trim()
      if (testUserId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testUserId)) {
          return json({ success: false, msg: 'ID karyawan untuk simulasi tidak valid' }, 400)
        }
        const { data: testProfile, error: testProfileError } = await createClient(supabaseUrl, serviceRoleKey)
          .from('profiles')
          .select('nama,bagian,jabatan,status')
          .eq('id', testUserId)
          .single()
        if (testProfileError || !testProfile) {
          return json({ success: false, msg: 'Profil karyawan untuk simulasi tidak ditemukan' }, 404)
        }
        if (testProfile.status !== 'AKTIF') {
          return json({ success: false, msg: 'Simulasi hanya dapat dilakukan untuk akun aktif' }, 400)
        }
        const testType = body?.testType === 'PULANG' ? 'Pulang' : 'Datang'
        const testRole = [testProfile.bagian, testProfile.jabatan].filter(Boolean).join(' · ')
        const sampleMessage = [
          `<b>Absensi ${testType}</b>`,
          `Nama: <b>${escapeHtml(testProfile.nama)}</b>`,
          testRole ? `Bagian: ${escapeHtml(testRole)}` : '',
          `Waktu: ${escapeHtml(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))} WIB`,
          'Jarak kantor: 12 meter',
        ].filter(Boolean).join('\n')
        await sendTelegramMessage(botToken, chatId, sampleMessage)
        return json({ success: true, test: true, sampleAttendance: true })
      }
      const testMessage = [
        '<b>Uji Notifikasi Hosela Hub</b>',
        'Koneksi Telegram berhasil dan siap menerima notifikasi absensi kamera.',
        `Waktu uji: ${escapeHtml(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))} WIB`,
      ].join('\n')
      try {
        await sendTelegramMessage(botToken, chatId, testMessage)
      } catch (telegramError) {
        const telegramMessage = safeError(telegramError)
        if (/can't send messages to (?:the )?bot/i.test(telegramMessage)) {
          const detectedChatId = await findLatestHumanPrivateChat(botToken)
          if (detectedChatId) {
            return json({
              success: false,
              code: 'CHAT_ID_IS_BOT',
              detectedChatId,
              msg: `TELEGRAM_CHAT_ID salah. Gunakan ID chat pengguna yang terdeteksi: ${detectedChatId}`,
            }, 400)
          }
          return json({
            success: false,
            code: 'CHAT_ID_IS_BOT_NO_UPDATES',
            msg: 'TELEGRAM_CHAT_ID berisi ID bot. Buka bot Telegram Anda, tekan Start atau kirim /start, lalu uji lagi.',
          }, 400)
        }
        throw telegramError
      }
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
