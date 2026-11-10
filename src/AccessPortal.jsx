import { useEffect, useRef, useState } from 'react'
import { ArrowRight, KeyRound, ShieldCheck, UserRound, LockKeyhole } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'
import './acoPos-design-system.css'
import './access-portal.css'

function AccessBrand() {
  return <a className="access-brand" href="/" aria-label="acoPos beranda">
    <img src="/acoPos-mark.svg" alt="" />
    <span>acoPos<small>BUSINESS OPERATIONS</small></span>
  </a>
}

function AccessFrame({ children, eyebrow = 'SECURE WORKSPACE ACCESS' }) {
  return <main className="access-portal nx-access-portal">
    <div className="access-geometry access-geometry-a" aria-hidden="true" />
    <div className="access-geometry access-geometry-b" aria-hidden="true" />
    <div className="access-grid" aria-hidden="true" />
    <header className="access-topline">
      <AccessBrand />
      <span className="access-system-label"><i /> acoPos / ACCESS SYSTEM</span>
    </header>
    <section className="access-content">
      <div className="access-index"><span>CP—01</span><span>{eyebrow}</span></div>
      {children}
    </section>
    <footer className="access-footer">
      <span>© {new Date().getFullYear()} acoPos</span>
      <span>acoPos PLATFORM</span>
      <span>SECURE SESSION</span>
    </footer>
    <span className="access-background-word" aria-hidden="true">CHILL</span>
  </main>
}

