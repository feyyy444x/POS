import { useCallback, useEffect, useState } from 'react'
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'

const dateTime = value => value ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function AuditLogPanel({ scope = 'organization', organizationId = null, storeId = null }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    if (!supabase) {
      setRows([])
      setError('Koneksi database belum tersedia.')
      setLoading(false)
      return
    }
    let query = supabase.from('platform_audit_logs')
      .select('id,actor_user_id,organization_id,store_id,entity_table,entity_id,action,before_data,after_data,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (scope === 'organization') {
      if (!organizationId) {
        setRows([])
        setError('Organisasi Owner belum terhubung.')
        setLoading(false)
        return
      }
      query = query.eq('organization_id', organizationId)
    } else if (scope === 'store') {
      if (!storeId) {
        setRows([])
        setError('Tenant belum dipilih.')
        setLoading(false)
        return
      }
      query = query.eq('store_id', storeId)
    }
    const { data, error: loadError } = await query
    if (loadError) {
      setRows([])
      setError(['42P01','PGRST205'].includes(loadError.code) || /platform_audit_logs/i.test(loadError.message || '') ? 'Tabel audit log belum tersedia di database ini. Terapkan migrasi platform_audit_logs setelah migrasi organisasi Owner.' : (loadError.message || 'Akses audit log ditolak. Periksa role akun dan kebijakan RLS.'))
    } else setRows(data || [])
    setLoading(false)
  }, [scope, organizationId, storeId])

  useEffect(() => {
    load()
    if (!supabase) return
    const filter = scope === 'organization' && organizationId
      ? 'organization_id=eq.' + organizationId
      : scope === 'store' && storeId ? 'store_id=eq.' + storeId : null
    const config = { event: 'INSERT', schema: 'public', table: 'platform_audit_logs' }
    if (filter) config.filter = filter
    const channel = supabase.channel('nexapos-audit-' + scope + '-' + (organizationId || storeId || 'platform'))
      .on('postgres_changes', config, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, scope, organizationId, storeId])

  return <section className="page-section">
    <div className="page-heading">
      <div><span className="eyebrow muted">SECURITY / AUDIT TRAIL</span><h1>Audit <span className="heading-accent">aktivitas.</span></h1><p>Riwayat perubahan terbaru yang dicatat database. Maksimal 100 kejadian terakhir pada cakupan akses Anda.</p></div>
      <span className="role-chip"><ShieldCheck size={14}/> {scope === 'platform' ? 'PLATFORM' : 'ORGANISASI'}</span>
    </div>
    <div className="panel tenant-list-panel">
      <div className="panel-head"><div><h3><Activity size={17}/> Riwayat audit</h3><p>Data diambil dari audit log backend; izin baca tetap dibatasi oleh RLS.</p></div><button type="button" className="btn btn-outline btn-small" onClick={load} disabled={loading}>{loading ? <span className="spinner"/> : <RefreshCw size={14}/>} Muat ulang</button></div>
      {error ? <div className="empty-state"><strong>Audit log belum tersedia</strong><p>{error}</p></div> : loading ? <div className="empty-state"><span className="spinner spinner-large"/></div> : rows.length === 0 ? <div className="empty-state"><strong>Belum ada aktivitas tercatat</strong><p>Perubahan baru akan muncul setelah audit migration diterapkan.</p></div> : <div className="table-wrap"><table><thead><tr><th>Waktu (WIB)</th><th>Aktor</th><th>Aksi</th><th>Entitas</th><th>Detail</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{dateTime(row.created_at)}</td><td><small className="mono">{row.actor_user_id || 'Sistem'}</small></td><td><span className={'status-pill ' + (row.action === 'DELETE' ? 'status-inactive' : row.action === 'INSERT' ? 'status-paid' : 'status-waiting')}>{row.action}</span></td><td><strong>{row.entity_table}</strong><br/><small className="mono">{row.entity_id || '—'}</small></td><td><details><summary>Lihat perubahan</summary><div style={{minWidth:220,maxWidth:480,whiteSpace:'normal',overflowWrap:'anywhere'}}><strong>Sebelum</strong><pre style={{whiteSpace:'pre-wrap',fontSize:11,maxHeight:180,overflow:'auto'}}>{row.before_data ? JSON.stringify(row.before_data, null, 2) : '—'}</pre><strong>Sesudah</strong><pre style={{whiteSpace:'pre-wrap',fontSize:11,maxHeight:180,overflow:'auto'}}>{row.after_data ? JSON.stringify(row.after_data, null, 2) : '—'}</pre></div></details></td></tr>)}</tbody></table></div>}
    </div>
  </section>
}
