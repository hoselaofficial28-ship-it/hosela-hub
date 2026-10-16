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

function configuredSecretKeys() {
  const keys = new Set<string>()
  const legacyServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (legacyServiceRole) keys.add(legacyServiceRole)

  try {
    const namedKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
    Object.values(namedKeys).forEach((value) => {
      if (typeof value === 'string' && value) keys.add(value)
    })
  } catch {
    // Project lama masih menyediakan SUPABASE_SERVICE_ROLE_KEY di atas.
  }

  return keys
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, msg: 'Gunakan POST' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const apiKey = req.headers.get('apikey') || ''

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Cron memakai secret key pada header `apikey`. Pemanggilan manual dari
    // aplikasi memakai JWT pengguna dan hanya boleh dilakukan Owner.
    const isTrustedCron = !!apiKey && configuredSecretKeys().has(apiKey)
    if (!isTrustedCron) {
      if (!token) return json({ success: false, msg: 'Harus login sebagai Owner atau memakai secret key Cron' }, 401)
      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: userData, error: userError } = await caller.auth.getUser()
      if (userError || !userData.user) return json({ success: false, msg: 'Sesi tidak valid' }, 401)
      const { data: profile } = await admin.from('profiles').select('bagian').eq('id', userData.user.id).single()
      if (!profile || profile.bagian !== 'Owner') {
        return json({ success: false, msg: 'Hanya Owner yang boleh menjalankan pembersihan foto' }, 403)
      }
    }

    const bucket = admin.storage.from('attendance-photos')
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const pathsToDelete: string[] = []

    const { data: users, error: usersError } = await bucket.list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (usersError) throw usersError

    for (const userFolder of users || []) {
      if (userFolder.id) continue
      const userPrefix = userFolder.name
      const { data: months, error: monthsError } = await bucket.list(userPrefix, { limit: 1000 })
      if (monthsError) throw monthsError

      for (const monthFolder of months || []) {
        if (monthFolder.id) continue
        const monthPrefix = `${userPrefix}/${monthFolder.name}`
        const { data: files, error: filesError } = await bucket.list(monthPrefix, { limit: 1000 })
        if (filesError) throw filesError

        for (const file of files || []) {
          if (!file.id) continue
          const createdAt = new Date(file.created_at || file.updated_at || 0)
          if (!Number.isNaN(createdAt.getTime()) && createdAt < cutoff) {
            pathsToDelete.push(`${monthPrefix}/${file.name}`)
          }
        }
      }
    }

    let deleted = 0
    for (let i = 0; i < pathsToDelete.length; i += 500) {
      const batch = pathsToDelete.slice(i, i + 500)
      const { error: removeError } = await bucket.remove(batch)
      if (removeError) throw removeError
      deleted += batch.length

      const { error: metadataError } = await admin
        .from('attendance_events')
        .update({
          photo_path: null,
          photo_url: null,
          upload_status: 'EXPIRED',
          upload_error: null,
        })
        .in('photo_path', batch)
        .eq('photo_provider', 'SUPABASE')
      if (metadataError) throw metadataError
    }

    return json({
      success: true,
      cutoff: cutoff.toISOString(),
      scannedUsers: (users || []).filter((x) => !x.id).length,
      deleted,
    })
  } catch (error) {
    return json({ success: false, msg: String(error) }, 500)
  }
})
