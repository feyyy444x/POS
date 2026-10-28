import { createClient } from '@supabase/supabase-js'
import { createHash, timingSafeEqual } from 'node:crypto'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)

  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
  const email = String(payload?.email || '').trim().toLowerCase()
  const password = String(payload?.password || '')
  const activationCode = String(payload?.activationCode || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Masukkan alamat email yang valid.' }, 400)
  if (password.length < 8 || password.length > 128) return json({ error: 'Password harus terdiri dari 8 sampai 128 karakter.' }, 400)
  if (!/^[a-f0-9]{32}$/.test(activationCode)) return json({ error: 'Masukkan kode aktivasi 32 karakter dari Owner toko.' }, 400)

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Invitation activation is missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    return json({ error: 'Layanan aktivasi belum dikonfigurasi. Hubungi administrator.' }, 503)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const now = new Date().toISOString()
    const { data: invites, error: inviteError } = await admin
      .from('store_invites')
      .select('id,store_id,email,full_name,role,expires_at,accepted_at,activation_code_hash')
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', now)

    if (inviteError) {
      console.error('Could not validate invitation:', inviteError.message)
      return json({ error: 'Undangan tidak dapat diverifikasi saat ini.' }, 500)
    }
    if (!invites?.length) {
      return json({ error: 'Email ini tidak memiliki undangan yang masih berlaku. Pastikan Owner mendaftarkan email yang sama.' }, 403)
    }

    const suppliedHash = createHash('sha256').update(activationCode, 'utf8').digest('hex')
    const supplied = Buffer.from(suppliedHash, 'hex')
    const validInvitesByCode = invites.filter((invite) => {
      if (!invite.activation_code_hash || !/^[a-f0-9]{64}$/i.test(invite.activation_code_hash)) return false
      const stored = Buffer.from(invite.activation_code_hash, 'hex')
      return stored.length === supplied.length && timingSafeEqual(stored, supplied)
    })
    if (!validInvitesByCode.length) return json({ error: 'Kode aktivasi tidak cocok dengan undangan email ini.' }, 403)

    const storeIds = [...new Set(validInvitesByCode.map((invite) => invite.store_id))]
    const { data: stores, error: storesError } = await admin
      .from('stores')
      .select('id,status,deleted_at')
      .in('id', storeIds)
    if (storesError) {
      console.error('Could not validate invitation tenant:', storesError.message)
      return json({ error: 'Status toko tidak dapat diverifikasi saat ini.' }, 500)
    }
    const validStoreIds = new Set((stores || []).filter((store) => !store.deleted_at && store.status !== 'deleted').map((store) => store.id))
    const validInvites = validInvitesByCode.filter((invite) => validStoreIds.has(invite.store_id))
    if (!validInvites.length) return json({ error: 'Undangan berasal dari toko yang sudah dihapus.' }, 403)

    let user = null
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) {
        console.error('Could not find existing auth user:', error.message)
        return json({ error: 'Akun belum dapat diperiksa. Silakan coba lagi.' }, 500)
      }
      user = data.users.find((candidate) => candidate.email?.toLowerCase() === email) || null
      if (user || data.users.length < 1000) break
    }

    if (user) {
      const { data: protectedAdmin, error: protectedError } = await admin
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (protectedError) {
        console.error('Could not check protected account:', protectedError.message)
        return json({ error: 'Akun belum dapat diperiksa. Silakan coba lagi.' }, 500)
      }
      if (protectedAdmin) return json({ error: 'Akun Super Admin tidak dapat diaktifkan melalui undangan tenant.' }, 403)

      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
        user_metadata: { ...(user.user_metadata || {}), full_name: validInvites[0].full_name || user.user_metadata?.full_name || '' },
      })
      if (updateError) {
        console.error('Could not set invited user password:', updateError.message)
        return json({ error: 'Password belum berhasil disimpan. Silakan coba lagi.' }, 500)
      }
      user = updated.user
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: validInvites[0].full_name || '' },
      })
      if (error || !data.user) {
        console.error('Could not create invited auth user:', error?.message || 'user missing')
        return json({ error: 'Akun belum berhasil dibuat. Silakan coba lagi.' }, 500)
      }
      user = data.user
    }

    const memberships = validInvites.map((invite) => ({
      store_id: invite.store_id,
      user_id: user.id,
      role: invite.role,
      email,
      full_name: invite.full_name || '',
      is_active: true,
      disabled_at: null,
      disabled_by: null,
    }))
    const { error: membershipError } = await admin
      .from('store_members')
      .upsert(memberships, { onConflict: 'store_id,user_id' })
    if (membershipError) {
      console.error('Could not attach invited account to tenant:', membershipError.message)
      return json({ error: 'Password tersimpan, tetapi pengaitan ke toko belum selesai. Coba aktivasi kembali.' }, 500)
    }

    const { error: acceptError } = await admin
      .from('store_invites')
      .update({ accepted_at: new Date().toISOString() })
      .in('id', validInvites.map((invite) => invite.id))
      .is('accepted_at', null)
    if (acceptError) {
      console.error('Could not mark invitations accepted:', acceptError.message)
      return json({ error: 'Akun sudah dibuat, tetapi status undangan belum selesai diperbarui. Coba aktivasi kembali.' }, 500)
    }

    return json({ success: true, message: 'Undangan valid. Akun siap digunakan untuk login.' })
  } catch (error) {
    console.error('Unexpected invitation activation failure:', error?.message || error)
    return json({ error: 'Aktivasi gagal karena kesalahan sistem. Silakan coba lagi.' }, 500)
  }
}
