import { useEffect, useState } from 'react'
import { Building2, Save, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'

export default function OrganizationSettings({ organization, session, onSaved }) {
  const [name, setName] = useState(organization?.organization_name || '')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setName(organization?.organization_name || '')
  }, [organization?.id, organization?.organization_name])

  const save = async event => {
    event.preventDefault()
    const value = name.trim()
    if (value.length < 2 || value.length > 120) {
      setNotice('Nama perusahaan harus 2 sampai 120 karakter.')
      return
    }
    setSaving(true)
    setNotice('')
    const { data, error } = await supabase.rpc('owner_update_organization_profile', {
      p_organization_name: value,
    })
    setSaving(false)
    if (error) {
      setNotice(userFacingError(error, 'Nama perusahaan belum berhasil disimpan.'))
      return
    }
    setNotice('Nama perusahaan berhasil diperbarui dan tersimpan di database.')
    onSaved?.(data)
  }

  return <section className="owner-settings-card">
    <span className="owner-kicker">NEXASPACE · ORGANIZATION PRESENCE</span>
    <h2>NexaSpace</h2>
    <p>Kelola identitas digital perusahaan. Nama yang disimpan akan menjadi sumber identitas perusahaan di seluruh panel NexaPos.</p>
    <form onSubmit={save} className="owner-organization-settings-form">
      <label>Nama perusahaan
        <input className="text-input" value={name} onChange={event => setName(event.target.value)} maxLength={120} minLength={2} required placeholder="Contoh: PT. Nexa Niaga"/>
      </label>
      <div className="owner-setting-row"><span>Email pemilik</span><strong>{organization?.owner_email || session?.user?.email || '—'}</strong></div>
      <div className="owner-setting-row"><span>Nama akun Owner</span><strong>{organization?.owner_name || 'Belum diatur'}</strong></div>
      <div className="owner-setting-row"><span>Status perusahaan</span><strong className="owner-setting-status">{organization?.status || 'unknown'}</strong></div>
      {notice && <div className="owner-notice" role="status">{notice}</div>}
      <button className="btn btn-primary" type="submit" disabled={saving || name.trim() === (organization?.organization_name || '')}>
        {saving ? <RefreshCw size={15} className="owner-spin"/> : <Save size={15}/>} Simpan nama perusahaan
      </button>
    </form>
    <small className="owner-data-footnote"><Building2 size={14}/> NexaSpace adalah ruang identitas perusahaan Owner, terpisah dari workspace operasional tenant.</small>
    <small className="owner-data-footnote"><ShieldCheck size={14}/> Perubahan memerlukan sesi Owner terverifikasi PIN.</small>
  </section>
}
