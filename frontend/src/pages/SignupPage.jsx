import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { auth, forms } from '../api'
import { useAuth } from '../contexts/AuthContext'
import client from '../api/client'
import './LoginPage.css'

const PLACEHOLDER_WAIVER = `DUALITY POLE STUDIO — LIABILITY WAIVER AND TERMS & CONDITIONS

By registering and participating in classes at Duality Pole Studio, you acknowledge and agree to the following:

1. PHYSICAL RISK
Pole dancing and aerial fitness involve physical activity that carries inherent risks, including but not limited to muscle soreness, bruising, and in rare cases, more serious injury. You participate at your own risk.

2. HEALTH & FITNESS
You confirm that you are in good physical health and have no medical conditions that would prevent you from safely participating in aerial/pole fitness activities. If in doubt, consult your doctor before attending.

3. INJURY LIABILITY
Duality Pole Studio, its instructors, staff and owners shall not be held liable for any injury, loss, or damage sustained during participation in classes, including injuries resulting from use of studio equipment.

4. STUDIO RULES
You agree to follow all studio rules and instructor guidance. You will not attend class while under the influence of alcohol or drugs. You will wear appropriate attire as directed by your instructor.

5. PHOTOS & MEDIA
Unless you notify us otherwise, you consent to being photographed or filmed during classes for the purposes of instructional feedback and studio promotion (social media, website). You may opt out at any time by notifying us in writing.

6. CANCELLATION & COMMITMENT
Season enrolments are a commitment for the full 8-week season. Cancellations are not accepted; transfer requests may be submitted and are subject to approval.

7. PAYMENTS
All fees are due as per the payment schedule agreed at the time of enrolment. Non-payment may result in loss of your spot.

By completing registration, you confirm that you have read, understood, and agree to these terms and conditions.`

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const active = step === current
        const done = step < current
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && (
              <div style={{ width: 24, height: 1, background: done ? '#ccff00' : '#333' }} />
            )}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: active ? '#ccff00' : done ? 'rgba(204,255,0,0.2)' : '#1a1a1a',
              color: active ? '#000' : done ? '#ccff00' : '#555',
              border: `1px solid ${active ? '#ccff00' : done ? 'rgba(204,255,0,0.4)' : '#333'}`,
              transition: 'all 0.2s',
            }}>
              {done ? '✓' : step}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || null

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [dob, setDob] = useState('')
  const [ageError, setAgeError] = useState('')

  // Step 2 fields
  const [address, setAddress] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  // Step 3 fields
  const [waiverText, setWaiverText] = useState('')
  const [waiverAgreed, setWaiverAgreed] = useState(false)

  useEffect(() => {
    if (step === 3 && !waiverText) {
      client.get('/api/users/waiver/').then(r => {
        setWaiverText(r.data?.text || r.data?.content || PLACEHOLDER_WAIVER)
      }).catch(() => {
        setWaiverText(PLACEHOLDER_WAIVER)
      })
    }
  }, [step, waiverText])

  function checkAge(dobVal) {
    if (!dobVal) { setAgeError(''); return false }
    const birth = new Date(dobVal)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    if (age < 18) {
      setAgeError('You must be 18 or older to join Duality Pole Studio.')
      return false
    }
    setAgeError('')
    return true
  }

  function handleDobChange(val) {
    setDob(val)
    checkAge(val)
    setErrors(e => ({ ...e, date_of_birth: null }))
  }

  const step1Valid = firstName && lastName && email && phone && password && password.length >= 8 && dob && !ageError

  function goToStep2(e) {
    e.preventDefault()
    if (!step1Valid) return
    setStep(2)
  }

  function goToStep3(e) {
    e.preventDefault()
    if (!address || !emergencyName || !emergencyPhone) return
    setStep(3)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!waiverAgreed) return
    setLoading(true)
    setErrors({})
    try {
      await auth.register({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        date_of_birth: dob,
        address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        waiver_agreed: true,
      })
      const me = await login(email, password)
      // Submit waiver form after login
      try {
        await forms.submit('waiver', { agreed: true, signed_at: new Date().toISOString() })
      } catch { /* best effort */ }
      if (from && me.role === 'student') navigate(from)
      else navigate('/portal')
    } catch (err) {
      const data = err.response?.data || {}
      if (typeof data === 'object' && !data.detail) {
        setErrors(data)
        // Go back to the appropriate step for errors
        if (data.email || data.password || data.first_name || data.last_name || data.phone || data.date_of_birth) {
          setStep(1)
        } else if (data.address || data.emergency_contact_name || data.emergency_contact_phone) {
          setStep(2)
        }
      } else {
        setErrors({ general: data.detail || 'Could not create account — please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 480 }}>
        <div className="login-logo">DUALITY</div>
        <p className="login-tagline">Create your account</p>

        <StepIndicator current={step} total={3} />

        {errors.general && (
          <div className="error-msg" style={{ marginBottom: 16 }}>{errors.general}</div>
        )}

        {/* Step 1: Account details */}
        {step === 1 && (
          <form onSubmit={goToStep2}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoFocus
                  required
                />
                {errors.first_name && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.first_name[0]}</div>}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
                {errors.last_name && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.last_name[0]}</div>}
              </div>
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(ex => ({ ...ex, email: null })) }}
                autoComplete="email"
                required
              />
              {errors.email && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.email[0]}</div>}
            </div>

            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
              {errors.phone && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.phone[0]}</div>}
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(ex => ({ ...ex, password: null })) }}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {errors.password && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.password[0]}</div>}
              {password && password.length < 8 && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Minimum 8 characters</div>
              )}
            </div>

            <div className="field">
              <label>Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={e => handleDobChange(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
              />
              {ageError && (
                <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{ageError}</div>
              )}
              {errors.date_of_birth && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.date_of_birth[0]}</div>}
            </div>

            <button
              type="submit"
              className="btn btn-lime"
              style={{ width: '100%', marginTop: 4 }}
              disabled={!step1Valid}
            >
              Next →
            </button>
          </form>
        )}

        {/* Step 2: Address & Emergency Contact */}
        {step === 2 && (
          <form onSubmit={goToStep3}>
            <div className="field">
              <label>Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street address, suburb, state, postcode"
                required
                autoFocus
              />
              {errors.address && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.address[0]}</div>}
            </div>

            <div style={{ fontSize: 12, color: '#666', marginBottom: 16, padding: '10px 12px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #222' }}>
              In case of injury or emergency during class.
            </div>

            <div className="field">
              <label>Emergency contact name</label>
              <input
                type="text"
                value={emergencyName}
                onChange={e => setEmergencyName(e.target.value)}
                required
              />
              {errors.emergency_contact_name && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.emergency_contact_name[0]}</div>}
            </div>

            <div className="field">
              <label>Emergency contact phone</label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={e => setEmergencyPhone(e.target.value)}
                required
              />
              {errors.emergency_contact_phone && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.emergency_contact_phone[0]}</div>}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn-lime"
                style={{ flex: 2 }}
                disabled={!address || !emergencyName || !emergencyPhone}
              >
                Next →
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Waiver */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                Liability Waiver & Terms
              </div>
              <div style={{
                maxHeight: 300, overflowY: 'scroll', background: '#0a0a0a',
                border: '1px solid #222', borderRadius: 8, padding: '12px 14px',
                fontSize: 12, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap',
              }}>
                {waiverText || 'Loading waiver…'}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={waiverAgreed}
                onChange={e => setWaiverAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#ccff00', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>
                I have read and agree to the liability waiver and terms and conditions.
              </span>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setStep(2)}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn-lime"
                style={{ flex: 2 }}
                disabled={loading || !waiverAgreed}
              >
                {loading ? <span className="spinner" /> : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <p className="login-help" style={{ marginTop: 16 }}>
          Already have an account?{' '}
          <Link to="/login" state={from ? { from } : undefined} style={{ color: '#ccff00' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
