import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <div className="bg-black/60 border-b border-green-500/10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 text-sm flex gap-4 flex-wrap">
        <span className="badge-green">LIVE</span>
        <span className="text-green-300/70">Connected to terminal@localhost</span>
        <span className="text-green-300/40">|</span>
        <NavLink to="/markets" className="hover:text-neon-matrix">/api/markets</NavLink>
        <NavLink to="/wallet" className="hover:text-neon-matrix">/api/user/wallet</NavLink>
        <NavLink to="/trading" className="hover:text-neon-matrix">/api/trading/order</NavLink>
        <NavLink to="/security" className="hover:text-neon-matrix">/api/auth/2fa</NavLink>
      </div>
    </div>
  )
}