import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../api'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

export default function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || null

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await auth.register(form)
      // Auto-login after registration
      const me = await login(form.email, form.password)
      if (from && me.role === 'student') navigate(from)
      else navigate('/portal')
    } catch (err) {
      const data = err.response?.data || {}
      if (typeof data === 'object' && !data.detail) {
        setErrors(data)
      } else {
        setErrors({ general: data.detail || 'Could not create account — please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">DUALITY</div>
        <p className="login-tagline">Create your account</p>

        <form onSubmit={handleSubmit}>
          {errors.general && <div className="error-msg">{errors.general}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>First name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                autoFocus
                required
              />
              {errors.first_name && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.first_name[0]}</div>}
            </div>
            <div className="field">
              <label>Last name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                required
              />
              {errors.last_name && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.last_name[0]}</div>}
            </div>
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              autoComplete="email"
              required
            />
            {errors.email && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.email[0]}</div>}
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            {errors.password && <div className="error-msg" style={{ marginTop: 4, fontSize: 12 }}>{errors.password[0]}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-lime"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Create account'}
          </button>
        </form>

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
