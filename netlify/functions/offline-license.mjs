import { createClient } from '@supabase/supabase-js'
import { createPrivateKey, sign } from 'node:crypto'

const env = key => typeof Netlify !== 'undefined' && Netlify.env?.get ? Netlify.env.get(key) : process.env[key]

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

function signLicense(payload) {
  const privatePem = String(env('ACOPOS_LICENSE_PRIVATE_KEY') || '').replace(/\\n/g, '\n')
  if (!privatePem) throw new Error('ACOPOS_LICENSE_PRIVATE_KEY is not configured')
  const privateKey = createPrivateKey(privatePem)
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('Offline license signing key must be Ed25519')
  const bytes = Buffer.from(JSON.stringify(payload), 'utf8')
  return {
    signedPayload: bytes.toString('base64'),
    signature: sign(null, bytes, privateKey).toString('base64'),
  }
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  const token = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Sesi login diperlukan.' }, 401)
  let body
  try { body = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
  const storeId = String(body?.storeId || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) return json({ error: 'ID toko tidak valid.' }, 400)

  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey || !env('ACOPOS_LICENSE_PRIVATE_KEY')) {
    console.error('Offline license endpoint is missing server configuration.')
    return json({ error: 'Penerbit lisensi offline belum dikonfigurasi.' }, 503)
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    const user = authData?.user
    if (authError || !user?.id) return json({ error: 'Sesi login tidak valid.' }, 401)

    const { data: membership, error: membershipError } = await admin
       .from('store_members').select('role,is_active').eq('store_id', storeId).eq('user_id', user.id).maybeSingle()
    if (membershipError || !membership?.is_active || !['owner', 'admin', 'manager', 'cashier'].includes(membership.role)) return json({ error: 'Akun tidak memiliki akses aktif ke toko ini.' }, 403)

    const { data: store, error: storeError } = await admin
      .from('stores').select('id,status,expires_at,deleted_at,activation_package_key,workspace_mode,organization_id')
      .eq('id', storeId).maybeSingle()
    if (storeError || !store) return json({ error: 'Toko tidak ditemukan.' }, 404)
    let status = store.status
    let expiresAt = store.expires_at
    let packageKey = store.activation_package_key
    if (store.deleted_at || store.status !== 'active') return json({ error: 'Toko sudah dihapus atau tidak aktif.' }, 403)
    if (store.organization_id) {
      const { data: organization, error: organizationError } = await admin
        .from('owner_organizations').select('status,expires_at,activation_package_key')
        .eq('id', store.organization_id).maybeSingle()
      if (organizationError || !organization) return json({ error: 'Status perusahaan belum dapat diverifikasi.' }, 503)
      if (organization.status !== 'active' || (organization.expires_at && Date.parse(organization.expires_at) <= Date.now())) {
        return json({ error: 'Perusahaan tidak aktif atau masa sewanya berakhir.' }, 403)
      }
      status = organization.status === 'active' ? store.status : organization.status
      const expiryCandidates = [store.expires_at, organization.expires_at].filter(Boolean).map(value => Date.parse(value))
      if (expiryCandidates.some(value => !Number.isFinite(value))) return json({ error: 'Tanggal masa aktif tidak valid.' }, 503)
      expiresAt = expiryCandidates.length ? new Date(Math.min(...expiryCandidates)).toISOString() : null
      packageKey = organization.activation_package_key
    }
    if (status !== 'active' || (expiresAt && !Number.isFinite(Date.parse(expiresAt)))) return json({ error: 'Tanggal masa aktif tidak valid.' }, 503)
    if (status !== 'active' || (expiresAt && Date.parse(expiresAt) <= Date.now())) {
      return json({ error: 'Toko tidak aktif atau masa sewanya berakhir.' }, 403)
    }
    const { data: plan, error: planError } = await admin
      .from('site_activation_packages').select('offline_grace_hours')
      .eq('package_key', packageKey).maybeSingle()
    if (planError || !plan) return json({ error: 'Kebijakan lisensi offline belum tersedia. Terapkan migrasi offline terlebih dahulu.' }, 503)
    const offlineGraceHours = Number(plan.offline_grace_hours)
    if (!Number.isInteger(offlineGraceHours) || offlineGraceHours < 0 || offlineGraceHours > 168) {
      return json({ error: 'Konfigurasi grace period paket tidak valid.' }, 503)
    }
    const payload = {
      schema: 1,
      storeId,
      userId: user.id,
      role: membership.role,
      packageKey,
      status: 'active',
      serverIssuedAt: new Date().toISOString(),
      subscriptionExpiresAt: expiresAt || null,
      offlineGraceHours,
    }
    return json(signLicense(payload))
  } catch (error) {
    console.error('Offline license issuance failed:', error?.message || error)
    return json({ error: 'Lisensi offline belum berhasil diterbitkan.' }, 503)
  }
}

export const config = { rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 30 } }
