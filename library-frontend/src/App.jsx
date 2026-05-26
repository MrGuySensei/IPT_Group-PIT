import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { dashboardApi, booksApi, borrowApi } from './api'
import './index.css'

/* ══════════════════════════════════════════════════════
   AUTH CONTEXT
   user object: { id, username, email, role }
   role = 'staff' | 'member'
══════════════════════════════════════════════════════ */
const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me/', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loginStaff = async (username, password) => {
    const res  = await fetch('/api/auth/staff/login/', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setUser(data.user)
  }

  const signupStaff = async (username, email, password, confirm_password, profilePicture = null) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('email', email)
    formData.append('password', password)
    formData.append('confirm_password', confirm_password)
    if (profilePicture) {
      formData.append('profile_picture', profilePicture)
    }

    const res = await fetch('/api/auth/staff/signup/', {
      method: 'POST', credentials: 'include',
      body: formData,  // No Content-Type header for FormData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Sign up failed')
    // Don't set user immediately - wait for email verification
    // setUser(data.user)
    return data.message // Return message to show to user
  }

  const loginMember = async (username, password) => {
    const res  = await fetch('/api/auth/member/login/', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setUser(data.user)
  }

  const signupMember = async (username, email, password, confirm_password, profilePicture = null) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('email', email)
    formData.append('password', password)
    formData.append('confirm_password', confirm_password)
    if (profilePicture) {
      formData.append('profile_picture', profilePicture)
    }

    const res = await fetch('/api/auth/member/signup/', {
      method: 'POST', credentials: 'include',
      body: formData,  // No Content-Type header for FormData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Sign up failed')
    // Don't set user immediately - wait for email verification
    // setUser(data.user)
    return data.message // Return message to show to user
  }

  const logout = async () => {
    await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginStaff, signupStaff, loginMember, signupMember, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() { return useContext(AuthContext) }

/* ══════════════════════════════════════════════════════
   SHARED AUTH CARD WRAPPER
══════════════════════════════════════════════════════ */
function AuthCard({ title, subtitle, accentColor, children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--paper)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)' }}>Library</span>
            <span style={{ fontSize: 12, color: accentColor, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System</span>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 10, padding: '4px 14px', borderRadius: 20,
            background: accentColor + '18', border: `1px solid ${accentColor}40`,
            fontSize: 12, fontWeight: 500, color: accentColor, letterSpacing: '0.04em',
          }}>
            {title}
          </div>
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-muted)' }}>{subtitle}</p>
        </div>
        <div className="card" style={{ padding: '32px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   STAFF AUTH PAGE  — Login + Sign Up tabs
══════════════════════════════════════════════════════ */
/* eye icon toggle helper */
function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/* password field with eye toggle */
function PasswordInput({ value, onChange, placeholder, autoComplete, accentColor = 'var(--accent)' }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value} onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        style={{ paddingRight: 40 }}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: show ? accentColor : 'var(--ink-faint)', display: 'flex', alignItems: 'center',
          transition: 'color 0.15s',
        }}>
        <EyeIcon visible={show} />
      </button>
    </div>
  )
}

function StaffLoginPage({ onSwitchToMember }) {
  const { loginStaff, signupStaff } = useAuth()
  const [mode, setMode]   = useState('login')
  const [form, setForm]   = useState({ username: '', email: '', password: '', confirm_password: '', profile_picture: null })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError('') }
  const setFile = (e) => { setForm(f => ({ ...f, profile_picture: e.target.files[0] })); setError('') }

  const switchMode = (m) => {
    setMode(m)
    setForm({ username: '', email: '', password: '', confirm_password: '', profile_picture: null })
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (mode === 'login') await loginStaff(form.username, form.password)
      else {
        const message = await signupStaff(form.username, form.email, form.password, form.confirm_password, form.profile_picture)
        setError(`✅ ${message} 📧 Please check your email (including spam/junk folder) and click the verification link.`) // Show success message with clear instructions
        // Reset form
        setForm({ username: '', email: '', password: '', confirm_password: '', profile_picture: null })
        setMode('login') // Switch to login mode
      }
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <AuthCard
      title="🏛 Staff Portal"
      subtitle={mode === 'login' ? 'Sign in with your staff credentials' : 'Create a new staff account'}
      accentColor="var(--accent)"
    >
      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)', marginBottom: 24 }}>
        {['login', 'signup'].map(m => (
          <button key={m} type="button" onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '9px 0', background: 'none', border: 'none',
              borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1.5px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: mode === m ? 'var(--accent)' : 'var(--ink-muted)', transition: 'color 0.15s',
            }}>
            {m === 'login' ? 'Login' : 'Sign Up'}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <div className="form-grid">
          <div>
            <label>Username</label>
            <input value={form.username} onChange={set('username')} placeholder="Staff username" autoComplete="username" required />
          </div>
          {mode === 'signup' && (
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" required />
            </div>
          )}
          <div>
            <label>Password</label>
            <PasswordInput value={form.password} onChange={set('password')} placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} accentColor="var(--accent)" />
          </div>
          {mode === 'signup' && (
            <div>
              <label>Confirm Password</label>
              <PasswordInput value={form.confirm_password} onChange={set('confirm_password')} placeholder="Re-enter password"
                autoComplete="new-password" accentColor="var(--accent)" />
            </div>
          )}
          {mode === 'signup' && (
            <div>
              <label>Profile Picture (optional)</label>
              <input type="file" accept="image/*" onChange={setFile} style={{ padding: '8px 0' }} />
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                Upload a profile picture (max 5MB, JPG/PNG)
              </div>
            </div>
          )}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: error.includes('successfully') ? 'var(--success-light)' : 'var(--danger-light)',
              border: `1px solid ${error.includes('successfully') ? '#d4edda' : '#f0c4b4'}`,
              borderRadius: 8,
              color: error.includes('successfully') ? 'var(--success)' : 'var(--danger)',
              fontSize: 13
            }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 4 }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Login as Staff' : 'Create Staff Account'}
          </button>
        </div>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)', marginTop: 16 }}>
        Are you a member?{' '}
        <button type="button" onClick={onSwitchToMember}
          style={{ background: 'none', border: 'none', color: 'var(--info)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
          Member Login →
        </button>
      </p>
    </AuthCard>
  )
}

