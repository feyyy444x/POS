import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

const ADMIN_KEYS = new Set(['users', 'stores', 'support', 'promotions', 'plans', 'system_reports'])

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)

  const authorization = request.headers.get('authorization') || ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return json({ error: 'Sesi login diperlukan.' }, 401)

  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
  const email = String(payload?.email || '').trim().toLowerCase()
  const fullName = String(payload?.fullName || '').trim().slice(0, 120)
  const password = String(payload?.password || '')
  const role = String(payload?.role || '')
  const permissions = payload?.permissions

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Masukkan alamat email yang valid.' }, 400)
  if (password.length < 6 || password.length > 128) return json({ error: 'Password harus terdiri dari 6 sampai 128 karakter.' }, 400)
  if (role !== 'admin') return json({ error: 'Role yang tersedia hanya Admin NEXAPOS.' }, 400)
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return json({ error: 'Hak akses tidak valid.' }, 400)
  if (Object.keys(permissions).some(key => !ADMIN_KEYS.has(key)) ||
      Object.values(permissions).some(value => typeof value !== 'boolean')) {
    return json({ error: 'Hak akses berisi izin yang tidak diizinkan.' }, 400)
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Platform staff creation is missing Supabase environment configuration.')
    return json({ error: 'Layanan pembuatan akun belum dikonfigurasi di server.' }, 503)
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: 'Bearer ' + token } } })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData?.user) return json({ error: 'Sesi login tidak valid. Silakan login ulang.' }, 401)
  const { data: pinRows, error: pinError } = await authClient.rpc('get_my_pin_status')
  const pinStatus = Array.isArray(pinRows) ? pinRows[0] : pinRows
  if (pinError || pinStatus?.is_verified !== true) {
    return json({ error: 'Verifikasi PIN diperlukan sebelum mengelola akun staf.' }, 403)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    const [{ data: superAdmin, error: superAdminError }, { data: staffRole, error: staffRoleError }] = await Promise.all([
      admin.from('super_admins').select('user_id').eq('user_id', authData.user.id).maybeSingle(),
      admin.from('platform_staff_roles').select('role,is_active').eq('user_id', authData.user.id).maybeSingle(),
    ])
    if (superAdminError || staffRoleError) {
      console.error('Could not verify platform administrator:', superAdminError?.message || staffRoleError?.message)
      return json({ error: 'Hak akses administrator platform belum dapat diverifikasi.' }, 500)
    }
    const authorized = Boolean(superAdmin) || (staffRole?.role === 'admin' && staffRole?.is_active === true)
    if (!authorized) return json({ error: 'Hanya Admin platform aktif atau Super Admin yang boleh membuat akun staf.' }, 403)

    const { data: existing, error: existingError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (existingError) {
      console.error('Could not check existing account:', existingError.message)
      return json({ error: 'Akun belum dapat diperiksa. Coba lagi.' }, 500)
    }
    if (existing.users.some(user => user.email?.toLowerCase() === email)) {
      return json({ error: 'Email sudah terdaftar. Matikan opsi “Buat akun login baru” lalu tambahkan role ke akun tersebut.' }, 409)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createError || !created?.user) {
      console.error('Could not create platform staff account:', createError?.message || 'user missing')
      return json({ error: 'Akun belum berhasil dibuat. Periksa email atau coba lagi.' }, 400)
    }

    const { error: roleError } = await admin.from('platform_staff_roles').insert({
      user_id: created.user.id,
      role,
      permissions,
      is_active: true,
      created_by: authData.user.id,
      updated_by: authData.user.id,
    })
    if (roleError) {
      // Avoid leaving an orphaned login if the role assignment fails.
      const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id)
      if (rollbackError) console.error('Could not roll back account after role assignment failed:', rollbackError.message)
      console.error('Could not assign platform staff role:', roleError.message)
      return json({ error: 'Akun tidak dapat diberi role. Tidak ada perubahan yang disimpan; coba lagi atau gunakan akun yang sudah ada.' }, 500)
    }

    return json({ success: true, userId: created.user.id, message: 'Akun staf berhasil dibuat dan role sudah diberikan.' }, 201)
  } catch (error) {
    console.error('Unexpected platform staff creation failure:', error?.message || error)
    return json({ error: 'Terjadi kesalahan server saat membuat akun staf.' }, 500)
  }
}
