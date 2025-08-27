import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '../../services/auth.js'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authService.register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="auth-box w-full card ascii-border">
        <div className="card-header"><h2 className="card-title">{t('auth.register.title').toUpperCase()} ▷ ACCESS</h2><span className="badge-green">NEW USER</span></div>
        <div className="ascii-sub mb-4">/api/auth/register</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-green-200 text-sm">{t('auth.register.username').toLowerCase()}</label>
            <input name="firstName" className="ascii-input mt-1" value={form.firstName} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">lastName</label>
            <input name="lastName" className="ascii-input mt-1" value={form.lastName} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">{t('auth.register.email').toLowerCase()}</label>
            <input name="email" type="email" className="ascii-input mt-1" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">{t('auth.register.password').toLowerCase()}</label>
            <input name="password" type="password" className="ascii-input mt-1" value={form.password} onChange={handleChange} required />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button className="ascii-btn w-full py-3 glow" disabled={loading}>
            {loading ? t('common.loading').toUpperCase() : t('auth.register.registerButton').toUpperCase()}
            <span className="cursor ml-2" />
          </button>
        </form>
        <div className="ascii-hr" />
        <div className="text-sm text-green-300/80">{t('auth.register.hasAccount')} <Link to="/login" className="link">{t('auth.register.signInLink')}</Link></div>
      </div>
    </div>
  )
}