/* ══════════════════════════════════════════════════════
   MEMBER AUTH PAGE  — Login + Sign Up tabs
══════════════════════════════════════════════════════ */
function MemberAuthPage({ onSwitchToStaff }) {
  const { loginMember, signupMember } = useAuth()
  const [mode, setMode]   = useState('login')
  const [form, setForm]   = useState({ username: '', email: '', password: '', confirm_password: '', profile_picture: null })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError('') }
  const setFile = (e) => { setForm(f => ({ ...f, profile_picture: e.target.files[0] })); setError('') }

  const switchMode = (m) => {
    setMode(m)
    setForm({ username: '', email: '', password: '', confirm_password: '', profile_picture: null })
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (mode === 'login') await loginMember(form.username, form.password)
      else {
        const message = await signupMember(form.username, form.email, form.password, form.confirm_password, form.profile_picture)
        setError(`✅ ${message} 📧 Please check your email (including spam/junk folder) and click the verification link.`) // Show success message with clear instructions
        // Reset form
        setForm({ username: '', email: '', password: '', confirm_password: '', profile_picture: null })
        setMode('login') // Switch to login mode
      }
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <AuthCard
      title="📚 Member Portal"
      subtitle={mode === 'login' ? 'Sign in to your member account' : 'Create a new member account'}
      accentColor="var(--info)"
    >
      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)', marginBottom: 24 }}>
        {['login', 'signup'].map(m => (
          <button key={m} type="button" onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '9px 0', background: 'none', border: 'none',
              borderBottom: mode === m ? '2px solid var(--info)' : '2px solid transparent',
              marginBottom: '-1.5px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: mode === m ? 'var(--info)' : 'var(--ink-muted)', transition: 'color 0.15s',
            }}>
            {m === 'login' ? 'Login' : 'Sign Up'}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <div className="form-grid">
          <div>
            <label>Username</label>
            <input value={form.username} onChange={set('username')} placeholder="Your username" autoComplete="username" required />
          </div>
          {mode === 'signup' && (
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" required />
            </div>
          )}
          <div>
            <label>Password</label>
            <PasswordInput value={form.password} onChange={set('password')} placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} accentColor="var(--info)" />
          </div>
          {mode === 'signup' && (
            <div>
              <label>Confirm Password</label>
              <PasswordInput value={form.confirm_password} onChange={set('confirm_password')} placeholder="Re-enter password"
                autoComplete="new-password" accentColor="var(--info)" />
            </div>
          )}
          {mode === 'signup' && (
            <div>
              <label>Profile Picture (optional)</label>
              <input type="file" accept="image/*" onChange={setFile} style={{ padding: '8px 0' }} />
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                Upload a profile picture (max 5MB, JPG/PNG)
              </div>
            </div>
          )}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: error.includes('successfully') ? 'var(--success-light)' : 'var(--danger-light)',
              border: `1px solid ${error.includes('successfully') ? '#d4edda' : '#f0c4b4'}`,
              borderRadius: 8,
              color: error.includes('successfully') ? 'var(--success)' : 'var(--danger)',
              fontSize: 13
            }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={busy}
            style={{
              width: '100%', padding: '11px', fontSize: 14, marginTop: 4, border: 'none', borderRadius: 8,
              background: 'var(--info)', color: 'white', fontWeight: 600, cursor: 'pointer',
              opacity: busy ? 0.7 : 1, fontFamily: 'var(--font-body)',
            }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Login as Member' : 'Create Account'}
          </button>
        </div>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)', marginTop: 16 }}>
        Are you staff?{' '}
        <button type="button" onClick={onSwitchToStaff}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
          Staff Login →
        </button>
      </p>
    </AuthCard>
  )
}

