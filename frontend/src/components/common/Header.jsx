import { Link, NavLink, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.js'

export default function Header() {
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
          <NavLink to="/markets" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>MARKETS</NavLink>
          <NavLink to="/trading" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>TRADING</NavLink>
          <NavLink to="/wallet" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>WALLET</NavLink>
          <NavLink to="/dashboard" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>DASHBOARD</NavLink>
          <NavLink to="/account" className={({isActive})=>`hover:text-neon-matrix ${isActive?'text-neon-matrix':''}`}>ACCOUNT</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-green-300/80 hidden sm:block">{user.firstName} {user.lastName}</span>
              <button onClick={logout} className="ascii-btn">LOG OUT</button>
            </>
          ) : (
            <>
              <Link className="ascii-btn" to="/login">LOGIN</Link>
              <Link className="ascii-btn callout" to="/register">REGISTER</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}