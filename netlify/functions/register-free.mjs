import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})
const validName = value => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 120

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }

  const userId = String(payload?.userId || '')
  const email = String(payload?.email || '').trim().toLowerCase()
  const ownerName = String(payload?.ownerName || '').trim()
  const companyName = String(payload?.companyName || '').trim()
  const workspaceName = String(payload?.workspaceName || '').trim()
  const pin = String(payload?.pin || '')
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'Identitas akun tidak valid.' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Masukkan alamat email yang valid.' }, 400)
  if (![ownerName, companyName, workspaceName].every(validName)) return json({ error: 'Nama Owner, Perusahaan, dan workspace wajib 2–120 karakter.' }, 400)
  if (!/^\d{4}$/.test(pin)) return json({ error: 'PIN harus tepat 4 angka.' }, 400)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Free registration is missing Supabase server configuration.')
    return json({ error: 'Layanan pendaftaran belum dikonfigurasi. Hubungi administrator.' }, 503)
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId)
    if (accountError || !account?.user || String(account.user.email || '').toLowerCase() !== email) {
      return json({ error: 'Akun pendaftaran tidak dapat diverifikasi.' }, 403)
    }
    const { data, error } = await admin.rpc('prepare_free_single_workspace_registration', {
      p_user_id: userId, p_email: email, p_owner_name: ownerName,
      p_company_name: companyName, p_workspace_name: workspaceName, p_pin: pin,
    })
    if (error || data !== true) {
      console.error('Free registration intent could not be prepared:', error?.message || 'unexpected response')
      return json({ error: 'Persiapan workspace gagal. Periksa data lalu coba kembali.' }, 409)
    }
    return json({ success: true, message: 'Data pendaftaran aman disiapkan. Verifikasi email untuk menyelesaikan pembuatan workspace.' })
  } catch (error) {
    console.error('Free registration preparation failed:', error?.message || error)
    return json({ error: 'Persiapan pendaftaran gagal. Silakan coba kembali.' }, 500)
  }
}

export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 5 },
}
