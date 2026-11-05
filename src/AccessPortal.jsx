import { useState } from 'react'
import { ArrowRight, KeyRound, ShieldCheck, UserRound, LockKeyhole } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'
import './access-portal.css'
import './chillpos-design-system.css'

function AccessBrand() {
  return <a className="access-brand" href="/" aria-label="ChillPos beranda">
    <img src="/chillpos-mark.svg" alt="" />
    <span>ChillPos<small>BUSINESS OPERATIONS</small></span>
  </a>
}

function AccessFrame({ children, eyebrow = 'SECURE WORKSPACE ACCESS' }) {
  return <main className="access-portal nx-access-portal">
    <div className="access-geometry access-geometry-a" aria-hidden="true" />
    <div className="access-geometry access-geometry-b" aria-hidden="true" />
    <div className="access-grid" aria-hidden="true" />
    <header className="access-topline">
      <AccessBrand />
      <span className="access-system-label"><i /> CHILLPOS / ACCESS SYSTEM</span>
    </header>
    <section className="access-content">
      <div className="access-index"><span>CP—01</span><span>{eyebrow}</span></div>
      {children}
    </section>
    <footer className="access-footer">
      <span>© {new Date().getFullYear()} ChillPos</span>
      <span>CHILLPOS PLATFORM</span>
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
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setSuccess(false)
    if (!isSupabaseConfigured) {
      setMessage('Konfigurasi Supabase belum tersedia. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di environment Netlify.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (result.error) setMessage(userFacingError(result.error))
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

  return <AccessFrame eyebrow={mode === 'login' ? 'IDENTITY VERIFICATION' : 'INVITATION ACTIVATION'}>
    <div className="access-heading">
      <span className="access-kicker">{mode === 'login' ? 'YOUR BUSINESS. YOUR WORKSPACE.' : 'COMPLETE YOUR ACCESS.'}</span>
      <h1>{mode === 'login' ? <>Masuk ke<br /><em>ruang kerja.</em></> : <>Aktifkan<br /><em>akses Anda.</em></>}</h1>
      <p>{mode === 'login'
        ? 'Gunakan akun ChillPos yang telah terdaftar untuk melanjutkan aktivitas operasional.'
        : 'Aktivasi hanya tersedia untuk email yang telah menerima undangan dari Owner atau Admin ChillPos.'}</p>
    </div>

    <form className="access-form" onSubmit={submit}>
      <div className="access-form-meta">
        <span><ShieldCheck size={15} /> {mode === 'login' ? 'ACCOUNT SIGN-IN' : 'INVITATION VERIFICATION'}</span>
        <span>01 / 02</span>
      </div>
      <label htmlFor="access-email">Email terdaftar</label>
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
        <input id="access-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'login' ? 'Masukkan password' : 'Minimal 8 karakter'} required minLength={mode === 'login' ? 1 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </div>
      {message && <div className={'access-message ' + (success ? 'is-success' : 'is-error')} role="status" aria-live="polite">{message}</div>}
      <button className="access-submit" type="submit" disabled={busy}>
        <span>{busy ? 'Memproses akses…' : mode === 'login' ? 'Masuk ke ChillPos' : 'Verifikasi undangan'}</span>
        <span className="access-submit-icon"><ArrowRight size={18} /></span>
      </button>
      <div className="access-mode-switch">
        <span>{mode === 'login' ? 'Memiliki undangan aktivasi?' : 'Sudah mengaktifkan akun?'}</span>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'activate' : 'login'); setMessage(''); setSuccess(false) }}>
          {mode === 'login' ? 'Aktivasi undangan' : 'Kembali ke login'}
        </button>
      </div>
    </form>
    <div className="access-security-note"><span><i /></span><p>Akses diverifikasi melalui sistem autentikasi ChillPos. Jangan bagikan password atau kode aktivasi kepada orang lain.</p></div>
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
      <p>{setup ? 'Buat PIN pribadi sebelum menggunakan workspace ChillPos.' : 'Password telah diterima. Masukkan PIN pribadi untuk membuka workspace.'}</p>
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
    <div className="access-security-note"><span><i /></span><p>PIN diverifikasi oleh server dan sesi workspace dibatasi sesuai kebijakan keamanan ChillPos.</p></div>
  </AccessFrame>
}
