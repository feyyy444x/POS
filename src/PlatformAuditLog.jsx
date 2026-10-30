import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileText, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'

const dateTime = value => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) : '—'
const pretty = value => value == null ? '—' : JSON.stringify(value, null, 2)

export default function PlatformAuditLog({ onBack }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('platform_audit_logs')
      .select('id,actor_user_id,organization_id,store_id,entity_table,entity_id,action,before_data,after_data,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (loadError) {
      setRows([])
      setError(userFacingError(loadError, 'Audit log belum dapat dimuat. Periksa migrasi dan hak akses Super Admin.'))
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row => [
      row.action, row.entity_table, row.entity_id, row.actor_user_id,
      row.organization_id, row.store_id, row.created_at,
    ].some(value => String(value || '').toLowerCase().includes(q)))
  }, [rows, query])

  return <div className="page-content">
    <div className="page-heading">
      <div><span className="eyebrow muted">PLATFORM / SECURITY</span><h1>Audit <span className="heading-accent">Log.</span></h1><p>Riwayat tindakan administratif dan perubahan data yang tercatat di platform.</p></div>
      <div className="staff-form-actions">
        <button className="btn btn-outline" type="button" onClick={onBack}><ArrowLeft size={15}/> Kembali</button>
        <button className="btn btn-outline" type="button" onClick={load} disabled={loading}><RefreshCw size={15}/> Muat ulang</button>
      </div>
    </div>
    {error && <div className="notice" role="alert">{error}</div>}
    <section className="panel">
      <div className="panel-head">
        <div><h3><ShieldCheck size={17}/> Catatan aktivitas</h3><p>{filtered.length} dari {rows.length} catatan terbaru · maksimal 200 baris</p></div>
      </div>
      <div className="search-box"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari aksi, tabel, ID entitas, atau aktor…"/></div>
      {loading ? <div className="empty-state"><RefreshCw size={20}/><p>Memuat audit log…</p></div>
        : filtered.length === 0 ? <div className="empty-state"><FileText size={22}/><strong>Belum ada catatan yang cocok</strong><p>{rows.length ? 'Ubah kata pencarian untuk melihat catatan lain.' : 'Belum ada aktivitas yang tercatat.'}</p></div>
        : <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Waktu</th><th>Aksi</th><th>Entitas</th><th>Aktor</th><th>Detail perubahan</th></tr></thead><tbody>
          {filtered.map(row => <tr key={row.id}>
            <td>{dateTime(row.created_at)}</td>
            <td><strong>{row.action}</strong></td>
            <td><div className="staff-person"><strong>{row.entity_table}</strong><small>{row.entity_id || 'ID tidak tersedia'}</small></div></td>
            <td><div className="staff-person"><strong>{row.actor_user_id ? String(row.actor_user_id).slice(0, 8) + '…' : 'Sistem'}</strong><small>{row.organization_id ? 'Org ' + String(row.organization_id).slice(0, 8) + '…' : row.store_id ? 'Toko ' + String(row.store_id).slice(0, 8) + '…' : 'Platform'}</small></div></td>
            <td><details><summary>Lihat sebelum / sesudah</summary><div className="audit-log-json"><strong>Sebelum</strong><pre>{pretty(row.before_data)}</pre><strong>Sesudah</strong><pre>{pretty(row.after_data)}</pre></div></details></td>
          </tr>)}
        </tbody></table></div>}
    </section>
  </div>
}
