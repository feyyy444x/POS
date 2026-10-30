import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, RefreshCw, Search, ShieldCheck, Store, Users } from 'lucide-react'
import { supabase } from './lib/supabase'

const dateTime = value => value ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function OrganizationOperations({ mode = 'team', tenants = [] }) {
  const [members, setMembers] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const tenantIds = useMemo(() => tenants.filter(t => t.status === 'active' && !t.deleted_at).map(t => t.id), [tenants])
  const tenantKey = tenantIds.join(',')
  const tenantNames = useMemo(() => Object.fromEntries(tenants.map(t => [t.id, t.name || 'Tenant'])), [tenants])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    if (!supabase || !tenantIds.length) {
      setMembers([])
      setShifts([])
      setError(!supabase ? 'Koneksi database belum tersedia.' : 'Belum ada tenant aktif pada organisasi ini.')
      setLoading(false)
      return
    }
    if (mode === 'team') {
      const { data, error: loadError } = await supabase.from('store_members')
        .select('id,store_id,user_id,role,email,full_name,is_active,disabled_at')
        .in('store_id', tenantIds)
        .order('full_name', { ascending: true })
        .limit(2000)
      if (loadError) {
        setMembers([])
        setError('Data karyawan lintas tenant tidak dapat dibaca. Pastikan migrasi akses Owner lintas tenant sudah diterapkan dan kebijakan RLS aktif. Detail: ' + loadError.message)
      } else setMembers(data || [])
    } else {
      const { data, error: loadError } = await supabase.from('cashier_shifts')
        .select('id,store_id,cashier_id,cashier_name_snapshot,opened_at,closed_at')
        .in('store_id', tenantIds)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(500)
      if (loadError) {
        setShifts([])
        setError('Data monitoring kasir lintas tenant tidak dapat dibaca. Pastikan akses Owner dan kebijakan RLS sudah aktif. Detail: ' + loadError.message)
      } else setShifts(data || [])
    }
    setLoading(false)
  }, [mode, tenantKey])

  useEffect(() => { load() }, [load])

  const filteredMembers = members.filter(member => {
    const value = [member.full_name, member.email, member.role, tenantNames[member.store_id]].join(' ').toLocaleLowerCase('id-ID')
    return value.includes(query.toLocaleLowerCase('id-ID'))
  })
  const people = new Map()
  for (const member of members) {
    const key = member.user_id || member.email || member.id
    if (!people.has(key)) people.set(key, { ...member, assignments: [] })
    people.get(key).assignments.push(member)
  }
  const openCashiers = new Set(shifts.map(item => item.cashier_id).filter(Boolean)).size

  return <section className="owner-operations-page">
    <div className="owner-section-heading owner-page-heading">
      <div><span className="owner-kicker">{mode === 'team' ? 'ORGANIZATION PEOPLE' : 'LIVE OPERATIONS'}</span><h2>{mode === 'team' ? 'Karyawan & Hak Akses' : 'Monitoring'}</h2><p>{mode === 'team' ? 'Daftar akun dan penugasan per tenant dalam organisasi.' : 'Pantau sesi kasir yang sedang terbuka di seluruh tenant organisasi.'}</p></div>
      <button className="owner-refresh-button" onClick={load} disabled={loading}>{loading ? <span className="owner-spin"><RefreshCw size={15}/></span> : <RefreshCw size={15}/>} Perbarui</button>
    </div>
    {error && <div className="owner-notice" role="alert">{error}</div>}
    {mode === 'team' ? <>
      <div className="owner-operations-summary"><div><Users size={19}/><span><strong>{people.size}</strong><small>Akun karyawan</small></span></div><div><Store size={19}/><span><strong>{tenantIds.length}</strong><small>Tenant aktif</small></span></div><div><ShieldCheck size={19}/><span><strong>{members.filter(m => m.role === 'owner').length}</strong><small>Penugasan Owner</small></span></div></div>
      <label className="owner-tenant-toolbar owner-team-search"><span><Search size={17}/></span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, email, role, atau tenant..."/><small>{filteredMembers.length} penugasan</small></label>
      <div className="owner-table-wrap"><table><thead><tr><th>Nama / Email</th><th>Role</th><th>Tenant</th><th>Status</th></tr></thead><tbody>
        {filteredMembers.map(member => <tr key={member.id}><td><strong>{member.full_name || 'Nama belum diatur'}</strong><small>{member.email || member.user_id || '—'}</small></td><td><span className="owner-role-chip">{member.role === 'admin' ? 'Admin Tenant' : member.role === 'cashier' ? 'Kasir' : member.role === 'owner' ? 'Owner' : member.role}</span></td><td>{tenantNames[member.store_id] || 'Tenant'}</td><td><span className={'owner-status '+(member.is_active && !member.disabled_at ? 'is-active' : '')}>{member.is_active && !member.disabled_at ? 'Aktif' : 'Nonaktif'}</span></td></tr>)}
      </tbody></table>{!loading && !error && !filteredMembers.length && <div className="owner-no-tenant">Belum ada penugasan karyawan yang cocok.</div>}</div>
      <p className="owner-data-footnote">Satu akun dapat memiliki penugasan pada beberapa tenant. Pengubahan role dan pengelolaan undangan tetap dilakukan dari workspace tenant terkait.</p>
    </> : <>
      <div className="owner-operations-summary"><div><Activity size={19}/><span><strong>{shifts.length}</strong><small>Sesi kasir terbuka</small></span></div><div><Users size={19}/><span><strong>{openCashiers}</strong><small>Kasir aktif</small></span></div><div><Store size={19}/><span><strong>{new Set(shifts.map(s => s.store_id)).size}</strong><small>Tenant beroperasi</small></span></div></div>
      <div className="owner-table-wrap"><table><thead><tr><th>Kasir</th><th>Tenant</th><th>Mulai sesi</th><th>Status</th></tr></thead><tbody>
        {shifts.map(shift => <tr key={shift.id}><td><strong>{shift.cashier_name_snapshot || 'Kasir'}</strong><small>{shift.cashier_id || '—'}</small></td><td>{tenantNames[shift.store_id] || 'Tenant'}</td><td>{dateTime(shift.opened_at)}</td><td><span className="owner-status is-active">Sesi terbuka</span></td></tr>)}
      </tbody></table>{!loading && !error && !shifts.length && <div className="owner-no-tenant">Tidak ada sesi kasir yang sedang terbuka.</div>}</div>
      <p className="owner-data-footnote">Monitoring ini menampilkan sesi kasir yang masih terbuka. Status transaksi dan laporan penjualan tersedia pada menu Laporan Gabungan.</p>
    </>}
  </section>
}