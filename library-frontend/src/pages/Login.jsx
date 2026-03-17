import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:8000/api/accounts/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('username', data.username)
        localStorage.setItem('role', data.role)
        if (data.role === 'librarian') {
          navigate('/dashboard')
        } else {
          navigate('/my-books')
        }
      } else {
        setError(data.error || 'Login failed.')
      }
    } catch {
      setError('Cannot connect to server.')
    }
    setLoading(false)
  }

  const books = [
    { left: '5%', size: '22px', dur: '4s', delay: '0s', icon: '📚' },
    { left: '13%', size: '16px', dur: '5.2s', delay: '0.9s', icon: '📖' },
    { left: '22%', size: '20px', dur: '4.7s', delay: '0.4s', icon: '📗' },
    { left: '33%', size: '16px', dur: '6s', delay: '1.7s', icon: '📘' },
    { left: '44%', size: '24px', dur: '4.3s', delay: '0.6s', icon: '📙' },
    { left: '55%', size: '16px', dur: '5.5s', delay: '2.1s', icon: '📕' },
    { left: '65%', size: '20px', dur: '4s', delay: '1s', icon: '📚' },
    { left: '75%', size: '16px', dur: '5s', delay: '0.3s', icon: '📖' },
    { left: '85%', size: '22px', dur: '4.8s', delay: '1.5s', icon: '📗' },
    { left: '93%', size: '16px', dur: '6.3s', delay: '2.5s', icon: '📘' },
  ]

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Lato', sans-serif" }}>

      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-80px) rotate(0deg); opacity: 0; }
          8%   { opacity: 0.9; }
          88%  { opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(380deg); opacity: 0; }
        }
        .fbook {
          position: fixed; top: -80px; pointer-events: none;
          animation: fall linear infinite;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));
          z-index: 3;
        }
        .login-input {
          width: 100%; padding: 11px 14px; font-size: 13px;
          border: 1px solid #1e2540; border-radius: 9px;
          background: rgba(255,255,255,0.05); color: white;
          font-family: 'Lato', sans-serif; font-weight: 300;
          outline: none; box-sizing: border-box; letter-spacing: 0.3px;
        }
        .login-input:focus { border-color: #7c3aed; }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
        .sign-btn {
          width: 100%; padding: 12px; background: #7c3aed;
          color: white; border: none; border-radius: 10px;
          font-size: 13px; cursor: pointer; letter-spacing: 1px;
          font-family: 'Lato', sans-serif; margin-bottom: 16px;
          font-weight: 700;
        }
        .sign-btn:hover { background: #6d28d9; }
        .sign-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      {/* Real library background photo */}
      <img
        src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1400&q=80"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: 0 }}
        alt="library"
      />

      {/* Dark overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,16,0.75)', zIndex: 1 }} />

      {/* Falling books */}
      {books.map((b, i) => (
        <div key={i} className="fbook" style={{ left: b.left, fontSize: b.size, animationDuration: b.dur, animationDelay: b.delay }}>
          {b.icon}
        </div>
      ))}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 5, display: 'flex', width: '100%', maxWidth: '900px', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxSizing: 'border-box' }}>

        {/* Left text */}
        <div style={{ maxWidth: '340px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', padding: '4px 14px', borderRadius: '20px', marginBottom: '18px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#a78bfa' }} />
            <span style={{ fontSize: '10px', color: '#a78bfa', letterSpacing: '1.5px', fontWeight: '300' }}>LIBRARY BORROWING SYSTEM</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '38px', fontWeight: '700', color: 'white', lineHeight: '1.2', margin: '0 0 14px 0' }}>
            Your gateway<br />to <em style={{ color: '#a78bfa', fontStyle: 'italic' }}>knowledge.</em>
          </h1>
          <div style={{ width: '40px', height: '1px', background: 'rgba(167,139,250,0.4)', marginBottom: '14px' }} />
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.9', fontWeight: '300', letterSpacing: '0.3px', margin: '0 0 28px 0' }}>
            Access, borrow and manage thousands of books and digital resources in one place.
          </p>
          <div style={{ display: 'flex', gap: '28px' }}>
            {[['24k+', 'BOOKS'], ['180+', 'NEW/MONTH'], ['Free', 'FOR ALL']].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: 'white' }}>{val}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', marginTop: '2px' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div style={{ width: '320px', background: 'rgba(6,10,22,0.9)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '18px', padding: '36px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ width: '36px', height: '36px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📚</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', color: 'white', fontWeight: '700' }}>LibraryMS</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>BORROWING SYSTEM</div>
            </div>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: 'white', margin: '0 0 4px 0', fontWeight: '700' }}>Welcome back</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 24px 0', fontWeight: '300', letterSpacing: '0.3px' }}>Sign in to your library account</p>

          {error && (
            <div style={{ background: 'rgba(180,40,40,0.2)', border: '1px solid rgba(180,40,40,0.4)', color: '#f87171', borderRadius: '9px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px' }}>❌ {error}</div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#a78bfa', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '7px' }}>USERNAME</label>
            <input name="username" type="text" required placeholder="Enter your username" value={form.username} onChange={handleChange} className="login-input" />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#a78bfa', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '7px' }}>PASSWORD</label>
            <input name="password" type="password" required placeholder="••••••••" value={form.password} onChange={handleChange} className="login-input" />
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading} className="sign-btn">
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '300', margin: 0 }}>
            No account yet?{' '}
            <span onClick={() => navigate('/signup')} style={{ color: '#a78bfa', fontWeight: '400', cursor: 'pointer' }}>Create one here</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login