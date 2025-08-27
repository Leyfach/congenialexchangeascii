import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '../../services/auth.js'
import LanguageSwitch from './LanguageSwitch'

export default function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const logout = () => {
    authService.logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-20 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/40 border-b border-green-500/20">
      <div className="header-line" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded bg-green-500/10 border border-green-500/40 grid place-items-center group-hover:animate-glowpulse">
            <span className="text-neon-matrix">▣</span>
          </div>
          <span className="tracking-[0.3em] text-neon-matrix">NEON MATRIX EXCHANGE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/markets" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>
            {t('nav.markets', 'MARKETS').toUpperCase()}
          </NavLink>
          <NavLink to="/trading" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>
            {t('nav.trading', 'TRADING').toUpperCase()}
          </NavLink>
          <NavLink to="/wallet" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>
            {t('nav.wallet', 'WALLET').toUpperCase()}
          </NavLink>
          <NavLink to="/dashboard" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>
            {t('nav.dashboard', 'DASHBOARD').toUpperCase()}
          </NavLink>
          <NavLink to="/account" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>
            {t('nav.account', 'ACCOUNT').toUpperCase()}
          </NavLink>
          <NavLink to="/security" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>
            {t('nav.security', 'SECURITY').toUpperCase()}
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitch className="hidden sm:block" />
          {user ? (
            <>
              {/* Username removed to prevent UI interference */}
              <button onClick={logout} className="ascii-btn">
                {t('nav.logout', 'LOG OUT').toUpperCase()}
              </button>
            </>
          ) : (
            <>
              <Link className="ascii-btn" to="/login">
                {t('nav.login', 'LOGIN').toUpperCase()}
              </Link>
              <Link className="ascii-btn callout" to="/register">
                {t('nav.register', 'REGISTER').toUpperCase()}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}