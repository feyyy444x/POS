import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return json({ error: 'Sesi Super Admin diperlukan.' }, 401)

  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
  const userId = String(payload?.userId || '')
  const password = String(payload?.password || '')
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'ID akun tidak valid.' }, 400)
  if (password.length < 8 || password.length > 128) return json({ error: 'Password harus 8–128 karakter.' }, 400)

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishableKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !serviceKey || !publishableKey) {
    console.error('Account password reset requires server-side Supabase service role and publishable keys.')
    return json({ error: 'Reset password admin belum dikonfigurasi di server.' }, 503)
  }

  const callerClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: callerResult, error: callerError } = await callerClient.auth.getUser(token)
  if (callerError || !callerResult.user) return json({ error: 'Sesi login tidak valid.' }, 401)
  const { data: directory, error: permissionError } = await callerClient.rpc('super_admin_list_users')
  if (permissionError || !Array.isArray(directory)) {
    return json({ error: 'Aksi ini hanya tersedia untuk Super Admin yang sudah memverifikasi PIN.' }, 403)
  }
  if (callerResult.user.id === userId) return json({ error: 'Tidak dapat mengganti password sendiri dari menu admin.' }, 400)
  const target = directory.find((item) => item.user_id === userId)
  if (!target) return json({ error: 'Akun target tidak ditemukan.' }, 404)
  if (target.is_super_admin) return json({ error: 'Akun Super Admin dilindungi.' }, 403)

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
  if (error) {
    console.error('Super Admin password reset failed:', error.message)
    return json({ error: 'Password belum berhasil diperbarui.' }, 500)
  }
  return json({ success: true })
}
