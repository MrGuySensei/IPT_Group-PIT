import { useEffect, useState } from 'react'

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === '1'
  )
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIsStandalone(standalone)

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  if (isStandalone || dismissed || !deferredPrompt) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 400, maxWidth: 420, width: 'calc(100% - 32px)',
      background: 'white', border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(26,23,20,.15)', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-body)',
    }}>
      <div style={{ fontSize: 24 }}>📲</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Install Library App</div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          Add to your home screen — the website still works in your browser.
        </div>
      </div>
      <button type="button" onClick={install}
        style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
        Install
      </button>
      <button type="button" onClick={dismiss}
        style={{ padding: '8px', border: 'none', background: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: 18 }}>
        ×
      </button>
    </div>
  )
}
