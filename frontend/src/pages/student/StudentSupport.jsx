import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'
import { helpdesk } from '../../api'

const FAQS = [
  {
    q: 'How do I cancel or reschedule a class?',
    a: 'You can cancel a booking up to 24 hours before the class starts without a fee. To cancel, go to My Classes and tap the booking. Cancellations within 24 hours may incur a late cancellation fee of $10. If you miss a class without cancelling, a $20 no-show fee applies.',
  },
  {
    q: 'Can I freeze my membership?',
    a: 'Yes! You can freeze your season membership for up to 8 weeks once per season. Freezes require 7 days notice. To request a freeze, message us via the Messages tab or email hello@dualitypole.com.au.',
  },
  {
    q: 'How do makeup credits work?',
    a: 'If you have an approved absence (e.g., illness, injury), we may issue a makeup credit. Credits can be used to book any equivalent or lower level class within 60 days. You can see your credits in your Billing section.',
  },
  {
    q: 'What should I wear to class?',
    a: 'Wear comfortable activewear that leaves your legs, arms, and midriff exposed — your skin helps you grip the pole! Avoid moisturisers or fake tan before class. Bring grippy socks for warm-up and cool-down.',
  },
  {
    q: 'Is there parking nearby?',
    a: 'The Box (Surry Hills): Street parking on Kippax St and surrounding streets. Rhapsody (Crown St): Limited street parking. The nearest train station is Central.',
  },
  {
    q: 'What happens if a class is cancelled?',
    a: "If we cancel a class, you'll be notified by email as soon as possible. A makeup credit will automatically be added to your account. You can use this credit to book any equivalent class within 60 days.",
  },
  {
    q: 'How do I enrol for a new season?',
    a: "Season enrolments open approximately 4 weeks before the new season starts. Current students get priority access for the first 48 hours. You'll receive an email when enrolments open.",
  },
]

const CATEGORIES = [
  'Attendance & Make-ups',
  'Billing & Payments',
  'Enrolment & Class Changes',
  'Injury & Medical',
  'Locker & Access',
  'Technical Issue',
  'Other',
]

function statusColor(status) {
  if (!status) return 'var(--grey)'
  const s = status.toLowerCase()
  if (s === 'open') return 'var(--lime)'
  if (s === 'pending') return 'var(--amber)'
  return 'var(--grey)'
}

function TicketThreadModal({ ticket, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    helpdesk.myTicketMessages(ticket.id)
      .then(r => setMessages(r.data.results || r.data || []))
      .finally(() => setLoading(false))
  }, [ticket.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleReply() {
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      const res = await helpdesk.myTicketReply(ticket.id, { body: reply })
      setMessages(m => [...m, res.data])
      setReply('')
    } catch {
      alert('Failed to send reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed'
  const fmtTime = iso => new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = iso => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 600, height: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--grey)' }}>#{ticket.id}</span>
                <span style={{ fontSize: 10, color: statusColor(ticket.status), fontWeight: 700, textTransform: 'uppercase' }}>{ticket.status}</span>
                {ticket.category && <span style={{ fontSize: 10, color: 'var(--grey)' }}>{ticket.category}</span>}
                <span style={{ fontSize: 10, color: 'var(--grey)' }}>{fmtDate(ticket.created_at)}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', fontSize: 20, cursor: 'pointer', padding: '0 0 0 12px', flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 13, marginTop: 40 }}>No messages yet — we'll be in touch soon.</div>
          ) : messages.map(msg => {
            const isMe = msg.sender_detail?.role === 'student'
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '78%', background: isMe ? '#1a1a1a' : 'rgba(176,160,255,0.12)', border: isMe ? '1px solid var(--border)' : '1px solid rgba(176,160,255,0.25)', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
                  {!isMe && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: 'var(--lav)' }}>Duality Studio</div>}
                  <div style={{ color: 'var(--white)' }}>{msg.body}</div>
                  <div style={{ fontSize: 9, color: 'var(--grey)', marginTop: 4, textAlign: 'right' }}>{fmtTime(msg.created_at)}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {!isClosed ? (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <textarea
              rows={2}
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply() }}
              placeholder="Add a reply… (Cmd+Enter to send)"
              style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
            />
            <button className="btn btn-lime btn-sm" onClick={handleReply} disabled={sending || !reply.trim()}>
              {sending ? '…' : 'Send'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 12, color: 'var(--grey)', flexShrink: 0 }}>
            This ticket is {ticket.status}. Contact us to reopen.
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentSupport() {
  const { data: ticketsData, refetch: refetchTickets } = useApi(() => helpdesk.myTickets(), [])

  const [openFaq, setOpenFaq] = useState(null)
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('faq')
  const [viewTicket, setViewTicket] = useState(null)

  const tickets = ticketsData?.results || ticketsData || []

  async function handleSubmit() {
    if (!category || !subject || !message || submitting) return
    setSubmitting(true)
    try {
      await helpdesk.submitTicket({ subject, category, body: message })
      setSent(true)
      setCategory('')
      setSubject('')
      setMessage('')
      refetchTickets()
    } catch {
      alert('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Support</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>FAQs and contact the studio</div>
      </div>

      <div className="tab-strip" style={{ marginBottom: 20 }}>
        {[['faq', 'FAQs'], ['contact', 'Contact Us'], ['tickets', `My Tickets${tickets.length ? ` (${tickets.length})` : ''}`]].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{faq.q}</div>
                <div style={{ color: 'var(--grey)', fontSize: 18, flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</div>
              </div>
              {openFaq === i && (
                <div style={{ padding: '0 18px 16px', fontSize: 13, color: 'var(--grey)', lineHeight: 1.7, borderTop: '1px solid #111' }}>
                  <div style={{ paddingTop: 12 }}>{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'contact' && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Get in touch</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
              We try to respond within 24 hours. Submitted messages appear in the <b>My Tickets</b> tab so you can track the conversation.
            </div>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Message sent!</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>We'll get back to you within 24 hours. Track your request in the My Tickets tab.</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setSent(false)}>Send another</button>
                <button className="btn btn-lime btn-sm" onClick={() => setTab('tickets')}>View my tickets</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Subject</label>
                <input
                  type="text"
                  placeholder="Brief description of your issue…"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Message</label>
                <textarea
                  rows={5}
                  placeholder="Tell us what's going on…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <button
                className="btn btn-lime btn-sm"
                onClick={handleSubmit}
                disabled={!category || !subject || !message || submitting}
                style={{ width: '100%' }}
              >
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'tickets' && (
        <div style={{ maxWidth: 600 }}>
          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--grey)', fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No support requests yet</div>
              <div style={{ marginBottom: 16 }}>Use the Contact Us tab to get in touch.</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTab('contact')}>Contact Us</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setViewTicket(ticket)}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', display: 'flex', gap: 10 }}>
                      {ticket.category && <span>{ticket.category}</span>}
                      <span>{new Date(ticket.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {ticket.message_count > 0 && <span>{ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: statusColor(ticket.status), fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${statusColor(ticket.status)}22`, borderRadius: 6, padding: '2px 7px', background: `${statusColor(ticket.status)}11` }}>
                      {ticket.status}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--lav)' }}>View →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewTicket && <TicketThreadModal ticket={viewTicket} onClose={() => setViewTicket(null)} />}
    </div>
  )
}
