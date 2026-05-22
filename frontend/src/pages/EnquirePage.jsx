import { useState } from 'react'
import client from '../api/client'

const SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'referral', label: 'Referred by someone' },
  { value: 'website', label: 'Website' },
  { value: 'walkin', label: 'Walked in' },
  { value: 'other', label: 'Other' },
]

export default function EnquirePage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'instagram', notes: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await client.post('/api/leads/public/', form)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Something went wrong. Please try again or contact us directly.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: '#ccff00', letterSpacing: 2, marginBottom: 8 }}>
            DUALITY POLE
          </div>
          <div style={{ fontSize: 15, color: '#666' }}>New Student Enquiry</div>
        </div>

        {done ? (
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 32, textAlign: 'center', border: '1px solid #222' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: '#fff', marginBottom: 10 }}>
              Thanks! We'll be in touch soon.
            </div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
              One of our team will reach out to help you get started. In the meantime, follow us on Instagram for class updates.
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 32, border: '1px solid #222' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: '#fff', marginBottom: 6 }}>
              Get started
            </div>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
              Interested in classes? Fill in your details and we'll reach out to help you find the right class.
            </div>

            {error && (
              <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff4444', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Name *</label>
                  <input
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    required
                    autoFocus
                    placeholder="Your name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="04xx xxx xxx"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>How did you hear about us?</label>
                <select value={form.source} onChange={e => set('source', e.target.value)} style={inputStyle}>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Message (optional)</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="e.g. which class you're interested in, your experience level, any questions…"
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !form.name}
                style={{
                  width: '100%',
                  backgroundColor: saving || !form.name ? '#555' : '#ccff00',
                  color: saving || !form.name ? '#999' : '#000',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 0',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving || !form.name ? 'not-allowed' : 'pointer',
                  letterSpacing: 0.3,
                }}
              >
                {saving ? 'Sending…' : 'Send enquiry'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <a href="/login" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>
                Already have an account? <span style={{ color: '#ccff00' }}>Sign in</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 8,
  color: '#fff',
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}
