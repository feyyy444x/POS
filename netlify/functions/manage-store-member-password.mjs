import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return json({ error: 'Sesi login diperlukan.' }, 401)

  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
  const memberId = String(payload?.memberId || '')
  const password = String(payload?.password || '')
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return json({ error: 'ID keanggotaan tidak valid.' }, 400)
  if (password.length < 6 || password.length > 128) return json({ error: 'Password harus 6–128 karakter.' }, 400)

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishableKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !serviceKey || !publishableKey) return json({ error: 'Reset password karyawan belum dikonfigurasi di server.' }, 503)

  const caller = createClient(url, publishableKey, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await caller.auth.getUser(token)
  if (authError || !authData.user) return json({ error: 'Sesi login tidak valid.' }, 401)
  const { data: allowed, error: permissionError } = await caller.rpc('manager_can_manage_store_member', { p_member_id: memberId })
  if (permissionError || allowed !== true) return json({ error: 'Aksi ini hanya tersedia untuk Owner/Manager aktif yang sudah memverifikasi PIN.' }, 403)

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: member, error: memberError } = await admin.from('store_members').select('user_id').eq('id', memberId).maybeSingle()
  if (memberError || !member?.user_id) return json({ error: 'Akun karyawan tidak ditemukan.' }, 404)
  if (member.user_id === authData.user.id) return json({ error: 'Tidak dapat mengganti password akun sendiri dari menu karyawan.' }, 400)
  const { error: updateError } = await admin.auth.admin.updateUserById(member.user_id, { password })
  if (updateError) {
    console.error('Manager employee password reset failed:', updateError.message)
    return json({ error: 'Password karyawan belum berhasil diperbarui.' }, 500)
  }
  return json({ success: true })
}