/* ══════════════════════════════════════════════════════
   EMAIL VERIFICATION PAGE
══════════════════════════════════════════════════════ */
function EmailVerificationPage({ token, onVerified }) {
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify/${token}/`)
        const data = await res.json()
        if (res.ok && data.verified) {
          setStatus('success')
          setMessage(data.message)
          setTimeout(() => onVerified && onVerified(), 3000) // Redirect after 3 seconds
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed')
        }
      } catch (err) {
        setStatus('error')
        setMessage('Network error. Please try again.')
      }
    }
    if (token) verifyEmail()
  }, [token, onVerified])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--paper)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)' }}>Library</span>
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System</span>
          </div>
          <p style={{ marginTop: 10, fontSize: 14, color: 'var(--ink-muted)' }}>Email Verification</p>
        </div>

        <div className="card" style={{ padding: '40px 28px', textAlign: 'center' }}>
          {status === 'verifying' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
              <h2 style={{ marginBottom: 16, color: 'var(--ink)' }}>Verifying your email...</h2>
              <p style={{ color: 'var(--ink-muted)' }}>Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
              <h2 style={{ marginBottom: 16, color: 'var(--success)' }}>Email Verified!</h2>
              <p style={{ color: 'var(--ink-muted)', marginBottom: 20 }}>{message}</p>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>You will be redirected to login shortly...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 20 }}>❌</div>
              <h2 style={{ marginBottom: 16, color: 'var(--danger)' }}>Verification Failed</h2>
              <p style={{ color: 'var(--ink-muted)', marginBottom: 20 }}>{message}</p>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '10px 20px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
                }}
              >
                Go to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   PORTAL SELECTOR  — choose Staff or Member
══════════════════════════════════════════════════════ */
function PortalSelector({ onSelect }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--paper)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)' }}>Library</span>
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System</span>
          </div>
          <p style={{ marginTop: 10, fontSize: 14, color: 'var(--ink-muted)' }}>Choose how you want to sign in</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Staff card */}
          <button type="button" onClick={() => onSelect('staff')}
            style={{
              background: 'white', border: '1.5px solid var(--border)', borderRadius: 14,
              padding: '28px 20px', cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.15s', fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(196,82,42,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏛</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6, color: 'var(--ink)' }}>Staff</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              Full access to dashboard, books, borrows & members
            </div>
            <div style={{ marginTop: 16, padding: '7px 0', background: 'var(--accent-light)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
              Login or Sign Up →
            </div>
          </button>

          {/* Member card */}
          <button type="button" onClick={() => onSelect('member')}
            style={{
              background: 'white', border: '1.5px solid var(--border)', borderRadius: 14,
              padding: '28px 20px', cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.15s', fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--info)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,94,154,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6, color: 'var(--ink)' }}>Member</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              View your borrowed books and borrowing history
            </div>
            <div style={{ marginTop: 16, padding: '7px 0', background: 'var(--info-light)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--info)' }}>
              Login or Sign Up →
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MEMBER BORROW MODAL  — pre-fills member's own name/email
══════════════════════════════════════════════════════ */
function MemberBorrowModal({ book, user, onClose, onSuccess }) {
  const defaultDue    = new Date(); defaultDue.setDate(defaultDue.getDate() + 14)
  const defaultDueStr = defaultDue.toISOString().split('T')[0]
  const todayStr      = new Date().toISOString().split('T')[0]

  const [form, setForm]       = useState({ borrower_name: user.username, borrower_email: user.email, due_date: defaultDueStr })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const daysUntilDue = Math.ceil((new Date(form.due_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24))
  const fmtLocal = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const submit = async () => {
    if (!form.borrower_name || !form.borrower_email || !form.due_date) return
    setLoading(true)
    try {
      await borrowApi.borrow({ book: book.id, borrower_name: form.borrower_name, borrower_email: form.borrower_email, due_date: form.due_date })
      onSuccess(`"${book.title}" borrowed successfully!`); onClose()
    } catch (e) {
      onSuccess(e.response?.data?.book?.[0] || e.response?.data?.non_field_errors?.[0] || 'Failed to borrow', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Borrow Book</h2>
        <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--info-light)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 28 }}>📖</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{book.author} · {book.available_copies} cop{book.available_copies !== 1 ? 'ies' : 'y'} available</div>
          </div>
        </div>
        <div className="form-grid">
          <div>
            <label>Your Name</label>
            <input value={form.borrower_name} onChange={set('borrower_name')} placeholder="Full name" />
          </div>
          <div>
            <label>Your Email</label>
            <input type="email" value={form.borrower_email} onChange={set('borrower_email')} placeholder="you@email.com" />
          </div>
          <div>
            <label>Due Date</label>
            <input type="date" value={form.due_date} min={todayStr} onChange={set('due_date')} />
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--info-light)', borderRadius: 8, fontSize: 13, color: 'var(--info)' }}>
          📅 Due date: <strong>{fmtLocal(form.due_date)}</strong>
          {daysUntilDue > 0 && <span style={{ marginLeft: 6, opacity: 0.75 }}>({daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} from today)</span>}
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" disabled={loading || !form.borrower_name || !form.borrower_email || !form.due_date}
            onClick={submit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'var(--info)', color: 'white', opacity: (loading || !form.borrower_name || !form.borrower_email || !form.due_date) ? 0.5 : 1, fontFamily: 'var(--font-body)' }}>
            {loading ? 'Borrowing…' : 'Confirm Borrow'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MEMBER DASHBOARD  — Browse Books + My Books + History
══════════════════════════════════════════════════════ */
function MemberDashboard() {
  const { user, logout }      = useAuth()
  const [tab, setTab]         = useState('browse')
  const [toast, setToast]     = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const onToast = (msg, type = 'success') => setToast({ msg, type })

  // ── My borrows ──
  const [records, setRecords]   = useState([])
  const [recLoading, setRecLoading] = useState(true)
  const [myTab, setMyTab]       = useState('active')

  const loadRecords = useCallback(() => {
    setRecLoading(true)
    borrowApi.list({ email: user.email })
      .then(r => setRecords(r.data))
      .catch(() => {})
      .finally(() => setRecLoading(false))
  }, [user.email])

  useEffect(() => { loadRecords() }, [loadRecords])

  const active  = records.filter(r => r.status !== 'returned')
  const history = records.filter(r => r.status === 'returned')
  const overdue = records.filter(r => r.status === 'overdue').length
  const shown   = myTab === 'active' ? active : history

  const [returning, setReturning] = useState(null)
  const handleReturn = async (record) => {
    setReturning(record.id)
    try {
      await borrowApi.returnBook(record.id)
      onToast(`"${record.book_title}" returned successfully!`, 'success')
      loadRecords()
      loadBooks()
    } catch {
      onToast('Failed to return book', 'error')
    } finally {
      setReturning(null)
    }
  }

  // ── Browse books ──
  const [books, setBooks]         = useState([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [search, setSearch]       = useState('')
  const [borrowBook, setBorrowBook] = useState(null)

  const loadBooks = useCallback(async () => {
    setBooksLoading(true)
    try {
      const params = search ? { search } : {}
      const r = await booksApi.list(params)
      setBooks(r.data)
    } catch { onToast('Failed to load books', 'error') }
    finally { setBooksLoading(false) }
  }, [search])

  useEffect(() => { const t = setTimeout(loadBooks, 300); return () => clearTimeout(t) }, [loadBooks])

  const fmtLocal = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const navTabs = [
    { id: 'browse',  label: '📚 Browse Books' },
    { id: 'mybooks', label: '📋 My Books' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'white', padding: '0 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 4, height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginRight: 20 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Library</span>
            <span style={{ fontSize: 12, color: 'var(--info)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Member</span>
          </div>
          {navTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: tab === t.id ? 'var(--info-light)' : 'transparent', color: tab === t.id ? 'var(--info)' : 'var(--ink-muted)', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 13, fontWeight: tab === t.id ? 500 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, padding: '3px 9px', background: 'var(--info-light)', color: 'var(--info)', borderRadius: 20, fontWeight: 500 }}>Member</span>
            {user.profile_picture_url ? (
              <img src={user.profile_picture_url} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-muted)' }}>
                {user.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <button type="button" onClick={() => setShowProfile(true)}
              style={{ fontSize: 13, color: 'var(--ink-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}>
              Profile
            </button>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>👤 <strong style={{ color: 'var(--ink)' }}>{user.username}</strong></span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 32px' }}>

        {/* ── BROWSE BOOKS TAB ── */}
        {tab === 'browse' && (
          <div>
            <div style={{ marginBottom: 22 }}><h2 style={{ fontSize: 24 }}>Browse Books</h2></div>
            <div style={{ marginBottom: 20 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN…" style={{ maxWidth: 320 }} />
            </div>
            {booksLoading ? <div className="spinner" /> : books.length === 0 ? (
              <div className="empty-state"><div className="icon">📚</div><p>No books found</p></div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {books.map(b => (
                  <div key={b.id} className="card" style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 56, background: 'var(--info-light)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>📖</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{b.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{b.author}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>ISBN: {b.isbn} · {b.available_copies}/{b.total_copies} copies</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className={`badge ${b.is_available ? 'badge-available' : 'badge-unavailable'}`}>
                        {b.is_available ? `${b.available_copies} available` : 'Unavailable'}
                      </span>
                      {b.is_available && (
                        <button type="button" onClick={() => setBorrowBook(b)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'var(--info)', color: 'white', fontFamily: 'var(--font-body)' }}>
                          Borrow
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY BOOKS TAB ── */}
        {tab === 'mybooks' && (
          <div>
            <div style={{ marginBottom: 22 }}><h2 style={{ fontSize: 24 }}>My Books</h2></div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Total Borrowed',   value: records.length, color: '' },
                { label: 'Currently Active', value: active.length,  color: '' },
                { label: 'Overdue',          value: overdue,        color: overdue > 0 ? 'var(--danger)' : '' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ fontSize: 28, ...(s.color ? { color: s.color } : {}) }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Active / History sub-tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['active', `Active (${active.length})`], ['history', `History (${history.length})`]].map(([id, label]) => (
                <button key={id} onClick={() => setMyTab(id)} className="btn btn-sm"
                  style={{ background: myTab === id ? 'var(--ink)' : 'transparent', color: myTab === id ? 'white' : 'var(--ink-muted)', border: '1.5px solid', borderColor: myTab === id ? 'var(--ink)' : 'var(--border)' }}>
                  {label}
                </button>
              ))}
              <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={loadRecords}>↻ Refresh</button>
            </div>

            {recLoading ? <div className="spinner" /> : shown.length === 0 ? (
              <div className="empty-state">
                <div className="icon">{myTab === 'active' ? '✅' : '🕰'}</div>
                <p>{myTab === 'active' ? 'No active borrows — browse books to borrow one!' : 'No borrowing history yet'}</p>
                {myTab === 'active' && (
                  <button className="btn btn-sm" onClick={() => setTab('browse')}
                    style={{ marginTop: 12, background: 'var(--info)', color: 'white', border: 'none' }}>
                    Browse Books →
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {shown.map(r => (
                  <div key={r.id} className="card"
                    style={{ padding: '14px 18px', borderLeft: r.status === 'overdue' ? '3px solid var(--danger)' : '3px solid var(--info)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 40, height: 52, background: 'var(--info-light)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>📖</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{r.book_title}</span>
                          <span className={`badge badge-${r.status}`}>{r.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>{r.book_author}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-muted)' }}>
                            <span>Borrowed: {fmtLocal(r.borrow_date)}</span>
                            <span style={{ color: r.status === 'overdue' ? 'var(--danger)' : undefined, fontWeight: r.status === 'overdue' ? 500 : 400 }}>
                              Due: {fmtLocal(r.due_date)}{r.overdue_days > 0 ? ` — ${r.overdue_days}d overdue` : ''}
                            </span>
                            {r.return_date && <span>Returned: {fmtLocal(r.return_date)}</span>}
                          </div>
                          {myTab === 'active' && (
                            <button
                              onClick={() => handleReturn(r)}
                              disabled={returning === r.id}
                              style={{
                                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                cursor: returning === r.id ? 'not-allowed' : 'pointer', border: 'none',
                                background: returning === r.id ? 'var(--border)' : 'var(--success-light)',
                                color: returning === r.id ? 'var(--ink-faint)' : 'var(--success)',
                                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { if (returning !== r.id) { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white' }}}
                              onMouseLeave={e => { if (returning !== r.id) { e.currentTarget.style.background = 'var(--success-light)'; e.currentTarget.style.color = 'var(--success)' }}}
                            >
                              {returning === r.id ? '↩ Returning…' : '↩ Return Book'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Borrow modal */}
      {borrowBook && (
        <MemberBorrowModal
          book={borrowBook}
          user={user}
          onClose={() => setBorrowBook(null)}
          onSuccess={(msg, type) => {
            onToast(msg, type)
            setBorrowBook(null)
            loadRecords()
            loadBooks()
          }}
        />
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {toast && <Toast key={Date.now()} {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
const fmt      = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return <div className={`toast ${type}`}>{msg}</div>
}

function ProfileModal({ onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const getAge = (dateString) => {
    if (!dateString) return null
    const birth = new Date(`${dateString}T00:00:00`)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1
    }
    return age
  }

  useEffect(() => {
    let mounted = true
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile/', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        if (mounted) setProfile(data)
      } catch (err) {
        if (mounted) setError(err.message || 'Unable to load profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadProfile()
    return () => { mounted = false }
  }, [])

  const age = getAge(profile?.profile?.date_of_birth)

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('profile_picture', file)

    try {
      const res = await fetch('/api/auth/profile/picture/', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!res.ok) throw new Error('Failed to upload profile picture')

      // Reload profile to get updated picture
      const profileRes = await fetch('/api/auth/profile/', { credentials: 'include' })
      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data)
      }
    } catch (err) {
      alert('Error uploading profile picture: ' + err.message)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getGenderLabel = (gender) => {
    const labels = { 'M': 'Male', 'F': 'Female', 'O': 'Other', 'N': 'Prefer not to say' }
    return labels[gender] || 'Not set'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>My Profile</div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 13 }}>View and manage your account details</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading profile…</div>
        ) : error ? (
          <div style={{ padding: 40, color: 'var(--danger)' }}>{error}</div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Profile Header */}
            <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}>
              <div 
                style={{ 
                  width: 96, 
                  height: 96, 
                  borderRadius: 24, 
                  overflow: 'hidden', 
                  background: 'rgba(255,255,255,0.2)', 
                  border: '3px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to change profile picture"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                  e.currentTarget.querySelector('.overlay-text').style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.querySelector('.overlay-text').style.opacity = '0'
                }}
              >
                {uploading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    zIndex: 10
                  }}>
                    Uploading...
                  </div>
                )}
                {profile.profile?.profile_picture ? (
                  <img src={profile.profile.profile_picture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 36, fontWeight: 700 }}>
                    {profile.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div 
                  className="overlay-text"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    fontSize: 10,
                    textAlign: 'center',
                    padding: '4px 0',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    fontWeight: 600
                  }}
                >
                  📷 Change
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfilePictureUpload}
                style={{ display: 'none' }}
              />
              <div style={{ flex: 1, color: 'white' }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{profile.full_name || profile.username}</div>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>{profile.email}</div>
                <div style={{ fontSize: 11, opacity: 0.7, fontStyle: 'italic' }}>📷 Click on profile picture to change</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 20, 
                    fontSize: 11, 
                    fontWeight: 600, 
                    background: profile.is_staff ? 'rgba(255,193,7,0.3)' : 'rgba(76,175,80,0.3)',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    {profile.is_staff ? '👨‍💼 Staff' : '👤 Member'}
                  </span>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 20, 
                    fontSize: 11, 
                    fontWeight: 600,
                    background: profile.is_email_verified ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    {profile.is_email_verified ? '✓ Verified' : '✗ Not Verified'}
                  </span>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 20, 
                    fontSize: 11, 
                    fontWeight: 600,
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    🎂 Age: {age ?? 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--primary)' }}>📋 Account Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <div className="field-label">Username</div>
                  <div className="field-value" style={{ fontWeight: 500 }}>{profile.username}</div>
                </div>
                <div>
                  <div className="field-label">Membership ID</div>
                  <div className="field-value" style={{ fontWeight: 500, fontFamily: 'monospace' }}>{profile.profile?.membership_id || 'Not set'}</div>
                </div>
                <div>
                  <div className="field-label">First name</div>
                  <div className="field-value">{profile.first_name || 'Not set'}</div>
                </div>
                <div>
                  <div className="field-label">Last name</div>
                  <div className="field-value">{profile.last_name || 'Not set'}</div>
                </div>
                <div>
                  <div className="field-label">Member since</div>
                  <div className="field-value">{formatDate(profile.profile?.membership_date)}</div>
                </div>
                <div>
                  <div className="field-label">Account status</div>
                  <div className="field-value" style={{ color: profile.is_email_verified ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                    {profile.is_email_verified ? '✓ Active' : '✗ Pending verification'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--primary)' }}>📞 Contact Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <div className="field-label">Phone</div>
                  <div className="field-value">{profile.profile?.phone_number || 'Not set'}</div>
                </div>
                <div>
                  <div className="field-label">Email</div>
                  <div className="field-value" style={{ fontSize: 13 }}>{profile.email}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="field-label">Address</div>
                  <div className="field-value">{profile.profile?.address || 'Not set'}</div>
                </div>
                <div>
                  <div className="field-label">City</div>
                  <div className="field-value">{profile.profile?.city || 'Not set'}</div>
                </div>
                <div>
                  <div className="field-label">Country</div>
                  <div className="field-value">{profile.profile?.country || 'Not set'}</div>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            {profile.profile && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--primary)' }}>👤 Personal Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div>
                    <div className="field-label">Gender</div>
                    <div className="field-value">{getGenderLabel(profile.profile.gender)}</div>
                  </div>
                  <div>
                    <div className="field-label">Date of birth</div>
                    <div className="field-value">{formatDate(profile.profile.date_of_birth)}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div className="field-label">Bio</div>
                    <div className="field-value" style={{ fontStyle: profile.profile.bio ? 'normal' : 'italic' }}>
                      {profile.profile.bio || 'No bio added yet'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reading Statistics */}
            <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(76,175,80,0.05) 100%)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--success)' }}>📚 Reading Statistics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: 16, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)' }}>{profile.profile?.total_books_borrowed ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>Total Books Borrowed</div>
                </div>
                <div style={{ textAlign: 'center', padding: 16, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>{profile.profile?.currently_borrowed ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>Currently Borrowed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BookModal({ book, onClose, onSuccess }) {
  const editing = !!book
  const [form, setForm] = useState(book
    ? { title: book.title, author: book.author, isbn: book.isbn, total_copies: book.total_copies }
    : { title: '', author: '', isbn: '', total_copies: 1 })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    const errs = {}
    if (!form.title.trim())  errs.title  = 'Required'
    if (!form.author.trim()) errs.author = 'Required'
    if (!form.isbn.trim())   errs.isbn   = 'Required'
    if (Number(form.total_copies) < 1) errs.total_copies = 'At least 1'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      if (editing) { await booksApi.update(book.id, form); onSuccess('Book updated successfully') }
      else { await booksApi.create({ ...form, available_copies: Number(form.total_copies) }); onSuccess('Book added successfully') }
      onClose()
    } catch (e) {
      const data = e.response?.data || {}
      if (data.isbn) setErrors({ isbn: data.isbn[0] })
      else onSuccess(Object.values(data)[0]?.[0] || 'Operation failed', 'error')
    } finally { setLoading(false) }
  }

  const blockNumbers = (e) => { if (/[0-9]/.test(e.key)) e.preventDefault() }
  const blockLetters = (e) => { if (/[a-zA-Z]/.test(e.key)) e.preventDefault() }

  const field = (key, label, opts = {}) => {
    let kd
    if (key === 'title' || key === 'author') kd = blockNumbers
    if (key === 'isbn') kd = blockLetters
    return (
      <div>
        <label>{label}</label>
        <input value={form[key]} onChange={set(key)} onKeyDown={kd} {...opts} style={errors[key] ? { borderColor: 'var(--danger)' } : {}} />
        {errors[key] && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors[key]}</div>}
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{editing ? 'Edit Book' : 'Add New Book'}</h2>
        <div className="form-grid">
          {field('title', 'TITLE', { placeholder: 'Book title' })}
          {field('author', 'AUTHOR', { placeholder: 'Author name' })}
          <div className="form-row">
            {field('isbn', 'ISBN', { placeholder: '978-...' })}
            {field('total_copies', 'TOTAL COPIES', { type: 'number', min: 1 })}
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Saving…' : editing ? 'Save Changes' : 'Add Book'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BorrowModal({ book, onClose, onSuccess }) {
  const defaultDue    = new Date(); defaultDue.setDate(defaultDue.getDate() + 14)
  const defaultDueStr = defaultDue.toISOString().split('T')[0]
  const todayStr      = new Date().toISOString().split('T')[0]

  const [form, setForm]     = useState({ borrower_name: '', borrower_email: '', due_date: defaultDueStr })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const daysUntilDue = Math.ceil((new Date(form.due_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24))

  const submit = async () => {
    if (!form.borrower_name || !form.borrower_email || !form.due_date) return
    setLoading(true)
    try {
      await borrowApi.borrow({ book: book.id, borrower_name: form.borrower_name, borrower_email: form.borrower_email, due_date: form.due_date })
      onSuccess(`"${book.title}" borrowed — due ${fmtShort(form.due_date)}`); onClose()
    } catch (e) {
      onSuccess(e.response?.data?.book?.[0] || e.response?.data?.non_field_errors?.[0] || 'Failed to borrow', 'error')
    } finally { setLoading(false) }
  }

  const blockNumbers = (e) => { if (/[0-9]/.test(e.key)) e.preventDefault() }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Borrow Book</h2>
        <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--paper-warm)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 28 }}>📖</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{book.author} · {book.available_copies} cop{book.available_copies !== 1 ? 'ies' : 'y'} available</div>
          </div>
        </div>
        <div className="form-grid">
          <div><label>Borrower Name</label><input value={form.borrower_name} onChange={set('borrower_name')} onKeyDown={blockNumbers} placeholder="Full name" /></div>
          <div><label>Email</label><input type="email" value={form.borrower_email} onChange={set('borrower_email')} placeholder="you@email.com" /></div>
          <div><label>Due Date</label><input type="date" value={form.due_date} min={todayStr} onChange={set('due_date')} /></div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--info-light)', borderRadius: 8, fontSize: 13, color: 'var(--info)' }}>
          📅 Due date: <strong>{fmt(form.due_date)}</strong>
          {daysUntilDue > 0 && <span style={{ marginLeft: 6, opacity: 0.75 }}>({daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} from today)</span>}
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !form.borrower_name || !form.borrower_email || !form.due_date}>
            {loading ? 'Borrowing…' : 'Confirm Borrow'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardTab({ onToast, onNavigate }) {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [books, setBooks]     = useState([])
  const [recentBorrows, setRecentBorrows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, booksRes, borrowsRes] = await Promise.all([
          dashboardApi.stats(),
          booksApi.list({ limit: 5 }),
          borrowApi.list({ status: 'borrowed', limit: 5 })
        ])
        setStats(statsRes.data)
        setBooks(booksRes.data)
        setRecentBorrows(borrowsRes.data)
      } catch (err) {
        onToast('Failed to load dashboard', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <div className="spinner" />
  if (!stats)  return null

  return (
    <div>
      {/* Welcome Section */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
          Welcome back, {user?.username || 'Admin'}!
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>Here's what's happening with your library today.</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
        {[
          { label: 'Total Books', value: stats.total_books || 0, sub: 'All books in library', icon: '📚', color: '#3b82f6' },
          { label: 'Total Members', value: stats.total_members || 0, sub: 'Registered members', icon: '👥', color: '#10b981' },
          { label: 'Issued Books', value: stats.active_borrows || 0, sub: 'Currently issued', icon: '📋', color: '#f59e0b' },
          { label: 'Overdue Books', value: stats.overdue_count || 0, sub: 'Not returned yet', icon: '⚠️', color: '#ef4444' },
        ].map((card, index) => (
          <div key={card.label} style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                {card.icon}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: 20 }}>
                {index + 1}
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: card.color, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Book Inventory */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Book Inventory</h2>
            <button
              onClick={() => onNavigate('books')}
              style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              + Add New Book
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Book Title', 'Author', 'Category', 'Copies', 'Status', 'Action'].map(header => (
                    <th key={header} style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {books.slice(0, 5).map(book => (
                  <tr key={book.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: '#1f2937' }}>{book.title}</td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: '#6b7280' }}>{book.author}</td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: '#6b7280' }}>Fiction</td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: '#1f2937', fontWeight: 500 }}>{book.total_copies}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontWeight: 500,
                        background: book.is_available ? '#d1fae5' : '#fee2e2',
                        color: book.is_available ? '#065f46' : '#991b1b'
                      }}>
                        {book.is_available ? 'Available' : 'Issued'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#6b7280' }}>⋮</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => onNavigate('books')}
              style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              View All Books →
            </button>
          </div>
        </div>

        {/* Recently Issued Books */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 20 }}>Recently Issued Books</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recentBorrows.slice(0, 4).map(borrow => (
              <div key={borrow.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f9fafb', borderRadius: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  📖
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937', marginBottom: 2 }}>{borrow.book_title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Issued to: {borrow.borrower_name}</div>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {new Date(borrow.borrow_date).toLocaleDateString()}
                </div>
              </div>
            ))}
            {recentBorrows.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>
                No recent issuances
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Library Overview Chart */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Library Overview</h2>
            <select style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280', background: 'white' }}>
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Year</option>
            </select>
          </div>
          <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '20px 0' }}>
            {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].map((week, index) => {
              const height = 40 + Math.random() * 60
              return (
                <div key={week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: '100%', height: `${height}%`, background: '#3b82f6', borderRadius: 8, transition: 'height 0.3s' }} />
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{week}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 20 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Add Book', icon: '📚', action: () => onNavigate('books') },
              { label: 'Add Member', icon: '👤', action: () => onNavigate('members') },
              { label: 'Issue Book', icon: '📋', action: () => onNavigate('issued') },
              { label: 'Return Book', icon: '↩️', action: () => onNavigate('returns') },
              { label: 'View Reports', icon: '📈', action: () => onNavigate('reports') },
            ].map(action => (
              <button
                key={action.label}
                onClick={action.action}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                <span style={{ fontSize: 18 }}>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BooksTab({ onToast }) {
  const [books, setBooks]               = useState([])
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editBook, setEditBook]         = useState(null)
  const [borrowBook, setBorrowBook]     = useState(null)
  const [filterAvail, setFilterAvail]   = useState(false)
  const [filterUnavail, setFilterUnavail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filterAvail) params.available = 'true'
      const r = await booksApi.list(params)
      let data = r.data
      if (filterUnavail) data = data.filter(b => !b.is_available)
      setBooks(data)
    } catch { onToast('Failed to load books', 'error') }
    finally { setLoading(false) }
  }, [search, filterAvail, filterUnavail])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const deleteBook = async (book) => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return
    try { await booksApi.delete(book.id); onToast('Book deleted'); load() }
    catch { onToast('Cannot delete — book has borrow records', 'error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN…" style={{ maxWidth: 280 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, fontSize: 13, color: 'var(--ink-muted)', cursor: 'pointer', marginTop: 0 }}>
          <input type="checkbox" checked={filterAvail} onChange={e => { setFilterAvail(e.target.checked); if (e.target.checked) setFilterUnavail(false) }} style={{ width: 'auto' }} /> Available only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, fontSize: 13, color: 'var(--ink-muted)', cursor: 'pointer', marginTop: 0 }}>
          <input type="checkbox" checked={filterUnavail} onChange={e => { setFilterUnavail(e.target.checked); if (e.target.checked) setFilterAvail(false) }} style={{ width: 'auto' }} /> Unavailable only
        </label>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowModal(true)}>+ Add Book</button>
      </div>
      {loading ? <div className="spinner" /> : books.length === 0 ? (
        <div className="empty-state"><div className="icon">📚</div><p>No books found</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {books.map(b => (
            <div key={b.id} className="card" style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 56, background: 'var(--accent-light)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>📖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{b.author}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>ISBN: {b.isbn} · {b.available_copies}/{b.total_copies} copies</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span className={`badge ${b.is_available ? 'badge-available' : 'badge-unavailable'}`}>{b.is_available ? `${b.available_copies} avail.` : 'Unavailable'}</span>
                {b.is_available && <button className="btn btn-sm btn-primary" onClick={() => setBorrowBook(b)}>Borrow</button>}
                <button className="btn btn-sm btn-ghost" onClick={() => setEditBook(b)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteBook(b)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {(showModal || editBook) && <BookModal book={editBook} onClose={() => { setShowModal(false); setEditBook(null) }} onSuccess={(m, t) => { onToast(m, t); load() }} />}
      {borrowBook && <BorrowModal book={borrowBook} onClose={() => setBorrowBook(null)} onSuccess={(m, t) => { onToast(m, t); load() }} />}
    </div>
  )
}

function ActiveBorrowsTab({ onToast }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await borrowApi.list(); setRecords(r.data.filter(r => r.status !== 'returned')) }
    catch { onToast('Failed to load', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const returnBook = async (record) => {
    try { await borrowApi.returnBook(record.id); onToast(`"${record.book_title}" returned successfully`); load() }
    catch (e) { onToast(e.response?.data?.error || 'Failed to return', 'error') }
  }

  const filtered     = filter === 'all' ? records : records.filter(r => r.status === filter)
  const overdueCount = records.filter(r => r.status === 'overdue').length

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {['all', 'borrowed', 'overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="btn btn-sm"
            style={{ background: filter === f ? 'var(--ink)' : 'transparent', color: filter === f ? 'white' : 'var(--ink-muted)', border: '1.5px solid', borderColor: filter === f ? 'var(--ink)' : 'var(--border)' }}>
            {f === 'all' ? `All (${records.length})` : f === 'overdue' ? `Overdue (${overdueCount})` : `Borrowed (${records.length - overdueCount})`}
          </button>
        ))}
        <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={load}>↻ Refresh</button>
      </div>
      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">✅</div><p>{filter === 'overdue' ? 'No overdue borrows' : 'No active borrows'}</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(r => (
            <div key={r.id} className="card" style={{ padding: '14px 18px', borderLeft: r.status === 'overdue' ? '3px solid var(--danger)' : '3px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{r.book_title}</span>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>{r.book_author}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{r.borrower_name}</span>
                    <span style={{ color: 'var(--ink-muted)' }}>{r.borrower_email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                    <span>Borrowed: {fmt(r.borrow_date)}</span>
                    <span style={{ color: r.status === 'overdue' ? 'var(--danger)' : undefined, fontWeight: r.status === 'overdue' ? 500 : 400 }}>
                      Due: {fmt(r.due_date)}{r.overdue_days > 0 ? ` — ${r.overdue_days}d overdue` : ''}
                    </span>
                  </div>
                </div>
                <button className="btn btn-sm btn-success" onClick={() => returnBook(r)}>↩ Return</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MembersTab({ onToast }) {
  const [members, setMembers]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [selected, setSelected]           = useState(null)
  const [memberHistory, setMemberHistory] = useState([])
  const [histLoading, setHistLoading]     = useState(false)

  useEffect(() => {
    borrowApi.members().then(r => setMembers(r.data)).catch(() => onToast('Failed to load members', 'error')).finally(() => setLoading(false))
  }, [])

  const viewHistory = async (member) => {
    setSelected(member); setHistLoading(true)
    try { const r = await borrowApi.list({ email: member.borrower_email }); setMemberHistory(r.data) }
    catch { onToast('Failed to load history', 'error') }
    finally { setHistLoading(false) }
  }

  const filtered   = members.filter(m => m.borrower_name.toLowerCase().includes(search.toLowerCase()) || m.borrower_email.toLowerCase().includes(search.toLowerCase()))
  const initials   = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors     = ['var(--accent-light)', 'var(--info-light)', 'var(--success-light)', 'var(--warning-light)']
  const textColors = ['var(--accent)', 'var(--info)', 'var(--success)', 'var(--warning)']

  if (selected) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>← Back</button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{selected.borrower_name}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{selected.borrower_email}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[['Total Borrows', selected.total], ['Active', selected.active], ['Overdue', selected.overdue]].map(([l, v]) => (
          <div key={l} className="stat-card"><div className="stat-label">{l}</div><div className="stat-value" style={{ fontSize: 24 }}>{v}</div></div>
        ))}
      </div>
      {histLoading ? <div className="spinner" /> : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead><tr>{['Book', 'Borrowed', 'Due', 'Returned', 'Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {memberHistory.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.book_title}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.borrow_date)}</td>
                  <td style={{ color: r.status === 'overdue' ? 'var(--danger)' : 'var(--ink-muted)' }}>{fmt(r.due_date)}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.return_date)}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 20 }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" style={{ maxWidth: 300 }} /></div>
      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">👥</div><p>No members found</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map((m, i) => {
            const ci = i % 4
            return (
              <div key={m.borrower_email} className="card" style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => viewHistory(m)}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: colors[ci], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: textColors[ci], flexShrink: 0 }}>{initials(m.borrower_name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{m.borrower_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{m.borrower_email}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {m.overdue > 0 && <span className="badge badge-overdue">⚠ {m.overdue} overdue</span>}
                  {m.active > 0 && <span className="badge badge-borrowed">{m.active} active</span>}
                  <span className="badge badge-info">{m.total} total</span>
                  <span style={{ fontSize: 16, color: 'var(--ink-faint)' }}>›</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HistoryTab({ onToast }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    borrowApi.history().then(r => setRecords(r.data)).catch(() => onToast('Failed to load history', 'error')).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {loading ? <div className="spinner" /> : records.length === 0 ? (
        <div className="empty-state"><div className="icon">🕰</div><p>No borrowing history yet</p></div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead><tr>{['Book', 'Author', 'Borrower', 'Borrowed', 'Due', 'Returned', 'Overdue Days', 'Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.book_title}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{r.book_author}</td>
                  <td>{r.borrower_name}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.borrow_date)}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.due_date)}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.return_date)}</td>
                  <td style={{ color: r.overdue_days > 0 ? 'var(--danger)' : 'var(--ink-faint)', fontWeight: r.overdue_days > 0 ? 500 : 400 }}>{r.overdue_days > 0 ? `${r.overdue_days}d` : '—'}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   STAFF DASHBOARD  — full access
══════════════════════════════════════════════════════ */
function StaffDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab]     = useState('dashboard')
  const [toast, setToast] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const onToast = (msg, type = 'success') => setToast({ msg, type })

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'books',     label: 'Books', icon: '📚' },
    { id: 'members',   label: 'Members', icon: '👥' },
    { id: 'issued',    label: 'Issued Books', icon: '📋' },
    { id: 'returns',   label: 'Return Books', icon: '↩️' },
    { id: 'categories', label: 'Categories', icon: '🏷️' },
    { id: 'fines',     label: 'Fines', icon: '💰' },
    { id: 'reports',   label: 'Reports', icon: '�' },
    { id: 'settings',  label: 'Settings', icon: '⚙️' },
  ]

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      try {
        const [booksRes, membersRes] = await Promise.all([
          booksApi.list({ search: searchQuery, limit: 5 }),
          fetch(`/api/users/?search=${encodeURIComponent(searchQuery)}`, { credentials: 'include' }).then(r => r.json())
        ])

        const results = [
          ...booksRes.data.map(book => ({ type: 'book', ...book })),
          ...(Array.isArray(membersRes.users) ? membersRes.users.slice(0, 5).map(member => ({ type: 'member', ...member })) : [])
        ]

        setSearchResults(results)
        setShowSearchResults(true)
      } catch (err) {
        console.error('Search error:', err)
      }
    }

    const debounceTimer = setTimeout(performSearch, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f5f7fa' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 260 : 70,
        background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              🏛️
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Library</div>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.5px' }}>MANAGEMENT</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: 'white',
                fontSize: 14,
                fontWeight: tab === t.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: 4,
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (tab !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                if (tab !== t.id) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              {sidebarOpen && <span>{t.label}</span>}
            </button>
          ))}
        </div>

        {/* User Info */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              👤
            </div>
            {sidebarOpen && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user.username}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Staff Admin</div>
              </div>
            )}
            <button
              onClick={logout}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'white', fontSize: 16 }}
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: sidebarOpen ? 260 : 70, transition: 'margin-left 0.3s ease' }}>
        {/* Top Bar */}
        <div style={{ background: 'white', padding: '16px 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#374151' }}
          >
            ☰
          </button>
          <div style={{ flex: 1, maxWidth: 500, margin: '0 32px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search books and members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#9ca3af' }}>
                🔍
              </span>
            </div>
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                borderRadius: 8,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                marginTop: 8,
                maxHeight: 400,
                overflowY: 'auto',
                zIndex: 1000
              }}>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      if (result.type === 'book') {
                        setTab('books')
                      } else if (result.type === 'member') {
                        setTab('members')
                      }
                      setSearchQuery('')
                      setShowSearchResults(false)
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{result.type === 'book' ? '📚' : '👤'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                          {result.type === 'book' ? result.title : result.username}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {result.type === 'book' ? result.author : result.email}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: result.type === 'book' ? '#dbeafe' : '#d1fae5',
                        color: result.type === 'book' ? '#1e40af' : '#065f46',
                        fontWeight: 500
                      }}>
                        {result.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setShowProfile(true)}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#374151' }}
              title="Profile"
            >
              👤
            </button>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#1e40af' }}>
              {user.username?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main style={{ padding: '32px' }}>
          {tab === 'dashboard' && <DashboardTab onToast={onToast} onNavigate={setTab} />}
          {tab === 'books'     && <BooksTab     onToast={onToast} />}
          {tab === 'members'   && <MembersTab   onToast={onToast} />}
          {tab === 'issued'    && <ActiveBorrowsTab onToast={onToast} />}
          {tab === 'returns'   && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Return Books feature coming soon</div>}
          {tab === 'categories' && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Categories feature coming soon</div>}
          {tab === 'fines'     && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Fines feature coming soon</div>}
          {tab === 'reports'   && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Reports feature coming soon</div>}
          {tab === 'settings'  && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Settings feature coming soon</div>}
        </main>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {toast && <Toast key={Date.now()} {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════ */
function LibraryApp() {
  const { user, loading } = useAuth()
  const [portal, setPortal] = useState('portal')

  // Check for email verification token in URL
  const urlParams = new URLSearchParams(window.location.search)
  const verifyToken = urlParams.get('verify')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div className="spinner" />
    </div>
  )

  // Show email verification page if token is present
  if (verifyToken) {
    return <EmailVerificationPage token={verifyToken} onVerified={() => {
      window.history.replaceState({}, '', '/')
      setPortal('portal')
    }} />
  }

  if (user) return user.role === 'staff' ? <StaffDashboard /> : <MemberDashboard />

  if (portal === 'staff')  return <StaffLoginPage  onSwitchToMember={() => setPortal('member')} />
  if (portal === 'member') return <MemberAuthPage  onSwitchToStaff={() => setPortal('staff')} />
  return <PortalSelector onSelect={setPortal} />
}

export default function App() {
  return (
    <AuthProvider>
      <LibraryApp />
    </AuthProvider>
  )
}