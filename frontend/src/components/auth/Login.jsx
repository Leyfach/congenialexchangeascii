import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '../../services/auth.js'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: 'test@test.com', password: 'password123' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authService.login(form)
      navigate('/trading')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="auth-box w-full card ascii-border">
        <div className="card-header"><h2 className="card-title">{t('auth.login.title').toUpperCase()} ▷ TERMINAL</h2><span className="badge-green">SECURE</span></div>
        <div className="ascii-sub mb-4">/api/auth/login</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-green-200 text-sm">{t('auth.login.email').toLowerCase()}</label>
            <input name="email" type="email" className="ascii-input mt-1" placeholder="user@domain" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">{t('auth.login.password').toLowerCase()}</label>
            <input name="password" type="password" className="ascii-input mt-1" placeholder="••••••••" value={form.password} onChange={handleChange} required />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button className="ascii-btn w-full py-3 glow" disabled={loading}>
            {loading ? t('common.loading').toUpperCase() : t('auth.login.loginButton').toUpperCase()} <span className="cursor ml-2" />
          </button>
        </form>
        <div className="ascii-hr" />
        <div className="text-sm text-green-300/80">{t('auth.login.noAccount')} <Link to="/register" className="link">{t('auth.login.signUpLink')}</Link></div>
      </div>
    </div>
  )
}