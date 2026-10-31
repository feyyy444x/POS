import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Monitor, Save, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'
import './tv-display.css'

function makeToken() {
  const bytes = new Uint8Array(32)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function TvDisplaySettings({ store, settings, membership, onNotice }) {
  const [enabled, setEnabled] = useState(settings?.queue_enabled !== false)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const canManage = ['owner', 'admin'].includes(membership?.role)
  const storeId = store?.id
  const tvUrl = useMemo(() => token ? window.location.origin + window.location.pathname + '?screen=queue&token=' + encodeURIComponent(token) : '', [token])

  const notify = useCallback((message) => onNotice?.(message), [onNotice])

  const load = useCallback(async () => {
    if (!storeId || !supabase) { setLoading(false); return }
    setLoading(true)
    const [{ data: cfg, error: cfgError }, { data: tv, error: tvError }] = await Promise.all([
      supabase.from('store_settings').select('queue_enabled').eq('store_id', storeId).maybeSingle(),
      supabase.from('store_tv_settings').select('public_token').eq('store_id', storeId).maybeSingle(),
    ])
    if (cfgError || tvError) notify(userFacingError(cfgError || tvError, 'Pengaturan antrean belum dapat dimuat.'))
    if (cfg && typeof cfg.queue_enabled === 'boolean') setEnabled(cfg.queue_enabled)
    setToken(tv?.public_token || '')
    setLoading(false)
  }, [storeId, notify])

  useEffect(() => { load() }, [load])

  const saveEnabled = async (nextValue) => {
    if (!canManage || !storeId || !supabase) return
    setSaving(true)
    const next = { ...(settings || {}), store_id: storeId, queue_enabled: nextValue, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('store_settings').upsert(next, { onConflict: 'store_id' })
    setSaving(false)
    if (error) { notify(userFacingError(error, 'Status antrean gagal disimpan.')); return }
    setEnabled(nextValue)
    notify(nextValue ? 'Sistem antrean diaktifkan.' : 'Sistem antrean dinonaktifkan. Struk tidak akan menampilkan nomor antrean.')
  }

  const createUrl = async () => {
    if (!canManage || !storeId || !supabase) return
    setSaving(true)
    const nextToken = makeToken()
    const { error } = await supabase.from('store_tv_settings').upsert({ store_id: storeId, public_token: nextToken }, { onConflict: 'store_id' })
    setSaving(false)
    if (error) { notify(userFacingError(error, 'URL layar antrean gagal dibuat.')); return }
    setToken(nextToken)
    notify('URL layar antrean berhasil dibuat.')
  }

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(tvUrl); notify('URL layar antrean disalin.') }
    catch { notify('Gagal menyalin otomatis. Pilih URL lalu salin secara manual.') }
  }

  if (loading) return <div className="panel tv-settings-panel">Memuat pengaturan sistem antrean…</div>

  return <section className="page-section">
    <div className="page-heading">
      <div><span className="eyebrow muted">QUEUE / STORE SETTINGS</span><h1>Sistem <span className="heading-accent">antrean.</span></h1><p>Pengaturan sederhana untuk nomor, nama pelanggan, dan konter/kasir/loket.</p></div>
      <span className="role-chip"><ShieldCheck size={14}/>{canManage ? 'Owner / Admin' : 'Hanya lihat'}</span>
    </div>
    <div className="panel tv-settings-panel" style={{maxWidth:760}}>
      <div className="panel-head"><div><h3><Monitor size={17}/> Status sistem antrean</h3><p>Jika dinonaktifkan, kasir tidak membuat nomor antrean dan struk tidak menampilkan nomor antrean.</p></div></div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',padding:'16px 0'}}>
        <div><strong>{enabled ? 'Sistem antrean aktif' : 'Sistem antrean nonaktif'}</strong><p className="tv-settings-muted">{enabled ? 'Nomor antrean dan layar panggilan tersedia.' : 'Transaksi tetap berjalan tanpa nomor antrean.'}</p></div>
        <button className={'btn '+(enabled?'btn-outline':'btn-primary')} disabled={!canManage||saving} onClick={()=>saveEnabled(!enabled)}>{saving?<span className="spinner"/>:enabled?'Nonaktifkan antrean':'Aktifkan antrean'}</button>
      </div>
      <div className="divider"/>
      <div style={{paddingTop:16}}>
        <h3>Layar antrean</h3>
        <p className="tv-settings-muted">Layar hanya menampilkan nomor antrean, nama, dan konter/kasir/loket. Tidak ada media, video, playlist, atau template layar.</p>
        {tvUrl ? <><label className="field-label" htmlFor="queue-tv-url">URL layar antrean</label><div className="tv-url-row"><input id="queue-tv-url" className="text-input" readOnly value={tvUrl}/><button className="btn btn-outline" onClick={copyUrl}><Copy size={15}/> Salin</button></div><div className="tv-url-actions"><button className="btn btn-outline" onClick={()=>window.open(tvUrl,'_blank','noopener,noreferrer')}><ExternalLink size={15}/> Buka layar</button><button className="btn btn-outline" disabled={!canManage||saving} onClick={createUrl}>Buat URL baru</button></div></> : <><p className="tv-settings-muted">Belum ada URL publik. Buat URL untuk menampilkan antrean pada layar TV.</p><button className="btn btn-primary" disabled={!canManage||saving} onClick={createUrl}>{saving?<span className="spinner"/>:<><Monitor size={15}/> Buat URL layar antrean</>}</button></>}
      </div>
      {!canManage&&<p className="tv-settings-muted">Hanya Owner atau Admin yang dapat mengubah pengaturan ini.</p>}
    </div>
  </section>
}
