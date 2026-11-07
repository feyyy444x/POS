import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})
const validName = value => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 120
const categories = ['Retail / Toko','Minimarket','Fashion / Pakaian','Kuliner / Restoran','Kafe / Kedai','Jasa','Salon / Barbershop','Apotek','Elektronik','Lainnya']

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  const token = String(request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) return json({ error: 'Sesi login diperlukan untuk menyiapkan workspace.' }, 401)

  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }

  const email = String(payload?.email || '').trim().toLowerCase()
  const ownerName = String(payload?.ownerName || '').trim()
  const companyName = String(payload?.companyName || '').trim()
  const workspaceName = String(payload?.workspaceName || '').trim()
  const businessCategory = String(payload?.businessCategory || '').trim()
  const pin = String(payload?.pin || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Masukkan alamat email yang valid.' }, 400)
  if (![ownerName, companyName, workspaceName].every(validName)) return json({ error: 'Nama Owner, Perusahaan, dan workspace wajib 2–120 karakter.' }, 400)
  if (!categories.includes(businessCategory)) return json({ error: 'Pilih kategori usaha yang tersedia.' }, 400)
  if (!/^\d{4}$/.test(pin)) return json({ error: 'PIN harus tepat 4 angka.' }, 400)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Free registration is missing Supabase server configuration.')
    return json({ error: 'Layanan pendaftaran belum dikonfigurasi. Hubungi administrator.' }, 503)
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const { data: account, error: accountError } = await admin.auth.getUser(token)
    const user = account?.user
    if (accountError || !user?.id || String(user.email || '').toLowerCase() !== email) {
      return json({ error: 'Sesi akun tidak valid atau email tidak cocok.' }, 401)
    }
    if (user.user_metadata?.free_workspace_pending !== true) {
      return json({ error: 'Akun ini tidak memiliki pendaftaran Workspace Gratis yang tertunda.' }, 403)
    }
    const { data, error } = await admin.rpc('prepare_free_single_workspace_registration', {
      p_user_id: user.id, p_email: email, p_owner_name: ownerName,
      p_company_name: companyName, p_workspace_name: workspaceName, p_business_category: businessCategory, p_pin: pin,
    })
    if (error || data !== true) {
      console.error('Free registration intent could not be prepared:', error?.message || 'unexpected response')
      return json({ error: 'Persiapan workspace gagal. Periksa data pendaftaran dan coba kembali.' }, 409)
    }
    return json({ success: true, message: 'Data pendaftaran berhasil disiapkan.' })
  } catch (error) {
    console.error('Free registration preparation failed:', error?.message || error)
    return json({ error: 'Persiapan pendaftaran gagal. Silakan coba kembali.' }, 500)
  }
}

export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 5 },
}
