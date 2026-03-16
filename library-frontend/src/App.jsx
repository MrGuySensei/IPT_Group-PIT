import { useState, useEffect, useCallback } from 'react'
import { dashboardApi, booksApi, borrowApi } from './api'
import './index.css'

const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

/* ── Toast ── */
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return <div className={`toast ${type}`}>{msg}</div>
}

/* ── Add / Edit Book Modal ── */
function BookModal({ book, onClose, onSuccess }) {
  const editing = !!book
  const [form, setForm] = useState(book
    ? { title: book.title, author: book.author, isbn: book.isbn, total_copies: book.total_copies }
    : { title: '', author: '', isbn: '', total_copies: 1 })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Required'
    if (!form.author.trim()) errs.author = 'Required'
    if (!form.isbn.trim()) errs.isbn = 'Required'
    if (Number(form.total_copies) < 1) errs.total_copies = 'At least 1'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      if (editing) {
        await booksApi.update(book.id, form)
        onSuccess('Book updated successfully')
      } else {
        await booksApi.create({ ...form, available_copies: Number(form.total_copies) })
        onSuccess('Book added successfully')
      }
      onClose()
    } catch (e) {
      const data = e.response?.data || {}
      if (data.isbn) setErrors({ isbn: data.isbn[0] })
      else onSuccess(Object.values(data)[0]?.[0] || 'Operation failed', 'error')
    } finally { setLoading(false) }
  }

  const field = (key, label, opts = {}) => (
    <div>
      <label>{label}</label>
      <input value={form[key]} onChange={set(key)} {...opts} style={errors[key] ? { borderColor: 'var(--danger)' } : {}} />
      {errors[key] && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{errors[key]}</div>}
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{editing ? 'Edit Book' : 'Add New Book'}</h2>
        <div className="form-grid">
          {field('title', 'Title', { placeholder: 'Book title' })}
          {field('author', 'Author', { placeholder: 'Author name' })}
          <div className="form-row">
            {field('isbn', 'ISBN', { placeholder: '978-...' })}
            {field('total_copies', 'Total Copies', { type: 'number', min: 1 })}
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

/* ── Borrow Modal ── */
function BorrowModal({ book, onClose, onSuccess }) {
  const [form, setForm] = useState({ borrower_name: '', borrower_email: '' })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14)

  const submit = async () => {
    if (!form.borrower_name || !form.borrower_email) return
    setLoading(true)
    try {
      await borrowApi.borrow({ book: book.id, ...form })
      onSuccess(`"${book.title}" borrowed — due ${fmtShort(dueDate.toISOString().split('T')[0])}`)
      onClose()
    } catch (e) {
      const msg = e.response?.data?.book?.[0] || e.response?.data?.non_field_errors?.[0] || 'Failed to borrow'
      onSuccess(msg, 'error')
    } finally { setLoading(false) }
  }

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
          <div><label>Borrower Name</label><input value={form.borrower_name} onChange={set('borrower_name')} placeholder="Full name" /></div>
          <div><label>Email</label><input type="email" value={form.borrower_email} onChange={set('borrower_email')} placeholder="you@email.com" /></div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--info-light)', borderRadius: 8, fontSize: 13, color: 'var(--info)' }}>
          📅 Due date: <strong>{fmt(dueDate.toISOString().split('T')[0])}</strong> (14 days)
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !form.borrower_name || !form.borrower_email}>
            {loading ? 'Borrowing…' : 'Confirm Borrow'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Dashboard Tab ── */
function DashboardTab({ onToast, onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setStats(r.data))
      .catch(() => onToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="spinner" />
  if (!stats) return null

  const utilPct = stats.total_copies > 0 ? Math.round((stats.borrowed_copies / stats.total_copies) * 100) : 0

  return (
    <div>
      {stats.overdue_count > 0 && (
        <div className="overdue-banner">
          <strong>⚠ {stats.overdue_count} overdue borrow{stats.overdue_count !== 1 ? 's' : ''} — </strong>
          <span style={{ fontSize: 13, color: 'var(--accent-dark)' }}>
            {stats.overdue_records.slice(0,2).map(r => `"${r.book_title}" (${r.overdue_days}d)`).join(', ')}
            {stats.overdue_count > 2 && ` and ${stats.overdue_count - 2} more`}
          </span>
          <button className="btn btn-sm btn-danger" style={{ marginLeft: 12 }} onClick={() => onNavigate('borrows')}>View All</button>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Books', value: stats.total_books, sub: 'unique titles', color: '' },
          { label: 'Total Copies', value: stats.total_copies, sub: `${stats.available_copies} available`, color: '' },
          { label: 'Active Borrows', value: stats.active_borrows, sub: `${stats.returned_count} returned`, color: '' },
          { label: 'Overdue', value: stats.overdue_count, sub: 'need attention', color: stats.overdue_count > 0 ? 'var(--danger)' : '' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>Collection Utilization</div>
          <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: utilPct > 70 ? 'var(--warning)' : 'var(--success)' }}>{utilPct}%</div>
        </div>
        <div style={{ height: 8, background: 'var(--paper-warm)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${utilPct}%`, background: utilPct > 70 ? 'var(--warning)' : 'var(--success)', borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>{stats.borrowed_copies} of {stats.total_copies} copies currently borrowed</div>
      </div>

      {/* Popular books */}
      {stats.popular_books.length > 0 && (
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 14 }}>Most Borrowed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.popular_books.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? 'var(--accent-light)' : 'var(--paper-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: i === 0 ? 'var(--accent)' : 'var(--ink-muted)', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{b.author}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-muted)', fontWeight: 500 }}>{b.borrow_count}×</div>
                <div style={{ width: 80, height: 6, background: 'var(--paper-warm)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (b.borrow_count / (stats.popular_books[0]?.borrow_count || 1)) * 100)}%`, background: 'var(--accent)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Books Tab ── */
function BooksTab({ onToast }) {
  const [books, setBooks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBook, setEditBook] = useState(null)
  const [borrowBook, setBorrowBook] = useState(null)
  const [filterAvail, setFilterAvail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filterAvail) params.available = 'true'
      const r = await booksApi.list(params)
      setBooks(r.data)
    } catch { onToast('Failed to load books', 'error') }
    finally { setLoading(false) }
  }, [search, filterAvail])

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
          <input type="checkbox" checked={filterAvail} onChange={e => setFilterAvail(e.target.checked)} style={{ width: 'auto' }} />
          Available only
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
                <span className={`badge ${b.is_available ? 'badge-available' : 'badge-unavailable'}`}>
                  {b.is_available ? `${b.available_copies} avail.` : 'Unavailable'}
                </span>
                {b.is_available && <button className="btn btn-sm btn-primary" onClick={() => setBorrowBook(b)}>Borrow</button>}
                <button className="btn btn-sm btn-ghost" onClick={() => setEditBook(b)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteBook(b)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showModal || editBook) && (
        <BookModal
          book={editBook}
          onClose={() => { setShowModal(false); setEditBook(null) }}
          onSuccess={(m, t) => { onToast(m, t); load() }}
        />
      )}
      {borrowBook && (
        <BorrowModal book={borrowBook} onClose={() => setBorrowBook(null)} onSuccess={(m, t) => { onToast(m, t); load() }} />
      )}
    </div>
  )
}

/* ── Active Borrows Tab ── */
function ActiveBorrowsTab({ onToast }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await borrowApi.list()
      setRecords(r.data.filter(r => r.status !== 'returned'))
    } catch { onToast('Failed to load', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const returnBook = async (record) => {
    try {
      await borrowApi.returnBook(record.id)
      onToast(`"${record.book_title}" returned successfully`)
      load()
    } catch (e) { onToast(e.response?.data?.error || 'Failed to return', 'error') }
  }

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)
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

/* ── Members Tab ── */
function MembersTab({ onToast }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [memberHistory, setMemberHistory] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => {
    borrowApi.members()
      .then(r => setMembers(r.data))
      .catch(() => onToast('Failed to load members', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const viewHistory = async (member) => {
    setSelected(member)
    setHistLoading(true)
    try {
      const r = await borrowApi.list({ email: member.borrower_email })
      setMemberHistory(r.data)
    } catch { onToast('Failed to load history', 'error') }
    finally { setHistLoading(false) }
  }

  const filtered = members.filter(m =>
    m.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
    m.borrower_email.toLowerCase().includes(search.toLowerCase())
  )

  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['var(--accent-light)', 'var(--info-light)', 'var(--success-light)', 'var(--warning-light)']
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
          <div key={l} className="stat-card">
            <div className="stat-label">{l}</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{v}</div>
          </div>
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
      <div style={{ marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" style={{ maxWidth: 300 }} />
      </div>
      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">👥</div><p>No members found</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map((m, i) => {
            const ci = i % 4
            return (
              <div key={m.borrower_email} className="card" style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => viewHistory(m)}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: colors[ci], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: textColors[ci], flexShrink: 0 }}>
                  {initials(m.borrower_name)}
                </div>
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

/* ── History Tab ── */
function HistoryTab({ onToast }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    borrowApi.history()
      .then(r => setRecords(r.data))
      .catch(() => onToast('Failed to load history', 'error'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {loading ? <div className="spinner" /> : records.length === 0 ? (
        <div className="empty-state"><div className="icon">🕰</div><p>No borrowing history yet</p></div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>{['Book', 'Author', 'Borrower', 'Borrowed', 'Due', 'Returned', 'Overdue Days', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.book_title}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{r.book_author}</td>
                  <td>{r.borrower_name}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.borrow_date)}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.due_date)}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{fmt(r.return_date)}</td>
                  <td style={{ color: r.overdue_days > 0 ? 'var(--danger)' : 'var(--ink-faint)', fontWeight: r.overdue_days > 0 ? 500 : 400 }}>
                    {r.overdue_days > 0 ? `${r.overdue_days}d` : '—'}
                  </td>
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

/* ── Root App ── */
export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const onToast = (msg, type = 'success') => setToast({ msg, type })

  const tabs = [
    { id: 'dashboard', label: '◎ Dashboard' },
    { id: 'books', label: '📚 Books' },
    { id: 'borrows', label: '📋 Active Borrows' },
    { id: 'members', label: '👥 Members' },
    { id: 'history', label: '🕰 History' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'white', padding: '0 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 4, height: 56 }}>
          <div style={{ marginRight: 24, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Library</span>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>System</span>
          </div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'var(--accent-light)' : 'transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--ink-muted)',
                border: 'none', borderRadius: 8, padding: '7px 13px',
                fontSize: 13, fontWeight: tab === t.id ? 500 : 400, cursor: 'pointer', transition: 'all 0.15s'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 24 }}>{tabs.find(t => t.id === tab)?.label.replace(/^[^\s]+\s/, '')}</h2>
        </div>
        {tab === 'dashboard' && <DashboardTab onToast={onToast} onNavigate={setTab} />}
        {tab === 'books' && <BooksTab onToast={onToast} />}
        {tab === 'borrows' && <ActiveBorrowsTab onToast={onToast} />}
        {tab === 'members' && <MembersTab onToast={onToast} />}
        {tab === 'history' && <HistoryTab onToast={onToast} />}
      </main>

      {toast && <Toast key={Date.now()} {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