export function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setSuccess(false)
    if (!isSupabaseConfigured) {
      setMessage('Konfigurasi Supabase belum tersedia. Hubungi administrator.')
      return
    }
    if (mode === 'register') {
      if (password.length < 8 || password.length > 128) { setMessage('Password harus terdiri dari 8 sampai 128 karakter.'); return }
      if (password !== passwordConfirm) { setMessage('Konfirmasi password tidak sama.'); return }
      if (!/^\d{4}$/.test(pin)) { setMessage('PIN harus tepat 4 angka.'); return }
      if (pin !== pinConfirm) { setMessage('Konfirmasi PIN tidak sama.'); return }
      if (!['Retail / Toko','Minimarket','Fashion / Pakaian','Kuliner / Restoran','Kafe / Kedai','Jasa','Salon / Barbershop','Apotek','Elektronik','Lainnya'].includes(businessCategory)) { setMessage('Pilih kategori usaha terlebih dahulu.'); return }
      if ([ownerName, companyName, workspaceName].some(value => value.trim().length < 2 || value.trim().length > 120)) {
        setMessage('Nama Owner, Perusahaan, dan workspace wajib 2–120 karakter.')
        return
      }
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (result.error) {
          setMessage(userFacingError(result.error))
        } else {
          if (result.data?.user?.user_metadata?.free_workspace_pending === true && result.data?.session?.access_token) {
            const completion = await fetch('/.netlify/functions/complete-free-registration', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + result.data.session.access_token },
            })
            const completed = await completion.json().catch(() => ({}))
            if (!completion.ok) throw new Error(completed.error || 'Workspace Gratis belum berhasil disiapkan.')
          }
          window.location.assign('/')
        }
      } else if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/?screen=complete-free-registration`,
            data: { full_name: ownerName.trim(), free_workspace_pending: true },
          },
        })
        if (signUpError) throw signUpError
        if (!data?.user?.id) throw new Error('Akun pendaftaran tidak dapat dibuat. Silakan coba kembali.')

        let registrationUser = data.user
        let registrationSession = data.session
        if (data.user.identities?.length === 0) {
          const existing = await supabase.auth.signInWithPassword({ email: email.trim(), password })
          if (existing.error) {
            if (/email not confirmed/i.test(existing.error.message || '')) {
              const resent = await supabase.auth.resend({ type: 'signup', email: email.trim() })
              if (resent.error) throw resent.error
              throw new Error('Akun dengan email ini sudah dibuat tetapi belum diverifikasi. Tautan verifikasi telah dikirim ulang. Buka email, verifikasi, lalu kirim kembali formulir ini.')
            }
            throw new Error('Email ini sudah terdaftar. Jika ini akun Anda, gunakan password yang benar atau masuk melalui halaman login.')
          }
          if (existing.data?.user?.user_metadata?.free_workspace_pending !== true) {
            await supabase.auth.signOut()
            throw new Error('Email ini sudah digunakan oleh akun acoPos yang aktif. Silakan masuk melalui halaman login.')
          }
          registrationUser = existing.data.user
          registrationSession = existing.data.session
        }

        const prepareResponse = await fetch('/.netlify/functions/register-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: registrationUser.id, email: email.trim(), ownerName: ownerName.trim(),
            companyName: companyName.trim(), workspaceName: workspaceName.trim(), businessCategory, pin,
          }),
        })
        const prepared = await prepareResponse.json().catch(() => ({}))
        if (!prepareResponse.ok) throw new Error(prepared.error || 'Persiapan workspace gagal. Silakan coba kembali.')

        setPassword('')
        setPasswordConfirm('')
        setPin('')
        setPinConfirm('')
        if (registrationSession?.access_token) {
          const completion = await fetch('/.netlify/functions/complete-free-registration', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + registrationSession.access_token },
          })
          const completed = await completion.json().catch(() => ({}))
          if (!completion.ok) throw new Error(completed.error || 'Workspace belum berhasil disiapkan.')
          window.location.assign('/')
          return
        }
        setSuccess(true)
        setMode('login')
        setMessage('Akun berhasil dibuat. Periksa email Anda dan klik tautan verifikasi. Setelah email terverifikasi, sistem akan otomatis membuat Workspace Gratis dan mengarahkan Anda ke dalamnya.')
      } else {
        const response = await fetch('/.netlify/functions/activate-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, activationCode: activationCode.trim() }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Aktivasi undangan gagal. Periksa kembali email dan status undangan.')
        setSuccess(true)
        setMessage('Undangan berhasil diverifikasi dan password berhasil dibuat. Silakan masuk menggunakan email dan password tersebut.')
        setMode('login')
      }
    } catch (error) {
      setMessage(userFacingError(error, 'Terjadi kesalahan. Silakan coba lagi.'))
    } finally {
      setBusy(false)
    }
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setMessage('')
    setSuccess(false)
    setActivationCode('')
  }

  return <AccessFrame eyebrow={mode === 'login' ? 'IDENTITY VERIFICATION' : mode === 'register' ? 'FREE WORKSPACE REGISTRATION' : 'INVITATION ACTIVATION'}>
    <div className="access-heading">
      <span className="access-kicker">{mode === 'login' ? 'YOUR BUSINESS. YOUR WORKSPACE.' : mode === 'register' ? 'START YOUR BUSINESS WORKSPACE.' : 'COMPLETE YOUR ACCESS.'}</span>
      <h1>{mode === 'login' ? <>Masuk ke<br /><em>ruang kerja.</em></> : mode === 'register' ? <>Daftar<br /><em>gratis.</em></> : <>Aktifkan<br /><em>akses Anda.</em></>}</h1>
      <p>{mode === 'login'
        ? 'Gunakan akun acoPos yang telah terdaftar untuk melanjutkan aktivitas operasional.'
        : mode === 'register'
          ? 'Buat akun Owner dan satu workspace mandiri. Tidak diperlukan kode aktivasi atau pembayaran.'
          : 'Aktivasi hanya tersedia untuk email yang telah menerima undangan dari Owner atau Admin acoPos.'}</p>
    </div>

    <form className="access-form" onSubmit={submit}>
      <div className="access-form-meta">
        <span><ShieldCheck size={15} /> {mode === 'login' ? 'ACCOUNT SIGN-IN' : mode === 'register' ? 'FREE REGISTRATION' : 'INVITATION VERIFICATION'}</span>
        <span>{mode === 'register' ? '01 / 03' : '01 / 02'}</span>
      </div>
      {mode === 'register' && <>
        <label htmlFor="register-owner-name">Nama lengkap Owner</label>
        <div className="access-field"><UserRound size={17} aria-hidden="true" /><input id="register-owner-name" value={ownerName} onChange={event => setOwnerName(event.target.value)} placeholder="Nama pemilik akun" required minLength={2} maxLength={120} autoComplete="name" /></div>
        <label htmlFor="register-company-name">Nama Perusahaan</label>
        <div className="access-field"><UserRound size={17} aria-hidden="true" /><input id="register-company-name" value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Nama Perusahaan" required minLength={2} maxLength={120} autoComplete="organization" /></div>
        <label htmlFor="register-workspace-name">Nama usaha / workspace utama</label>
        <div className="access-field"><UserRound size={17} aria-hidden="true" /><input id="register-workspace-name" value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} placeholder="Nama toko atau workspace" required minLength={2} maxLength={120} /></div>
        <label htmlFor="register-business-category">Kategori usaha</label>
        <div className="access-field access-select-field">
          <select id="register-business-category" value={businessCategory} onChange={event => setBusinessCategory(event.target.value)} required>
            <option value="" disabled>Pilih kategori usaha</option>
            {['Retail / Toko','Minimarket','Fashion / Pakaian','Kuliner / Restoran','Kafe / Kedai','Jasa','Salon / Barbershop','Apotek','Elektronik','Lainnya'].map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
      </>}
      <label htmlFor="access-email">Email {mode === 'login' ? 'terdaftar' : 'akun'}</label>
      <div className="access-field">
        <UserRound size={17} aria-hidden="true" />
        <input id="access-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@bisnis.com" required autoComplete="email" />
      </div>
      {mode === 'activate' && <>
        <label htmlFor="access-code">Kode aktivasi undangan</label>
        <div className="access-field">
          <KeyRound size={17} aria-hidden="true" />
          <input id="access-code" value={activationCode} onChange={event => setActivationCode(event.target.value.replace(/[^a-f0-9]/gi, '').slice(0, 32))} placeholder="Masukkan kode 32 karakter" autoComplete="off" required minLength={32} maxLength={32} />
        </div>
      </>}
      <label htmlFor="access-password">{mode === 'login' ? 'Password' : 'Buat password'}</label>
      <div className="access-field">
        <LockKeyhole size={17} aria-hidden="true" />
        <input id="access-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'login' ? 'Masukkan password' : 'Minimal 8 karakter'} required minLength={mode === 'login' ? 1 : 8} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </div>
      {mode === 'register' && <>
        <label htmlFor="register-password-confirm">Konfirmasi password</label>
        <div className="access-field"><LockKeyhole size={17} aria-hidden="true" /><input id="register-password-confirm" type="password" value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} placeholder="Ulangi password" required minLength={8} maxLength={128} autoComplete="new-password" /></div>
        <label htmlFor="register-pin">Buat PIN pribadi (4 angka)</label>
        <div className="access-field access-pin-field"><LockKeyhole size={17} aria-hidden="true" /><input id="register-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required /></div>
        <label htmlFor="register-pin-confirm">Konfirmasi PIN</label>
        <div className="access-field access-pin-field"><LockKeyhole size={17} aria-hidden="true" /><input id="register-pin-confirm" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={pinConfirm} onChange={event => setPinConfirm(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ulangi PIN" required /></div>
      </>}
      {message && <div className={'access-message ' + (success ? 'is-success' : 'is-error')} role="status" aria-live="polite">{message}</div>}
      <button className="access-submit" type="submit" disabled={busy}>
        <span>{busy ? 'Memproses akses…' : mode === 'login' ? 'Masuk ke acoPos' : mode === 'register' ? 'Buat akun gratis' : 'Verifikasi undangan'}</span>
        <span className="access-submit-icon"><ArrowRight size={18} /></span>
      </button>
      <div className="access-mode-switch">
        <span>{mode === 'login' ? 'Belum memiliki akun?' : 'Sudah memiliki akun?'}</span>
        <button type="button" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Pendaftaran Gratis' : 'Kembali ke login'}
        </button>
      </div>
      {mode === 'login' && <div className="access-mode-switch"><span>Memiliki kode undangan?</span><button type="button" onClick={() => changeMode('activate')}>Aktivasi undangan</button></div>}
    </form>
    <div className="access-security-note"><span><i /></span><p>Password minimal 8 karakter dan PIN pribadi 4 angka. Jangan bagikan kredensial akun kepada orang lain.</p></div>
  </AccessFrame>
}
export function FreeRegistrationCompletion() {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('checking')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const completing = useRef(false)

  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active && nextSession) setSession(nextSession)
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setMessage(userFacingError(error, 'Sesi verifikasi belum dapat dibaca.'))
        setStatus('error')
      } else if (data?.session) {
        setSession(data.session)
      } else {
        setStatus('waiting')
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.access_token || completing.current) return
    let active = true
    completing.current = true
    setStatus('completing')
    setMessage('')
    fetch('/.netlify/functions/complete-free-registration', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.access_token },
    }).then(async response => {
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Workspace Gratis belum berhasil disiapkan.')
      if (!active) return
      setStatus('done')
      window.location.replace('/')
    }).catch(error => {
      if (!active) return
      completing.current = false
      setMessage(userFacingError(error, 'Penyelesaian pendaftaran gagal. Silakan coba lagi.'))
      setStatus('error')
    })
    return () => { active = false }
  }, [session, retry])

  return <AccessFrame eyebrow="EMAIL VERIFICATION / WORKSPACE SETUP">
    <div className="access-heading">
      <span className="access-kicker">acoPos / FREE WORKSPACE</span>
      <h1>{status === 'done' ? <>Workspace<br/><em>siap digunakan.</em></> : <>Menyiapkan<br/><em>workspace.</em></>}</h1>
      <p>{status === 'checking' || status === 'completing'
        ? 'Email Anda telah diverifikasi. Sistem sedang menyelesaikan pembuatan Workspace Gratis.'
        : status === 'waiting'
          ? 'Menunggu sesi verifikasi email. Jika baru saja mengeklik tautan email, tunggu sebentar atau masuk kembali.'
          : status === 'done'
            ? 'Pendaftaran berhasil. Anda akan diarahkan ke Workspace.'
            : 'Pembuatan Workspace belum selesai. Anda dapat mencoba kembali tanpa mengulang pendaftaran.'}</p>
    </div>
    {message && <div className="access-message is-error" role="alert">{message}</div>}
    {(status === 'checking' || status === 'completing') && <div className="access-security-note"><span><i /></span><p>Mohon jangan tutup halaman ini sampai proses selesai.</p></div>}
    {status === 'error' && <div className="access-form">
      <button className="access-submit" type="button" onClick={() => { completing.current = false; setRetry(value => value + 1) }}>
        <span>Coba selesaikan lagi</span><span className="access-submit-icon"><ArrowRight size={18}/></span>
      </button>
      <div className="access-mode-switch"><span>Butuh bantuan?</span><a href="/login">Kembali ke login</a></div>
    </div>}
    {status === 'waiting' && <div className="access-mode-switch"><span>Sudah verifikasi email?</span><a href="/login">Masuk untuk melanjutkan</a></div>}
  </AccessFrame>
}

export function PinGate({ status, onReady, onSignOut }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const setup = !status?.has_pin

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(pin)) { setError('PIN harus tepat 4 angka.'); return }
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc(setup ? 'set_my_pin' : 'verify_my_pin', { p_pin: pin })
    setBusy(false)
    if (rpcError) { setError(userFacingError(rpcError)); return }
    if (!setup && data !== true) { setPin(''); setError('PIN salah. Silakan coba kembali.'); return }
    onReady({ has_pin: true, is_verified: true })
  }

  return <AccessFrame eyebrow="PERSONAL SECURITY CHECK">
    <div className="access-heading">
      <span className="access-kicker">A SECOND LAYER OF PROTECTION</span>
      <h1>{setup ? <>Buat PIN<br /><em>keamanan.</em></> : <>Verifikasi<br /><em>identitas.</em></>}</h1>
      <p>{setup ? 'Buat PIN pribadi sebelum menggunakan workspace acoPos.' : 'Password telah diterima. Masukkan PIN pribadi untuk membuka workspace.'}</p>
    </div>
    <form className="access-form" onSubmit={submit}>
      <div className="access-form-meta"><span><ShieldCheck size={15} /> PIN SECURITY</span><span>04 DIGITS</span></div>
      <label htmlFor="access-pin">PIN pribadi</label>
      <div className="access-field access-pin-field">
        <LockKeyhole size={17} aria-hidden="true" />
        <input id="access-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required />
      </div>
      {error && <div className="access-message is-error" role="alert">{error}</div>}
      <button className="access-submit" type="submit" disabled={busy || pin.length !== 4}>
        <span>{busy ? 'Memverifikasi…' : setup ? 'Simpan PIN & lanjutkan' : 'Verifikasi & buka workspace'}</span>
        <span className="access-submit-icon"><ArrowRight size={18} /></span>
      </button>
      <button type="button" className="access-signout" onClick={onSignOut}>Keluar dari akun</button>
    </form>
    <div className="access-security-note"><span><i /></span><p>PIN diverifikasi oleh server dan sesi workspace dibatasi sesuai kebijakan keamanan acoPos.</p></div>
  </AccessFrame>
}
