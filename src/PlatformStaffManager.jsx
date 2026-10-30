import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, RefreshCw, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'

const ADMIN_PERMISSIONS = [
  ['users', 'Manajemen pengguna', 'Melihat daftar akun dan statusnya'],
  ['stores', 'Manajemen toko', 'Melihat dan mengelola data toko'],
  ['support', 'Pusat bantuan', 'Melihat dan menangani keluhan pelanggan'],
  ['promotions', 'Promo & diskon', 'Mengelola promosi website'],
  ['plans', 'Paket & harga', 'Melihat dan mengelola paket'],
  ['system_reports', 'Laporan sistem', 'Melihat laporan dan masalah sistem'],
]
const defaultPermissions = () => Object.fromEntries(ADMIN_PERMISSIONS.map(([key]) => [key, true]))

export default function PlatformStaffManager({ onBack }) {
  const [staff, setStaff] = useState([])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)
  const [createAccount, setCreateAccount] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('super_admin_list_platform_staff')
      if (error) {
        setStaff([])
        setNotice(userFacingError(error, 'Daftar tim belum dapat dimuat. Pastikan migrasi role sudah diterapkan.'))
      } else {
        setStaff(data || [])
        setNotice('')
      }
    } catch (error) {
      setStaff([])
      setNotice(userFacingError(error, 'Daftar tim belum dapat dimuat. Periksa koneksi lalu coba lagi.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setEditing(null); setEmail(''); setFullName(''); setPassword('')
    setCreateAccount(true)
  }
  const beginEdit = member => {
    setEditing(member); setEmail(member.email || ''); setFullName(member.full_name || '')
    setPassword('')
  }

  const save = async event => {
    event.preventDefault()
    setNotice('')
    if (!email.trim()) { setNotice('Masukkan email akun staf.'); return }
    setSaving(true)
    try {
      if (!editing && createAccount) {
        if (password.length < 6) throw new Error('Password awal minimal 6 karakter.')
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData?.session?.access_token) throw new Error('Sesi Super Admin berakhir. Silakan login ulang.')
        const response = await fetch('/.netlify/functions/create-platform-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sessionData.session.access_token },
          body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), password, role: 'admin', permissions: defaultPermissions() }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Akun staf belum berhasil dibuat.')
      } else {
        const { error } = await supabase.rpc('super_admin_set_platform_staff', {
          p_email: email.trim(), p_role: 'admin', p_permissions: defaultPermissions(),
          p_is_active: editing ? editing.is_active : true,
        })
        if (error) throw error
      }
      setNotice(editing || !createAccount ? 'Role dan hak akses berhasil disimpan.' : 'Akun staf berhasil dibuat dan role sudah diberikan.')
      resetForm()
      await load()
    } catch (error) {
      setNotice(userFacingError(error, 'Perubahan role belum berhasil disimpan.'))
    } finally { setSaving(false) }
  }

  const toggleActive = async member => {
    setNotice('')
    try {
      const { error } = await supabase.rpc('super_admin_set_platform_staff', {
        p_email: member.email, p_role: 'admin', p_permissions: defaultPermissions(), p_is_active: !member.is_active,
      })
      if (error) throw error
      await load()
      setNotice(member.is_active ? 'Akses staf dinonaktifkan.' : 'Akses staf diaktifkan kembali.')
    } catch (error) {
      setNotice(userFacingError(error, 'Status akses staf belum berhasil diubah.'))
    }
  }
  const remove = async member => {
    if (!confirm('Hapus penugasan role NexaPos untuk ' + member.email + '? Akun login tidak akan dihapus.')) return
    setNotice('')
    try {
      const { error } = await supabase.rpc('super_admin_remove_platform_staff', { p_user_id: member.user_id })
      if (error) throw error
      if (editing?.user_id === member.user_id) resetForm()
      await load()
      setNotice('Penugasan role dihapus. Akun login tetap ada.')
    } catch (error) {
      setNotice(userFacingError(error, 'Penugasan role belum berhasil dihapus.'))
    }
  }
  return <div className="page-content platform-staff-page">
    <div className="page-heading">
      <div><span className="eyebrow muted">AKSES INTERNAL NEXAPOS</span><h1>Manajemen Tim & Hak Akses</h1><p><strong>Hanya ada satu role staf platform: Admin NEXAPOS dengan FULL AKSES setara Super Admin.</strong></p></div>
      <div className="staff-form-actions"><button className="btn btn-outline" type="button" onClick={onBack}><ArrowLeft size={15}/> Kembali</button><button className="btn btn-outline" type="button" onClick={load} disabled={loading}><RefreshCw size={15}/> Muat ulang</button></div>
    </div>
    {notice && <div className="notice" role="status">{notice}</div>}
    <div className="staff-layout">
      <section className="panel staff-form-panel">
        <div className="panel-heading"><span className="panel-icon"><UserCog size={19}/></span><div><h2>{editing ? 'Ubah akses staf' : 'Tambah staf'}</h2><p>{editing ? 'Ubah role tanpa mengubah akun login.' : 'Buat akun Admin NEXAPOS dengan akses setara Super Admin.'}</p></div></div>
        <form onSubmit={save} className="settings-form staff-form">
          {!editing && <label className="permission-option"><input type="checkbox" checked={createAccount} onChange={event => setCreateAccount(event.target.checked)}/><span className="permission-copy"><strong>Buat akun login baru</strong><small>Matikan pilihan ini jika email sudah punya akun NexaPos.</small></span></label>}
          <label htmlFor="platform-staff-name">Nama staf</label>
          <input id="platform-staff-name" className="text-input" type="text" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Nama lengkap" autoComplete="name" disabled={Boolean(editing)} />
          <label htmlFor="platform-staff-email">Email akun</label>
          <input id="platform-staff-email" className="text-input" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@contoh.com" required disabled={Boolean(editing)} autoComplete="email" />
          {!editing && createAccount && <>
            <label htmlFor="platform-staff-password">Password awal</label>
            <input id="platform-staff-password" className="text-input" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Minimal 6 karakter" required minLength={6} autoComplete="new-password" />
            <small>Berikan password ini kepada staf secara pribadi. Staf dapat menggantinya setelah masuk.</small>
          </>}
          <label htmlFor="platform-staff-role">Role</label>
          <div id="platform-staff-role" className="text-input" aria-readonly="true">Admin NEXAPOS — FULL AKSES</div>
          <div className="permission-heading"><strong>Hak akses</strong><span>FULL AKSES</span></div>
          <div className="permission-option" role="status"><span className="permission-copy"><strong>FULL AKSES — setara Super Admin</strong><small>Seluruh menu dan tindakan administrasi platform tersedia.</small></span></div>
          <div className="staff-safety-note"><ShieldCheck size={17}/><span>Admin NEXAPOS mendapat akses dan tampilan yang sama dengan Super Admin setelah verifikasi PIN. Role Admin toko/tenant tidak terpengaruh.</span></div>
          <div className="staff-form-actions"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : createAccount ? 'Buat akun & tambahkan staf' : 'Tambahkan staf'} <Check size={15}/></button>{editing && <button className="btn btn-outline" type="button" onClick={resetForm}>Batal</button>}</div>
        </form>
      </section>
      <section className="panel staff-list-panel">
        <div className="panel-heading"><span className="panel-icon"><Users size={19}/></span><div><h2>Tim internal</h2><p>{staff.length} penugasan role</p></div></div>
        {loading ? <div className="empty-state"><RefreshCw size={20}/><p>Memuat anggota tim…</p></div> : staff.length === 0 ? <div className="empty-state"><Users size={23}/><strong>Belum ada staf</strong><p>Tambahkan akun Admin NEXAPOS untuk memberikan akses internal.</p></div> :
          <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Anggota</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
            {staff.map(member => <tr key={member.user_id}><td><div className="staff-person"><strong>{member.full_name || member.email}</strong><small>{member.email}</small></div></td><td><span className="staff-role-pill">Admin NEXAPOS</span><small className="staff-permission-count">FULL AKSES · Setara Super Admin</small></td><td><span className={'staff-status '+(member.is_active ? 'is-active' : 'is-inactive')}>{member.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td><div className="staff-actions"><button className="btn btn-small btn-outline" type="button" onClick={() => beginEdit(member)}>Ubah</button><button className="btn btn-small btn-outline" type="button" onClick={() => toggleActive(member)}>{member.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button><button className="icon-button" type="button" title="Hapus penugasan role" aria-label={'Hapus role '+member.email} onClick={() => remove(member)}><Trash2 size={15}/></button></div></td></tr>)}
          </tbody></table></div>}

      </section>
    </div>
  </div>
}
