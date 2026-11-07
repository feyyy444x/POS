import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  const token = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Sesi login diperlukan.' }, 401)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Free registration completion is missing Supabase server configuration.')
    return json({ error: 'Layanan pendaftaran belum dikonfigurasi.' }, 503)
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const { data: account, error: accountError } = await admin.auth.getUser(token)
    const user = account?.user
    if (accountError || !user?.id || !user.email_confirmed_at) return json({ error: 'Sesi akun belum terverifikasi.' }, 401)

    const { data: storeId, error } = await admin.rpc('complete_free_single_workspace_registration', { p_user_id: user.id })
    if (error) {
      console.error('Free registration completion failed:', error.message)
      return json({ error: 'Workspace belum berhasil disiapkan. Hubungi dukungan.' }, 409)
    }
    if (!storeId) {
      const { data: existingOwnerMembership, error: membershipError } = await admin
        .from('store_members').select('id').eq('user_id', user.id).eq('role', 'owner').limit(1)
      if (membershipError) {
        console.error('Could not confirm existing Owner workspace after registration retry:', membershipError.message)
        return json({ error: 'Status workspace belum dapat diverifikasi.' }, 503)
      }
      if (!existingOwnerMembership?.length && user.user_metadata?.free_workspace_pending === true) {
        return json({ needs_setup: true, message: 'Verifikasi email berhasil. Lengkapi PIN untuk menyelesaikan Workspace Gratis.' })
      }
      if (existingOwnerMembership?.length && user.user_metadata?.free_workspace_pending === true) {
        const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...(user.user_metadata || {}), free_workspace_pending: false },
        })
        if (metadataError) console.error('Free registration metadata cleanup after idempotent retry failed:', metadataError.message)
      }
      return json({ pending: false })
    }

    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), free_workspace_pending: false },
    })
    if (metadataError) console.error('Free registration metadata cleanup failed:', metadataError.message)

    return json({ pending: true, storeId, message: 'Workspace gratis berhasil dibuat.' })
  } catch (error) {
    console.error('Free registration completion error:', error?.message || error)
    return json({ error: 'Penyelesaian pendaftaran gagal. Silakan coba kembali.' }, 500)
  }
}

export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 10 },
}
