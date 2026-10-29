import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})
const PERMISSION_BY_ACTION = {
  users: 'users', stores: 'stores', reports: 'system_reports', support_inbox: 'support',
}
export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  const token = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return json({ error: 'Sesi login diperlukan.' }, 401)
  let payload
  try { payload = await request.json() } catch { return json({ error: 'Permintaan tidak valid.' }, 400) }
  const action = String(payload?.action || '')
  const requiredPermission = PERMISSION_BY_ACTION[action]
  if (!requiredPermission) return json({ error: 'Operasi tidak dikenal.' }, 400)

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) return json({ error: 'Layanan internal belum dikonfigurasi di server.' }, 503)
  const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: authData, error: authError } = await auth.auth.getUser(token)
  if (authError || !authData?.user) return json({ error: 'Sesi tidak valid. Silakan login ulang.' }, 401)
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    const { data: assignment, error: roleError } = await admin.from('platform_staff_roles')
      .select('role,permissions,is_active').eq('user_id', authData.user.id).maybeSingle()
    if (roleError) return json({ error: 'Hak akses staf belum dapat diverifikasi.' }, 500)
    if (!assignment || !assignment.is_active) return json({ error: 'Akun staf tidak aktif.' }, 403)
    const { data: superAdmin } = await admin.from('super_admins').select('user_id').eq('user_id', authData.user.id).maybeSingle()
    if (superAdmin) return json({ error: 'Gunakan workspace Super Admin untuk akun ini.' }, 403)
    if (assignment.permissions?.[requiredPermission] !== true) return json({ error: 'Izin untuk bagian ini tidak diberikan.' }, 403)

    if (action === 'users') {
      const users = []
      for (let page = 1; page <= 100; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) return json({ error: 'Daftar akun belum dapat dimuat.' }, 500)
        users.push(...(data.users || []).map(u => ({
          id: u.id, email: u.email || '', full_name: u.user_metadata?.full_name || '',
          created_at: u.created_at, last_sign_in_at: u.last_sign_in_at || null,
          banned_until: u.banned_until || null, is_platform_staff: false,
        })))
        if (!data.users || data.users.length < 1000) break
      }
      const { data: staffRows } = await admin.from('platform_staff_roles').select('user_id,is_active')
      const staffIds = new Map((staffRows || []).map(row => [row.user_id, row.is_active]))
      return json({ data: users.map(u => ({ ...u, is_platform_staff: staffIds.has(u.id), platform_staff_active: staffIds.get(u.id) ?? null })) })
    }
    if (action === 'stores') {
      const { data, error } = await admin.from('stores')
        .select('id,name,owner_name,owner_email,status,activated_at,expires_at,activation_days,created_at,deleted_at')
        .order('created_at', { ascending: false }).limit(1000)
      if (error) return json({ error: 'Daftar toko belum dapat dimuat.' }, 500)
      const ids = (data || []).map(row => row.id)
      const settings = ids.length ? await admin.from('store_settings').select('store_id,store_name').in('store_id', ids) : { data: [], error: null }
      const names = new Map((settings.data || []).map(row => [row.store_id, row.store_name]))
      return json({ data: (data || []).map(row => ({ ...row, name: String(names.get(row.id) || '').trim() || row.name })) })
    }
    if (action === 'reports') {
      const [usersResult, storesResult, membersResult, ordersResult] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from('stores').select('id,status,expires_at,created_at').limit(5000),
        admin.from('store_members').select('id,is_active').limit(10000),
        admin.from('orders').select('id,status,total,created_at').limit(10000),
      ])
      const stores = storesResult.data || []
      const orders = ordersResult.data || []
      return json({ data: {
        account_count: usersResult.data?.users?.length ?? null,
        account_count_limited: (usersResult.data?.users?.length || 0) >= 1000,
        store_count: stores.length, active_stores: stores.filter(s => s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date())).length,
        expired_stores: stores.filter(s => s.expires_at && new Date(s.expires_at) <= new Date()).length,
        active_memberships: (membersResult.data || []).filter(m => m.is_active).length,
        order_count: orders.length, order_total: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        source_errors: {
          accounts: usersResult.error ? 'Akun tidak tersedia' : null,
          stores: storesResult.error ? 'Data toko tidak tersedia' : null,
          memberships: membersResult.error ? 'Data keanggotaan tidak tersedia' : null,
          orders: ordersResult.error ? 'Data transaksi tidak tersedia' : null,
        },
      } })
    }
    if (action === 'support_inbox') {
      const { data, error } = await admin.from('support_messages').select('id,user_id,user_email,sender_id,sender_role,message,created_at')
        .order('created_at', { ascending: false }).limit(500)
      if (error) return json({ error: 'Kotak masuk bantuan belum dapat dimuat.' }, 500)
      const grouped = new Map()
      for (const message of data || []) {
        if (!grouped.has(message.user_id)) grouped.set(message.user_id, { user_id: message.user_id, email: message.user_email || 'Pengguna', latest: message, messages: [] })
        const thread = grouped.get(message.user_id)
        thread.messages.push(message)
        if (new Date(message.created_at) > new Date(thread.latest.created_at)) thread.latest = message
        if (!thread.email || thread.email === 'Pengguna') thread.email = message.user_email || thread.email
      }
      return json({ data: [...grouped.values()].sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at)) })
    }
    return json({ error: 'Operasi belum tersedia.' }, 400)
  } catch (error) {
    console.error('Platform staff workspace request failed:', error?.message || error)
    return json({ error: 'Permintaan workspace belum dapat diproses.' }, 500)
  }
}
