import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})
const validName = value => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 120
const categories = ['Retail / Toko','Minimarket','Fashion / Pakaian','Kuliner / Restoran','Kafe / Kedai','Jasa','Salon / Barbershop','Apotek','Elektronik','Lainnya']

export default async (request) => {
  // Preview and production use the same Supabase project. Allow live signup
  // only on the canonical public domain or the explicitly approved preview alias.
  // Netlify's CONTEXT variable is not guaranteed to be present in function runtime.
  const deployContext = process.env.CONTEXT || process.env.NETLIFY_CONTEXT
  const requestHost = new URL(request.url).hostname
  const approvedProduction = requestHost === 'acopos.my.id' || requestHost === 'www.acopos.my.id'
  const approvedPreview = requestHost === 'acopos-rebrand-preview--acopos.netlify.app'
  if (deployContext !== 'production' && !approvedProduction && !approvedPreview) {
    return json({ error: 'Pendaftaran sementara dinonaktifkan pada preview ini.' }, 404)
  }
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
  const email = String(payload?.email || '').trim().toLowerCase()
  const password = String(payload?.password || '')
  const ownerName = String(payload?.ownerName || '').trim()
  const companyName = String(payload?.companyName || '').trim()
  const workspaceName = String(payload?.workspaceName || '').trim()
  const businessCategory = String(payload?.businessCategory || '').trim()
  const pin = String(payload?.pin || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Masukkan alamat email yang valid.' }, 400)
  if (password.length < 8 || password.length > 128) return json({ error: 'Password harus terdiri dari 8 sampai 128 karakter.' }, 400)
  if (![ownerName, companyName, workspaceName].every(validName)) return json({ error: 'Nama Owner, Perusahaan, dan workspace wajib 2–120 karakter.' }, 400)
  if (!categories.includes(businessCategory)) return json({ error: 'Pilih kategori usaha yang tersedia.' }, 400)
  if (!/^\d{4}$/.test(pin)) return json({ error: 'PIN harus tepat 4 angka.' }, 400)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Layanan pendaftaran belum dikonfigurasi. Hubungi administrator.' }, 503)
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  let userId = null
  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: ownerName, free_workspace_pending: true },
    })
    if (createError || !created?.user?.id) {
      const message = String(createError?.message || '')
      if (/already|registered|exists/i.test(message)) return json({ error: 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.' }, 409)
      console.error('Free registration Auth account creation failed:', message || 'missing user')
      return json({ error: 'Akun belum berhasil dibuat. Silakan coba kembali.' }, 400)
    }
    userId = created.user.id
    const internalActivationCode = randomBytes(16).toString('hex')
    const { data: prepared, error: prepareError } = await admin.rpc('prepare_free_single_workspace_registration', {
      p_user_id: userId, p_email: email, p_owner_name: ownerName,
      p_company_name: companyName, p_workspace_name: workspaceName,
      p_business_category: businessCategory, p_pin: pin, p_activation_code: internalActivationCode,
    })
    if (prepareError || prepared !== true) {
      console.error('Free registration intent preparation failed:', prepareError?.message || 'unexpected response')
      throw new Error('Persiapan aktivasi Workspace Gratis gagal.')
    }
    const { data: storeId, error: completionError } = await admin.rpc('complete_free_single_workspace_registration', {
      p_user_id: userId, p_activation_code: internalActivationCode,
    })
    if (completionError || !storeId) {
      console.error('Free registration activation failed:', completionError?.message || 'workspace not returned')
      throw new Error('Aktivasi Workspace Gratis belum berhasil diselesaikan.')
    }
    const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: ownerName, free_workspace_pending: false },
    })
    if (metadataError) console.error('Could not clear free registration pending flag:', metadataError.message)
    return json({ success: true, message: 'Akun dan Workspace Gratis berhasil dibuat.' })
  } catch (error) {
    if (userId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId)
      if (cleanupError) console.error('Could not roll back incomplete free registration Auth user:', cleanupError.message)
    }
    console.error('Free registration failed:', error?.message || error)
    return json({ error: error?.message || 'Pendaftaran gratis gagal. Silakan coba kembali.' }, 409)
  }
}
export const config = { rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 5 } }
