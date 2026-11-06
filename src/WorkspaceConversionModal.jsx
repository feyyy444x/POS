import { useMemo, useState } from 'react'
import { ArrowRight, Building2, CalendarDays, CheckCircle2, ShieldCheck, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'

export default function WorkspaceConversionModal({ tenant, packages = [], durations = [], onClose, onSuccess }) {
  const activePackages = useMemo(() => packages.filter(item =>
    item.is_active !== false && ['starter', 'growth', 'business', 'enterprise', 'special'].includes(item.package_key)
  ), [packages])
  const activeDurations = useMemo(() => durations.filter(item => item.is_active !== false), [durations])
  const [companyName, setCompanyName] = useState(tenant?.company_name || tenant?.name || '')
  const [packageKey, setPackageKey] = useState(() =>
    activePackages.some(item => item.package_key === 'enterprise') ? 'enterprise' :
    activePackages.find(item => item.package_key !== 'special')?.package_key || 'growth'
  )
  const [quotaMode, setQuotaMode] = useState('package')
  const [customQuota, setCustomQuota] = useState('3')
  const [durationKey, setDurationKey] = useState(() => activeDurations.find(item => item.duration_key === 'yearly')?.duration_key || activeDurations[0]?.duration_key || 'monthly')
  const [customDays, setCustomDays] = useState('30')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedDuration = activeDurations.find(item => item.duration_key === durationKey)
  const days = durationKey === 'custom' ? Number(customDays) : Number(selectedDuration?.duration_days)
  const selectedPackage = activePackages.find(item => item.package_key === packageKey)
  const needsCustomQuota = quotaMode === 'custom' || packageKey === 'special'
  const quota = needsCustomQuota ? Number(customQuota) : Number(selectedPackage?.location_limit)
  const valid = companyName.trim().length >= 2 && Number.isInteger(days) && days >= 1 && days <= 36500
    && Number.isInteger(quota) && quota >= 1 && quota <= 1000
    && (packageKey === 'custom' || Boolean(selectedPackage))

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (!valid) {
      setError('Periksa nama perusahaan, paket, kuota, dan masa langganan.')
      return
    }
    const finalPackageKey = quotaMode === 'custom' ? 'custom' : packageKey
    const finalQuota = needsCustomQuota ? quota : null
    const confirmed = window.confirm(
      'Konversi ' + (tenant?.name || 'Workspace Only') + ' menjadi Perusahaan Berlangganan?\n\n' +
      'Paket: ' + (finalPackageKey === 'custom' ? 'Custom' : selectedPackage?.name || finalPackageKey) +
      '\nDurasi: ' + days + ' hari\nKuota tenant tambahan: ' + quota +
      '\n\nID workspace, produk, stok, transaksi, karyawan, pengaturan, dan riwayat akan dipertahankan.'
    )
    if (!confirmed) return

    setBusy(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('convert_single_workspace_to_company', {
        p_store_id: tenant.id,
        p_organization_name: companyName.trim(),
        p_package_key: finalPackageKey,
        p_duration_days: days,
        p_location_limit: finalQuota,
      })
      if (rpcError) throw rpcError
      const result = Array.isArray(data) ? data[0] : data
      if (!result?.organization_id || result.store_id !== tenant.id) {
        throw new Error('Konversi belum dapat diverifikasi. Muat ulang daftar sebelum mencoba kembali.')
      }
      await onSuccess?.(result)
    } catch (cause) {
      setError(userFacingError(cause, 'Konversi Workspace Only belum berhasil. Tidak ada perubahan parsial yang disimpan.'))
    } finally {
      setBusy(false)
    }
  }

  return <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose?.() }}
    style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(27,38,34,.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <section role="dialog" aria-modal="true" aria-labelledby="workspace-conversion-title"
      style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', background: '#fff', color: '#34413b', border: '1px solid #e2e7df', borderRadius: 18, padding: 22, boxShadow: '0 24px 80px rgba(0,0,0,.25)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#edf4ef', color: '#426c57' }}><Building2 size={21}/></span>
          <div><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: '#78847a' }}>KONVERSI WORKSPACE</span><h2 id="workspace-conversion-title" style={{ margin: '3px 0 0', fontSize: 20 }}>Upgrade ke Perusahaan</h2></div>
        </div>
        <button type="button" aria-label="Tutup konversi" disabled={busy} onClick={onClose} style={{ border: '1px solid #e1e6df', borderRadius: 10, background: '#fff', color: '#647168', width: 34, height: 34, display: 'grid', placeItems: 'center' }}><X size={17}/></button>
      </header>
      <p style={{ color: '#6e7b72', fontSize: 13, lineHeight: 1.6, margin: '14px 0' }}>
        Workspace ini akan menjadi workspace utama dalam Pusat Kendali perusahaan. Data operasional tidak dipindahkan atau dibuat ulang.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Nama perusahaan
          <input className="text-input" value={companyName} onChange={event => setCompanyName(event.target.value)} maxLength={120} required/>
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Paket langganan
          <select className="text-input" value={packageKey} onChange={event => setPackageKey(event.target.value)}>
            {activePackages.filter(item => item.package_key !== 'special').map(item => <option key={item.package_key} value={item.package_key}>{item.name} · {item.location_limit} tenant tambahan</option>)}
            {activePackages.some(item => item.package_key === 'special') && <option value="special">Khusus — tentukan kuota</option>}
            <option value="custom">Custom — tentukan kuota sendiri</option>
          </select>
        </label>
        {(needsCustomQuota || packageKey === 'custom') && <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Kuota tenant tambahan
          <input className="text-input" type="number" min="1" max="1000" step="1" value={customQuota} onChange={event => setCustomQuota(event.target.value)} required/>
        </label>}
        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Masa langganan
          <select className="text-input" value={durationKey} onChange={event => setDurationKey(event.target.value)}>
            {activeDurations.map(item => <option key={item.duration_key} value={item.duration_key}>{item.name} · {item.duration_days} hari</option>)}
          </select>
        </label>
        {durationKey === 'custom' && <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Durasi custom (hari)
          <input className="text-input" type="number" min="1" max="36500" step="1" value={customDays} onChange={event => setCustomDays(event.target.value)} required/>
        </label>}
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', border: '1px solid #dce8df', background: '#f5f8f5', borderRadius: 12, padding: 12, color: '#52695a', fontSize: 12, lineHeight: 1.55 }}>
          <ShieldCheck size={17} style={{ flex: '0 0 auto', marginTop: 1 }}/>
          <span>Admin CHILLPOS dapat menjalankan konversi setelah PIN terverifikasi. Proses ini mempertahankan ID workspace dan seluruh data; sistem mencatat perubahan pada audit aktivitas.</span>
        </div>
        {error && <div role="alert" className="notice">{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 4 }}>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !valid}>{busy ? <span className="spinner"/> : <CheckCircle2 size={15}/>} Konversi & aktifkan <ArrowRight size={15}/></button>
        </div>
      </form>
    </section>
  </div>
}
