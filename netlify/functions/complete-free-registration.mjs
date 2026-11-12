import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

export default async (request) => {
  // This endpoint only clears the pending marker after the direct registration
  // flow has already created the Owner membership. Limit preview access to the
  // one explicitly approved branch alias.
  const deployContext = process.env.CONTEXT || process.env.NETLIFY_CONTEXT
  const requestHost = new URL(request.url).hostname
  const approvedPreview = requestHost === 'acopos-rebrand-preview--acopos.netlify.app'
  if (deployContext !== 'production' && !approvedPreview) {
    return json({ error: 'Penyelesaian pendaftaran dinonaktifkan pada preview ini.' }, 404)
  }
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

    // Registration now creates the workspace synchronously inside /register-free.
    // The old follow-up RPC signature required an internal activation code that
    // is intentionally never exposed to the client, so do not call that stale RPC.
    const { data: existingOwnerMembership, error: membershipError } = await admin
      .from('store_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
    if (membershipError) {
      console.error('Could not confirm Owner workspace after registration:', membershipError.message)
      return json({ error: 'Status workspace belum dapat diverifikasi.' }, 503)
    }
    if (!existingOwnerMembership?.length) {
      return json({ error: 'Workspace belum terbentuk. Silakan hubungi dukungan agar pendaftaran dapat diperiksa.' }, 409)
    }

    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), free_workspace_pending: false },
    })
    if (metadataError) {
      console.error('Free registration metadata cleanup failed:', metadataError.message)
      return json({ error: 'Workspace sudah dibuat, tetapi penanda penyelesaian akun belum berhasil diperbarui. Keluar lalu masuk kembali atau hubungi dukungan.' }, 503)
    }

    return json({ pending: false, message: 'Workspace gratis sudah aktif.' })
  } catch (error) {
    console.error('Free registration completion error:', error?.message || error)
    return json({ error: 'Penyelesaian pendaftaran gagal. Silakan coba kembali.' }, 500)
  }
}

export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 10 },
}
