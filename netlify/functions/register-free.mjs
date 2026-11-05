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

  const email = String(payload?.email || '').trim().toLowerCase()
  const password = String(payload?.password || '')
  const ownerName = String(payload?.ownerName || '').trim()
  const workspaceName = String(payload?.workspaceName || '').trim()
  const pin = String(payload?.pin || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Masukkan alamat email yang valid.' }, 400)
  if (password.length < 8 || password.length > 128) return json({ error: 'Password harus terdiri dari 8 sampai 128 karakter.' }, 400)
  if (![ownerName, workspaceName].every(validName)) return json({ error: 'Nama Owner dan workspace wajib 2–120 karakter.' }, 400)
  if (!/^\d{4}$/.test(pin)) return json({ error: 'PIN harus tepat 4 angka.' }, 400)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Free registration is missing Supabase server configuration.')
    return json({ error: 'Layanan pendaftaran belum dikonfigurasi. Hubungi administrator.' }, 503)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let createdUserId = null
  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: ownerName },
    })
    if (createError || !created?.user) {
      const message = createError?.message || ''
      if (/already|registered|exists/i.test(message)) return json({ error: 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.' }, 409)
      console.error('Free registration could not create auth user:', message)
      return json({ error: 'Akun belum berhasil dibuat. Silakan coba kembali.' }, 500)
    }
    createdUserId = created.user.id

    const { data: storeId, error: registrationError } = await admin.rpc('create_free_single_workspace_registration', {
      p_user_id: createdUserId,
      p_email: email,
      p_owner_name: ownerName,
      p_workspace_name: workspaceName,
      p_pin: pin,
    })
    if (registrationError || !storeId) {
      console.error('Free registration workspace provisioning failed:', registrationError?.message || 'missing store id')
      await admin.auth.admin.deleteUser(createdUserId)
      createdUserId = null
      if (/sudah terdaftar/i.test(registrationError?.message || '')) return json({ error: 'Email ini sudah terdaftar sebagai Owner.' }, 409)
      return json({ error: 'Akun belum dapat disiapkan menjadi workspace. Silakan coba kembali.' }, 500)
    }

    return json({ success: true, storeId, message: 'Pendaftaran berhasil. Silakan masuk menggunakan email dan password Anda.' })
  } catch (error) {
    if (createdUserId) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(createdUserId)
      if (rollbackError) console.error('Free registration rollback failed:', rollbackError.message)
    }
    console.error('Unexpected free registration failure:', error?.message || error)
    return json({ error: 'Pendaftaran gagal karena kesalahan sistem. Silakan coba kembali.' }, 500)
  }
}
