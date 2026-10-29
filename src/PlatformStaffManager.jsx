import { useCallback, useEffect, useState } from 'react'
import { Check, Headphones, RefreshCw, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react'
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
const CS_PERMISSIONS = [
  ['support', 'Pusat bantuan', 'Melihat dan menangani keluhan pelanggan'],
  ['users_read', 'Informasi akun terbatas', 'Melihat status akun untuk membantu pelanggan'],
]
const defaultPermissions = role => Object.fromEntries((role === 'admin' ? ADMIN_PERMISSIONS : CS_PERMISSIONS).map(([key]) => [key, true]))

export default function PlatformStaffManager() {
  const [staff, setStaff] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [permissions, setPermissions] = useState(() => defaultPermissions('admin'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('super_admin_list_platform_staff')
    if (error) setNotice(userFacingError(error, 'Daftar tim belum dapat dimuat. Pastikan migrasi role sudah diterapkan.'))
    else { setStaff(data || []); setNotice('') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const beginEdit = member => {
    setEditing(member)
    setEmail(member.email || '')
    setRole(member.role)
    setPermissions({ ...defaultPermissions(member.role), ...(member.permissions || {}) })
  }
  const changeRole = next => {
    setRole(next)
    setPermissions(defaultPermissions(next))
  }
  const save = async event => {
    event.preventDefault()
    setNotice('')
    if (!email.trim()) { setNotice('Masukkan email akun yang sudah terdaftar.'); return }
    setSaving(true)
    const { error } = await supabase.rpc('super_admin_set_platform_staff', {
      p_email: email.trim(),
      p_role: role,
      p_permissions: permissions,
      p_is_active: editing ? editing.is_active : true,
    })
    setSaving(false)
    if (error) { setNotice(userFacingError(error, 'Perubahan role belum berhasil disimpan.')); return }
    setNotice('Role dan hak akses berhasil disimpan.')
    setEmail(''); setRole('admin'); setPermissions(defaultPermissions('admin')); setEditing(null)
    await load()
  }
  const toggleActive = async member => {
    const { error } = await supabase.rpc('super_admin_set_platform_staff', {
      p_email: member.email, p_role: member.role, p_permissions: member.permissions || {}, p_is_active: !member.is_active,
    })
    if (error) { setNotice(userFacingError(error)); return }
    setNotice(member.is_active ? 'Akses staf dinonaktifkan.' : 'Akses staf diaktifkan kembali.')
    await load()
  }
  const remove = async member => {
    if (!confirm('Hapus penugasan role NexaPos untuk ' + member.email + '? Akun login tidak akan dihapus.')) return
    const { error } = await supabase.rpc('super_admin_remove_platform_staff', { p_user_id: member.user_id })
    if (error) { setNotice(userFacingError(error)); return }
    setNotice('Penugasan role dihapus. Akun login tetap ada.')
    if (editing?.user_id === member.user_id) { setEditing(null); setEmail('') }
    await load()
  }
  const available = role === 'admin' ? ADMIN_PERMISSIONS : CS_PERMISSIONS

  return <div className="page-content platform-staff-page">
    <div className="page-heading">
      <div><span className="eyebrow muted">AKSES INTERNAL NEXAPOS</span><h1>Manajemen Tim & Hak Akses</h1><p>Atur Admin dan Customer Service tanpa memberikan kendali Owner.</p></div>
      <button className="btn btn-outline" type="button" onClick={load} disabled={loading}><RefreshCw size={15}/> Muat ulang</button>
    </div>
    {notice && <div className="notice" role="status">{notice}</div>}
    <div className="staff-layout">
      <section className="panel staff-form-panel">
        <div className="panel-heading"><span className="panel-icon"><UserCog size={19}/></span><div><h2>{editing ? 'Ubah akses staf' : 'Tambah staf'}</h2><p>Akun harus sudah terdaftar di NexaPos.</p></div></div>
        <form onSubmit={save} className="settings-form staff-form">
          <label htmlFor="platform-staff-email">Email akun</label>
          <input id="platform-staff-email" className="text-input" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@contoh.com" required disabled={Boolean(editing)} />
          <label htmlFor="platform-staff-role">Role</label>
          <select id="platform-staff-role" className="text-input" value={role} onChange={event => changeRole(event.target.value)}>
            <option value="admin">Admin</option><option value="customer_service">Customer Service</option>
          </select>
          <div className="permission-heading"><strong>Hak akses</strong><span>{Object.values(permissions).filter(Boolean).length} dipilih</span></div>
          <div className="permission-list">
            {available.map(([key, title, description]) => <label className="permission-option" key={key}>
              <input type="checkbox" checked={Boolean(permissions[key])} onChange={event => setPermissions(current => ({ ...current, [key]: event.target.checked }))}/>
              <span className="permission-copy"><strong>{title}</strong><small>{description}</small></span>
            </label>)}
          </div>
          <div className="staff-safety-note"><ShieldCheck size={17}/><span>Role staf tidak dapat mengambil alih Owner. Izin sensitif harus tetap dibatasi di backend.</span></div>
          <div className="staff-form-actions"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Tambahkan staf'} <Check size={15}/></button>{editing && <button className="btn btn-outline" type="button" onClick={() => { setEditing(null); setEmail(''); setRole('admin'); setPermissions(defaultPermissions('admin')) }}>Batal</button>}</div>
        </form>
      </section>
      <section className="panel staff-list-panel">
        <div className="panel-heading"><span className="panel-icon"><Users size={19}/></span><div><h2>Tim internal</h2><p>{staff.length} penugasan role</p></div></div>
        {loading ? <div className="empty-state"><RefreshCw size={20}/><p>Memuat anggota tim…</p></div> : staff.length === 0 ? <div className="empty-state"><Users size={23}/><strong>Belum ada staf</strong><p>Tambahkan akun Admin atau Customer Service untuk mulai membagi tugas.</p></div> :
          <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Anggota</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
            {staff.map(member => <tr key={member.user_id}><td><div className="staff-person"><strong>{member.full_name || member.email}</strong><small>{member.email}</small></div></td><td><span className="staff-role-pill">{member.role === 'admin' ? 'Admin' : 'Customer Service'}</span><small className="staff-permission-count">{Object.values(member.permissions || {}).filter(Boolean).length} izin dipilih</small></td><td><span className={'staff-status '+(member.is_active ? 'is-active' : 'is-inactive')}>{member.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td><div className="staff-actions"><button className="btn btn-small btn-outline" type="button" onClick={() => beginEdit(member)}>Ubah</button><button className="btn btn-small btn-outline" type="button" onClick={() => toggleActive(member)}>{member.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button><button className="icon-button" type="button" title="Hapus penugasan role" aria-label={'Hapus role '+member.email} onClick={() => remove(member)}><Trash2 size={15}/></button></div></td></tr>)}
          </tbody></table></div>}
        <div className="staff-note"><Headphones size={16}/><span>Customer Service difokuskan ke pusat bantuan dan informasi akun yang diperlukan.</span></div>
      </section>
    </div>
  </div>
}
