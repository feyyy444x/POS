import { useEffect, useState } from 'react'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const onBeforeInstall = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      setShowHelp(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    return null
  }

  const install = async () => {
    if (!installPrompt) {
      setShowHelp((value) => !value)
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice?.outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  const buttonStyle = {
    border: 0,
    borderRadius: 10,
    background: '#102d50',
    color: '#fff',
    fontWeight: 700,
    padding: '10px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  return (
    <aside
      aria-label="Instal NexaPos"
      style={{
        position: 'fixed',
        zIndex: 9999,
        left: 16,
        right: 16,
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        maxWidth: 560,
        margin: '0 auto',
        padding: 14,
        border: '1px solid #d7e0eb',
        borderRadius: 16,
        background: '#fff',
        color: '#15283d',
        boxShadow: '0 8px 32px rgba(16,45,80,.18)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/nexapos-mark.svg" alt="" width="42" height="42" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: 14 }}>Pasang NexaPos</strong>
          <span style={{ display: 'block', fontSize: 12, color: '#52657a', marginTop: 3 }}>
            Akses lebih cepat dari layar utama perangkat.
          </span>
        </div>
        <button type="button" onClick={install} style={buttonStyle}>
          {installPrompt ? 'Instal' : 'Cara pasang'}
        </button>
        <button
          type="button"
          aria-label="Tutup petunjuk pemasangan"
          onClick={() => { setInstalled(true); setShowHelp(false) }}
          style={{ border: 0, background: 'transparent', color: '#52657a', fontSize: 20, cursor: 'pointer', padding: 2 }}
        >
          ×
        </button>
      </div>
      {showHelp && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5ebf2', fontSize: 13, lineHeight: 1.55 }}>
          <strong>Android / komputer</strong>
          <ol style={{ margin: '4px 0 10px', paddingLeft: 20 }}>
            <li>Buka NexaPos melalui Chrome atau browser yang mendukung pemasangan aplikasi.</li>
            <li>Buka menu browser (ikon ⋮ atau menu berbagi) lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</li>
          </ol>
          <strong>iPhone / iPad</strong>
          <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            <li>Buka halaman ini di Safari.</li>
            <li>Ketuk tombol Bagikan, lalu pilih <b>Tambahkan ke Layar Utama</b>.</li>
          </ol>
        </div>
      )}
    </aside>
  )
}
