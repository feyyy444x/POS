import { useCallback, useEffect, useState } from 'react'
import { Building2, Check, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'

export default function OwnerOrganizationSettings({ session }) {
  const [organization, setOrganization] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('owner_organizations')
      .select('id,organization_name,owner_name,owner_email,updated_at')
      .eq('owner_user_id', session.user.id)
      .maybeSingle()
    if (loadError) {
      setOrganization(null)
      setError(userFacingError(loadError, 'Pengaturan organisasi belum dapat dimuat.'))
    } else if (!data) {
      setOrganization(null)
      setError('Organisasi Owner tidak ditemukan untuk akun ini.')
    } else {
      setOrganization(data)
      setName(data.organization_name || '')
    }
    setLoading(false)
  }, [session.user.id])

  useEffect(() => { load() }, [load])

  const save = async event => {
    event.preventDefault()
    const next = name.trim()
    if (next.length < 2 || next.length > 120) {
      setError('Nama organisasi harus 2 sampai 120 karakter.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const { data, error: saveError } = await supabase.rpc('owner_update_organization_profile', {
      p_organization_name: next,
    })
    setSaving(false)
    if (saveError) {
      setError(userFacingError(saveError, 'Nama organisasi belum berhasil disimpan. Pastikan PIN sudah diverifikasi.'))
      return
    }
    setOrganization(current => current ? { ...current, organization_name: data?.organization_name || next, updated_at: data?.updated_at || new Date().toISOString() } : current)
    setName(data?.organization_name || next)
    setNotice('Nama organisasi berhasil diperbarui.')
  }

  return <section className="page-section">
    <div className="page-heading">
      <div><span className="eyebrow muted">ORGANIZATION / CONTROL</span><h1>Pengaturan <span className="heading-accent">organisasi.</span></h1><p>Kelola identitas organisasi Owner. Nama organisasi terpisah dari nama workspace atau toko.</p></div>
      <span className="role-chip"><ShieldCheck size={14}/> OWNER</span>
    </div>
    {notice && <div className="toast" role="status"><Check size={16}/><span>{notice}</span></div>}
    {error && <div className="notice" role="alert">{error}</div>}
    <div className="settings-grid">
      <form className="panel settings-form" onSubmit={save}>
        <div className="panel-head"><div><h3><Building2 size={17}/> Identitas organisasi</h3><p>Perubahan disimpan pada profil organisasi milik akun Owner.</p></div></div>
        <label>Nama organisasi</label>
        <input className="text-input" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={120} required disabled={loading || saving || !organization} placeholder="Masukkan nama organisasi"/>
        <small className="field-help">2–120 karakter. Nama ini tidak mengubah nama toko/workspace, transaksi, atau struk.</small>
        <button className="btn btn-primary" disabled={loading || saving || !organization}>{saving ? <span className="spinner"/> : <Check size={16}/>} Simpan nama organisasi</button>
      </form>
      <div className="panel settings-info">
        <span className="settings-info-icon"><Building2 size={20}/></span>
        <h3>Informasi organisasi</h3>
        {loading ? <p>Memuat data organisasi…</p> : organization ? <>
          <p><strong>{organization.organization_name}</strong></p>
          <div className="info-line">Owner: {organization.owner_name || '—'}</div>
          <div className="info-line">Email: {organization.owner_email || session.user.email || '—'}</div>
          <div className="info-line">Terakhir diperbarui: {organization.updated_at ? new Date(organization.updated_at).toLocaleString('id-ID') : '—'}</div>
        </> : <p>Informasi organisasi belum tersedia.</p>}
        <button className="btn btn-outline btn-wide" type="button" onClick={load} disabled={loading}><RefreshCw size={15}/> Muat ulang</button>
      </div>
    </div>
  </section>
}
