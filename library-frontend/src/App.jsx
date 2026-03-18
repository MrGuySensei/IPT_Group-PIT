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
      {/* Alert Banner */}
      {stats.overdue_count > 0 && (
        <div className="dashboard-alert" style={{
          background: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)',
          border: '1px solid #ffcccc',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{ fontSize: '24px' }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--danger)', fontSize: '14px' }}>
              {stats.overdue_count} overdue borrow{stats.overdue_count !== 1 ? 's' : ''}
            </strong>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {stats.overdue_records.slice(0, 2).map(r => `"${r.book_title}" (${r.overdue_days}d)`).join(', ')}
              {stats.overdue_count > 2 && ` and ${stats.overdue_count - 2} more`}
            </div>
          </div>
          <button 
            className="btn btn-sm" 
            style={{ 
              background: 'var(--danger)', 
              color: 'white',
              borderRadius: '8px',
              padding: '8px 16px'
            }} 
            onClick={() => onNavigate('borrows')}
          >
            View All
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {[
          { 
            label: 'Total Books', 
            value: stats.total_books, 
            sub: 'unique titles', 
            color: '#6366f1',
            icon: '📚',
            bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
          },
          { 
            label: 'Total Copies', 
            value: stats.total_copies, 
            sub: `${stats.available_copies} available`, 
            color: '#10b981',
            icon: '📖',
            bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
          },
          { 
            label: 'Active Borrows', 
            value: stats.active_borrows, 
            sub: `${stats.returned_count} returned`, 
            color: '#f59e0b',
            icon: '📋',
            bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
          },
          { 
            label: 'Overdue', 
            value: stats.overdue_count, 
            sub: 'need attention', 
            color: stats.overdue_count > 0 ? '#ef4444' : '#10b981',
            icon: stats.overdue_count > 0 ? '⚠️' : '✅',
            bg: stats.overdue_count > 0 
              ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
              : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
          },
        ].map((s, index) => (
          <div 
            key={s.label} 
            className="dashboard-stat-card"
            style={{
              background: s.bg,
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: '16px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
              animation: `fadeInUp 0.4s ease ${index * 0.1}s both`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ 
              position: 'absolute', 
              top: '12px', 
              right: '12px', 
              fontSize: '24px',
              opacity: 0.7
            }}>
              {s.icon}
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: '8px' }}>
              {s.label}
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontFamily: 'var(--font-display)', 
              fontWeight: '700', 
              color: s.color,
              lineHeight: '1',
              marginBottom: '6px'
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px', 
        marginBottom: '24px' 
      }}>
        {/* Utilization Card */}
        <div className="dashboard-card" style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '600' }}>
              Collection Utilization
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontFamily: 'var(--font-display)', 
              fontWeight: '700',
              color: utilPct > 70 ? 'var(--warning)' : 'var(--success)' 
            }}>
              {utilPct}%
            </div>
          </div>
          <div style={{ 
            height: '12px', 
            background: '#f3f4f6', 
            borderRadius: '6px', 
            overflow: 'hidden',
            marginBottom: '12px'
          }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${utilPct}%`, 
                background: utilPct > 70 
                  ? 'linear-gradient(90deg, #f59e0b, #f97316)' 
                  : 'linear-gradient(90deg, #10b981, #059669)',
                borderRadius: '6px', 
                transition: 'width 0.8s ease',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '20px',
                height: '100%',
                background: 'rgba(255,255,255,0.3)',
                filter: 'blur(8px)'
              }} />
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            {stats.borrowed_copies} of {stats.total_copies} copies currently borrowed
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card" style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button 
              className="dashboard-action-btn"
              onClick={() => onNavigate('books')}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                fontSize: '13px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>➕</div>
              Add Book
            </button>
            <button 
              className="dashboard-action-btn"
              onClick={() => onNavigate('borrows')}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                fontSize: '13px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>📋</div>
              View Borrows
            </button>
            <button 
              className="dashboard-action-btn"
              onClick={() => onNavigate('members')}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                fontSize: '13px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>👥</div>
              Members
            </button>
            <button 
              className="dashboard-action-btn"
              onClick={() => onNavigate('history')}
              style={{
                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                fontSize: '13px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>🕰️</div>
              History
            </button>
          </div>
        </div>
      </div>

      {/* Popular Books */}
      {stats.popular_books.length > 0 && (
        <div className="dashboard-card" style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🔥</span>
            Most Borrowed Books
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.popular_books.map((b, i) => (
              <div 
                key={b.id} 
                className="popular-book-item"
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '12px 16px',
                  background: i === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f9fafb',
                  borderRadius: '12px',
                  border: i === 0 ? '1px solid #fbbf24' : '1px solid #e5e7eb',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #f97316)' : '#6b7280',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: 'white',
                  flexShrink: 0 
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: '14px',
                    color: i === 0 ? '#92400e' : '#111827'
                  }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{b.author}</div>
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  fontWeight: '500',
                  marginRight: '12px'
                }}>
                  {b.borrow_count}×
                </div>
                <div style={{ 
                  width: '60px', 
                  height: '6px', 
                  background: '#e5e7eb', 
                  borderRadius: '3px', 
                  overflow: 'hidden' 
                }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min(100, (b.borrow_count / (stats.popular_books[0]?.borrow_count || 1)) * 100)}%`, 
                      background: i === 0 
                        ? 'linear-gradient(90deg, #f59e0b, #f97316)' 
                        : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      borderRadius: '3px',
                      transition: 'width 0.8s ease'
                    }} 
                  />
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
