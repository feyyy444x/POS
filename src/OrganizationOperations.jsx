import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, RefreshCw, Search, ShieldCheck, Store, Users, UserPlus, Pencil, Copy, X, Save, Trash2, KeyRound } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'

const dateTime = value => value ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function OrganizationOperations({ mode = 'team', tenants = [] }) {
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('cashier')
  const [inviteTenant, setInviteTenant] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('cashier')
  const [editActive, setEditActive] = useState(true)
  const [deleting, setDeleting] = useState('')
  const [securityBusy, setSecurityBusy] = useState('')

  const tenantIds = useMemo(() => tenants.filter(t => t.status === 'active' && !t.deleted_at).map(t => t.id), [tenants])
  const tenantKey = tenantIds.join(',')
  const tenantNames = useMemo(() => Object.fromEntries(tenants.map(t => [t.id, t.name || 'Tenant'])), [tenants])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    if (!supabase || !tenantIds.length) {
      setMembers([]); setInvites([]); setShifts([])
      setError(!supabase ? 'Koneksi database belum tersedia.' : 'Belum ada tenant aktif pada organisasi ini.')
      setLoading(false)
      return
    }
    if (mode === 'team') {
      const [{ data, error: loadError }, { data: inviteRows, error: inviteError }] = await Promise.all([
        supabase.from('store_members').select('id,store_id,user_id,role,email,full_name,is_active,disabled_at')
          .in('store_id', tenantIds).order('full_name', { ascending: true }).limit(2000),
        supabase.from('store_invites').select('id,store_id,email,full_name,role,created_at,expires_at,accepted_at')
          .in('store_id', tenantIds).order('created_at', { ascending: false }).limit(1000),
      ])
      if (loadError) {
        setMembers([]); setInvites([])
        setError('Data karyawan lintas tenant tidak dapat dibaca. Pastikan Owner sudah tersinkron sebagai anggota organisasi. Detail: ' + loadError.message)
      } else {
        setMembers(data || [])
        setInvites(inviteRows || [])
        if (inviteError) setError('Daftar karyawan tersedia, tetapi riwayat undangan gagal dimuat: ' + inviteError.message)
      }
    } else {
      const { data, error: loadError } = await supabase.from('cashier_shifts')
        .select('id,store_id,cashier_id,cashier_name_snapshot,opened_at,closed_at')
        .in('store_id', tenantIds).is('closed_at', null)
        .order('opened_at', { ascending: false }).limit(500)
      if (loadError) {
        setShifts([])
        setError('Data monitoring kasir lintas tenant tidak dapat dibaca. Pastikan akses Owner dan kebijakan RLS sudah aktif. Detail: ' + loadError.message)
      } else setShifts(data || [])
    }
    setLoading(false)
  }, [mode, tenantKey])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!supabase || !tenantIds.length) return
    const channels = tenantIds.map(storeId => supabase.channel('owner-team-sync-' + storeId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_members', filter: 'store_id=eq.' + storeId }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_invites', filter: 'store_id=eq.' + storeId }, load)
      .subscribe())
    return () => { channels.forEach(channel => supabase.removeChannel(channel)) }
  }, [tenantKey, load])
  useEffect(() => { if (!inviteTenant && tenantIds[0]) setInviteTenant(tenantIds[0]) }, [tenantKey, inviteTenant])

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

  const createInvite = async event => {
    event.preventDefault()
    if (!inviteTenant || !inviteEmail.trim() || inviteName.trim().length < 2) return
    let code
    try { code = crypto.randomUUID().replaceAll('-', '') } catch {
      setError('Browser tidak dapat membuat kode aktivasi aman. Perbarui browser lalu coba lagi.')
      return
    }
    setSaving(true); setError(''); setNotice('')
    const { error: inviteError } = await supabase.rpc('invite_store_member', {
      p_store_id: inviteTenant,
      p_email: inviteEmail.trim().toLowerCase(),
      p_full_name: inviteName.trim(),
      p_role: inviteRole,
      p_activation_code: code,
    })
    setSaving(false)
    if (inviteError) { setError(userFacingError(inviteError, 'Undangan karyawan gagal dibuat.')); return }
    setActivationCode(code)
    setInviteName(''); setInviteEmail('')
    setNotice('Undangan tersimpan. Salin kode aktivasi ini dan kirim kepada karyawan; kode hanya ditampilkan sekarang.')
    await load()
  }

  const startEdit = member => {
    if (member.role === 'owner') return
    setEditing(member)
    setEditName(member.full_name || '')
    setEditRole(member.role === 'manager' || member.role === 'admin' ? 'admin' : 'cashier')
    setEditActive(Boolean(member.is_active && !member.disabled_at))
  }

  const saveEdit = async event => {
    event.preventDefault()
    if (!editing) return
    setSaving(true); setError(''); setNotice('')
    const { error: updateError } = await supabase.rpc('owner_update_store_member', {
      p_member_id: editing.id,
      p_full_name: editName.trim(),
      p_role: editRole,
      p_is_active: editActive,
    })
    setSaving(false)
    if (updateError) { setError(userFacingError(updateError, 'Perubahan karyawan gagal disimpan.')); return }
    setEditing(null)
    setNotice('Data karyawan dan hak akses berhasil diperbarui.')
    await load()
  }

  const resetMemberPin = async member => {
    if (!window.confirm('Reset PIN ' + (member.full_name || member.email || 'karyawan') + '? Karyawan harus membuat PIN baru saat masuk berikutnya.')) return
    setSecurityBusy(member.id); setError(''); setNotice('')
    const { error: resetError } = await supabase.rpc('manager_reset_store_member_pin', { p_member_id: member.id })
    setSecurityBusy('')
    if (resetError) { setError(userFacingError(resetError, 'Reset PIN karyawan gagal.')); return }
    setNotice('PIN karyawan berhasil direset. Karyawan perlu membuat PIN baru saat masuk berikutnya.')
  }

  const resetMemberPassword = async member => {
    const password = window.prompt('Masukkan password sementara baru (minimal 6 karakter) untuk ' + (member.full_name || member.email || 'karyawan') + '.')
    if (password === null) return
    if (password.length < 6 || password.length > 128) { setError('Password harus 6–128 karakter.'); return }
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) { setError('Sesi login tidak tersedia. Silakan masuk kembali.'); return }
    setSecurityBusy(member.id); setError(''); setNotice('')
    try {
      const response = await fetch('/.netlify/functions/manage-store-member-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ memberId: member.id, password }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Reset password karyawan gagal.')
      setNotice('Password sementara karyawan berhasil diperbarui. Sampaikan secara pribadi kepada karyawan.')
    } catch (resetError) {
      setError(resetError.message || 'Reset password karyawan gagal.')
    } finally { setSecurityBusy('') }
  }

  const deleteMember = async member => {
    if (member.role === 'owner') return
    if (!window.confirm('Hapus akses ' + (member.full_name || member.email || 'karyawan') + ' dari tenant ' + (tenantNames[member.store_id] || 'ini') + '?')) return
    setDeleting(member.id); setError(''); setNotice('')
    const { error: deleteError } = await supabase.rpc('owner_delete_store_member', { p_member_id: member.id })
    setDeleting('')
    if (deleteError) { setError(userFacingError(deleteError, 'Karyawan belum berhasil dihapus.')); return }
    setNotice('Akses karyawan berhasil dihapus dari tenant.')
    await load()
  }

  return <section className="owner-operations-page">
    <div className="owner-section-heading owner-page-heading">
      <div><span className="owner-kicker">{mode === 'team' ? 'ORGANIZATION PEOPLE' : 'LIVE OPERATIONS'}</span><h2>{mode === 'team' ? 'Karyawan & Hak Akses' : 'Monitoring'}</h2><p>{mode === 'team' ? 'Tambahkan karyawan, atur role, dan kelola penempatan di tenant organisasi.' : 'Pantau sesi kasir yang sedang terbuka di seluruh tenant organisasi.'}</p></div>
      <div className="owner-operations-actions">
        {mode === 'team' && <button className="btn btn-primary" onClick={() => { setInviteOpen(true); setActivationCode(''); setError('') }}><UserPlus size={16}/> Tambah karyawan</button>}
        <button className="owner-refresh-button" onClick={load} disabled={loading}>{loading ? <span className="owner-spin"><RefreshCw size={15}/></span> : <RefreshCw size={15}/>} Perbarui</button>
      </div>
    </div>
    {error && <div className="owner-notice" role="alert">{error}</div>}
    {notice && <div className="owner-notice" role="status">{notice}</div>}
    {activationCode && <div className="owner-activation-code"><div><strong>Kode aktivasi karyawan</strong><small>Kirim bersama email yang didaftarkan. Kode ini tidak bisa ditampilkan kembali.</small></div><code>{activationCode}</code><button className="btn btn-outline btn-small" onClick={() => navigator.clipboard?.writeText(activationCode)}><Copy size={14}/> Salin kode</button><button className="icon-button" onClick={() => setActivationCode('')} aria-label="Tutup"><X size={16}/></button></div>}
    {mode === 'team' ? <>
      <div className="owner-operations-summary"><div><Users size={19}/><span><strong>{people.size}</strong><small>Akun karyawan</small></span></div><div><Store size={19}/><span><strong>{tenantIds.length}</strong><small>Tenant aktif</small></span></div><div><ShieldCheck size={19}/><span><strong>{members.filter(m => m.role === 'owner').length}</strong><small>Penugasan Owner</small></span></div></div>
      <label className="owner-tenant-toolbar owner-team-search"><span><Search size={17}/></span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, email, role, atau tenant..."/><small>{filteredMembers.length} penugasan</small></label>
      <div className="owner-table-wrap"><table><thead><tr><th>Nama / Email</th><th>Role</th><th>Tenant</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {filteredMembers.map(member => <tr key={member.id}><td><strong>{member.full_name || 'Nama belum diatur'}</strong><small>{member.email || member.user_id || '—'}</small></td><td><span className="owner-role-chip">{member.role === 'admin' || member.role === 'manager' ? 'Manager' : member.role === 'cashier' ? 'Karyawan' : member.role === 'owner' ? 'Owner' : member.role}</span></td><td>{tenantNames[member.store_id] || 'Tenant'}</td><td><span className={'owner-status '+(member.is_active && !member.disabled_at ? 'is-active' : '')}>{member.is_active && !member.disabled_at ? 'Aktif' : 'Nonaktif'}</span></td><td>{member.role === 'owner' ? <span className="subtle">Akses Owner dilindungi</span> : <div className="member-manage-actions"><button className="btn btn-small btn-outline" onClick={() => startEdit(member)}><Pencil size={13}/> Edit nama / role</button><button className="btn btn-small btn-outline" disabled={securityBusy===member.id} onClick={() => resetMemberPin(member)}><ShieldCheck size={13}/> Reset PIN</button><button className="btn btn-small btn-outline" disabled={securityBusy===member.id} onClick={() => resetMemberPassword(member)}><KeyRound size={13}/> Reset password</button><button className="btn btn-small btn-outline danger-icon" disabled={deleting===member.id || securityBusy===member.id} onClick={() => deleteMember(member)}>{deleting===member.id?<RefreshCw size={13}/>:<Trash2 size={13}/>} Hapus</button></div>}</td></tr>)}
      </tbody></table>{!loading && !error && !filteredMembers.length && <div className="owner-no-tenant">Belum ada penugasan karyawan yang cocok.</div>}</div>
      {invites.length > 0 && <div className="owner-table-wrap"><h3>Undangan karyawan</h3><table><thead><tr><th>Email</th><th>Nama</th><th>Tenant</th><th>Role</th><th>Status</th><th>Kedaluwarsa</th></tr></thead><tbody>{invites.map(invite => <tr key={invite.id}><td>{invite.email}</td><td>{invite.full_name}</td><td>{tenantNames[invite.store_id] || 'Tenant'}</td><td>{invite.role === 'admin' || invite.role === 'manager' ? 'Manager' : 'Karyawan'}</td><td>{invite.accepted_at ? 'Diterima' : 'Menunggu aktivasi'}</td><td>{dateTime(invite.expires_at)}</td></tr>)}</tbody></table></div>}
      <p className="owner-data-footnote">Role Owner tidak dapat diubah dari halaman staf. Manager/Karyawan diproses melalui RPC yang memvalidasi kepemilikan tenant di server.</p>
    </> : <>
      <div className="owner-operations-summary"><div><Activity size={19}/><span><strong>{shifts.length}</strong><small>Sesi kasir terbuka</small></span></div><div><Users size={19}/><span><strong>{openCashiers}</strong><small>Kasir aktif</small></span></div><div><Store size={19}/><span><strong>{new Set(shifts.map(s => s.store_id)).size}</strong><small>Tenant beroperasi</small></span></div></div>
      <div className="owner-table-wrap"><table><thead><tr><th>Kasir</th><th>Tenant</th><th>Mulai sesi</th><th>Status</th></tr></thead><tbody>
        {shifts.map(shift => <tr key={shift.id}><td><strong>{shift.cashier_name_snapshot || 'Kasir'}</strong><small>{shift.cashier_id || '—'}</small></td><td>{tenantNames[shift.store_id] || 'Tenant'}</td><td>{dateTime(shift.opened_at)}</td><td><span className="owner-status is-active">Sesi terbuka</span></td></tr>)}
      </tbody></table>{!loading && !error && !shifts.length && <div className="owner-no-tenant">Tidak ada sesi kasir yang sedang terbuka.</div>}</div>
      <p className="owner-data-footnote">Monitoring ini menampilkan sesi kasir yang masih terbuka. Status transaksi dan laporan penjualan tersedia pada menu Laporan Gabungan.</p>
    </>}
    {inviteOpen && <div className="owner-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setInviteOpen(false) }}><form className="owner-modal-card" onSubmit={createInvite}>
      <div className="owner-modal-head"><div><span className="owner-kicker">NEW TEAM MEMBER</span><h3>Tambah karyawan</h3></div><button type="button" className="icon-button" onClick={() => setInviteOpen(false)}><X size={17}/></button></div>
      <label>Tenant tempat karyawan ditugaskan<select className="text-input" value={inviteTenant} onChange={event => setInviteTenant(event.target.value)} required>{tenants.filter(t => tenantIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Nama karyawan<input className="text-input" value={inviteName} onChange={event => setInviteName(event.target.value)} minLength={2} maxLength={120} required/></label>
      <label>Email karyawan<input className="text-input" type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} required/></label>
      <label>Hak akses<select className="text-input" value={inviteRole} onChange={event => setInviteRole(event.target.value)}><option value="cashier">Karyawan</option><option value="admin">Manager</option></select></label>
      {error && <div className="owner-notice">{error}</div>}
      <div className="owner-modal-actions"><button type="button" className="btn btn-outline" onClick={() => setInviteOpen(false)} disabled={saving}>Batal</button><button className="btn btn-primary" disabled={saving}>{saving ? <RefreshCw size={15} className="owner-spin"/> : <UserPlus size={15}/>} Buat undangan</button></div>
    </form></div>}
    {editing && <div className="owner-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditing(null) }}><form className="owner-modal-card" onSubmit={saveEdit}>
      <div className="owner-modal-head"><div><span className="owner-kicker">EDIT TEAM MEMBER</span><h3>Ubah karyawan</h3></div><button type="button" className="icon-button" onClick={() => setEditing(null)}><X size={17}/></button></div>
      <label>Nama karyawan<input className="text-input" value={editName} onChange={event => setEditName(event.target.value)} minLength={2} maxLength={120} required/></label>
      <label>Hak akses<select className="text-input" value={editRole} onChange={event => setEditRole(event.target.value)}><option value="cashier">Karyawan</option><option value="admin">Manager</option></select></label>
      <label className="owner-toggle-row"><input type="checkbox" checked={editActive} onChange={event => setEditActive(event.target.checked)}/> Akun aktif di tenant ini</label>
      {error && <div className="owner-notice">{error}</div>}
      <div className="owner-modal-actions"><button type="button" className="btn btn-outline" onClick={() => setEditing(null)} disabled={saving}>Batal</button><button className="btn btn-primary" disabled={saving}>{saving ? <RefreshCw size={15} className="owner-spin"/> : <Save size={15}/>} Simpan perubahan</button></div>
    </form></div>}
  </section>
}
