# frontend/index.html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NEON MATRIX EXCHANGE</title>
  </head>
  <body class="bg-black text-green-400">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>


# frontend/package.json
{
  "name": "matrix-exchange-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@tailwindcss/forms": "^0.5.9",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "vite": "^5.4.6"
  }
}


# frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})


# frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#00ff9c',
          matrix: '#00ff41'
        },
        accent: {
          orange: '#ff6b35',
          gold: '#f7931a'
        }
      },
      fontFamily: {
        mono: [
          'ui-monospace','SFMono-Regular','Menlo','Monaco','Consolas','Liberation Mono','Courier New','monospace'
        ]
      },
      boxShadow: {
        glow: '0 0 20px rgba(0,255,65,0.25)',
        hard: '0 0 0 1px rgba(0,255,65,0.25), 0 0 20px rgba(0,255,65,0.15)'
      },
      keyframes: {
        blink: { '0%, 50%': { opacity: 1 }, '51%, 100%': { opacity: 0 } },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        glowpulse: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(0,255,65,0)' },
          '50%': { boxShadow: '0 0 24px rgba(0,255,65,0.3)' }
        }
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        scan: 'scan 3s linear infinite',
        glowpulse: 'glowpulse 2s ease-in-out infinite'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}


# frontend/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}


# frontend/src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './App.css'
import './components/common/Common.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)


# frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TradingPage from './pages/TradingPage.jsx'
import WalletPage from './pages/WalletPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import Login from './components/auth/Login.jsx'
import Register from './components/auth/Register.jsx'
import Header from './components/common/Header.jsx'
import Navbar from './components/common/Navbar.jsx'
import { authService } from './services/auth.js'
import MatrixBackground from './components/common/MatrixBackground.jsx'

function ProtectedRoute({ children }) {
  return authService.isAuthenticated() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <div className="min-h-screen font-mono bg-black text-neon-matrix relative">
      <MatrixBackground />
      <div className="relative z-10">
        <Header />
        <Navbar />
        <main className="px-4 md:px-8 lg:px-12 py-6">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/markets" element={<ProtectedRoute><div className="space-y-6"><h1 className="ascii-title">MARKETS</h1><div className="grid grid-cols-1 xl:grid-cols-3 gap-6"><div className="xl:col-span-2"><(await import('./components/markets/MarketTable.jsx')).default /></div><div className=""><(await import('./components/trading/OrderBook.jsx')).default compact /></div></div></div></ProtectedRoute>} />
            <Route path="/trading" element={<ProtectedRoute><TradingPage /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <div className="scanline" />
    </div>
  )
}


# frontend/src/App.css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }

/* MATRIX ASCII VIBE */
.ascii-panel { @apply border border-green-500/30 rounded-xl bg-black/60 backdrop-blur-sm shadow-hard; }
.ascii-title { @apply text-2xl md:text-3xl tracking-widest text-neon-matrix drop-shadow; }
.ascii-sub { @apply text-sm text-green-300/80; }
.ascii-hr { @apply border-t border-green-500/20 my-4; }
.ascii-btn { @apply inline-flex items-center justify-center px-4 py-2 border border-green-500/40 hover:border-neon-matrix text-green-200 hover:text-neon-matrix rounded-md transition-all duration-200; }
.ascii-input { @apply block w-full bg-black/60 border border-green-500/30 focus:border-neon-matrix focus:ring-neon-matrix text-green-200 placeholder-green-500/40 rounded-md; }
.ascii-badge { @apply text-xs px-2 py-0.5 border border-green-500/30 rounded; }
.ascii-grid { @apply grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3; }
.link { @apply text-accent-gold hover:text-accent-orange transition; }

/* CRT + scanline */
.scanline { position: fixed; inset: 0; pointer-events: none; background: linear-gradient(rgba(0,0,0,0) 50%, rgba(0,255,65,0.04) 51%); background-size: 100% 4px; mix-blend-mode: overlay; opacity: .6; }

/* Blinking cursor */
.cursor { @apply inline-block w-2 h-5 bg-neon-matrix animate-blink; }

/* Glowing borders */
.glow { box-shadow: 0 0 0 1px rgba(0,255,65,0.25), 0 0 18px rgba(0,255,65,0.15); }

/* Orange/Gold accents for callouts */
.callout { @apply border border-accent-gold/40 text-accent-gold; }

/* Tables */
.table { @apply w-full text-sm; }
.table thead th { @apply text-left font-semibold text-green-200/90 border-b border-green-500/30 pb-2; }
.table tbody tr { @apply border-b border-green-500/10; }
.table tbody tr:hover { @apply bg-green-500/5; }
.table td { @apply py-2; }

/* Cards */
.card { @apply ascii-panel p-4; }
.card-header { @apply flex items-center justify-between mb-2; }
.card-title { @apply tracking-widest text-green-200; }

/* Utility */
.badge-green { @apply ascii-badge text-neon-matrix; }
.badge-red { @apply ascii-badge text-red-400 border-red-500/40; }


# frontend/src/components/common/Common.css
/* Matrix columns background via Canvas component overlay */

/* ASCII pseudo-borders */
.ascii-border { position: relative; }
.ascii-border:before, .ascii-border:after { content: ""; position: absolute; inset: 0; pointer-events: none; border: 1px dashed rgba(0,255,65,0.25); border-radius: 0.75rem; }

/* Header neon line */
.header-line { height: 2px; background: linear-gradient(90deg, rgba(0,255,65,0) 0%, rgba(0,255,65,0.8) 50%, rgba(0,255,65,0) 100%); }

/* Terminal typing */
.type-row { white-space: nowrap; overflow: hidden; border-right: 2px solid #00ff41; }


# frontend/src/components/common/MatrixBackground.jsx
import { useEffect, useRef } from 'react'

export default function MatrixBackground() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrame

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = Math.max(window.innerHeight, document.body.scrollHeight)
    }
    resize()
    window.addEventListener('resize', resize)

    const letters = '01░▒▓█$#@*<>\n'
    const fontSize = 14
    let columns = Math.floor(canvas.width / fontSize)
    let drops = Array(columns).fill(1)

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00ff41'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length))
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
      animationFrame = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 opacity-25" />
}


# frontend/src/components/common/Header.jsx
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


# frontend/src/components/common/Navbar.jsx
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
      </div>
    </div>
  )
}


# frontend/src/components/auth/Auth.css
/* Additional fine-tuning for auth screens */
.auth-box { max-width: 420px; }


# frontend/src/components/auth/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authService.login(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="auth-box w-full card ascii-border">
        <div className="card-header"><h2 className="card-title">LOGIN ▷ TERMINAL</h2><span className="badge-green">SECURE</span></div>
        <div className="ascii-sub mb-4">/api/auth/login</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-green-200 text-sm">email</label>
            <input name="email" type="email" className="ascii-input mt-1" placeholder="user@domain" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">password</label>
            <input name="password" type="password" className="ascii-input mt-1" placeholder="••••••••" value={form.password} onChange={handleChange} required />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button className="ascii-btn w-full py-3 glow" disabled={loading}>
            {loading ? 'AUTHENTICATING…' : 'CONNECT'} <span className="cursor ml-2" />
          </button>
        </form>
        <div className="ascii-hr" />
        <div className="text-sm text-green-300/80">No access token? <Link to="/register" className="link">register</Link></div>
      </div>
    </div>
  )
}


# frontend/src/components/auth/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.js'

export default function Register() {
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
        <div className="card-header"><h2 className="card-title">REGISTER ▷ ACCESS</h2><span className="badge-green">NEW USER</span></div>
        <div className="ascii-sub mb-4">/api/auth/register</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-green-200 text-sm">firstName</label>
            <input name="firstName" className="ascii-input mt-1" value={form.firstName} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">lastName</label>
            <input name="lastName" className="ascii-input mt-1" value={form.lastName} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">email</label>
            <input name="email" type="email" className="ascii-input mt-1" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="text-green-200 text-sm">password</label>
            <input name="password" type="password" className="ascii-input mt-1" value={form.password} onChange={handleChange} required />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button className="ascii-btn w-full py-3 glow" disabled={loading}>{loading ? 'CREATING…' : 'INIT ACCESS'}<span className="cursor ml-2" /></button>
        </form>
        <div className="ascii-hr" />
        <div className="text-sm text-green-300/80">Already authorized? <Link to="/login" className="link">login</Link></div>
      </div>
    </div>
  )
}


# frontend/src/components/markets/Markets.css
/* Extra market styles */
.price-up { color: #00ff41; }
.price-down { color: #ff4d4d; }


# frontend/src/components/markets/MarketTable.jsx
import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import { subscribeTickers, formatCurrency, formatPct } from '../../utils/helpers.js'

export default function MarketTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = () => {}
    const load = async () => {
      try {
        const { data } = await api.get('/api/markets')
        setRows(data)
        setLoading(false)
        unsub = subscribeTickers((tickers) => {
          setRows(prev => prev.map(r => tickers[r.pair] ? { ...r, price: tickers[r.pair].price, change: tickers[r.pair].change } : r))
        })
      } catch (e) {
        setLoading(false)
      }
    }
    load()
    return () => unsub()
  }, [])

  if (loading) return <div className="card">Loading markets…</div>

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">/api/markets ▷ LIVE FEED</h3>
        <span className="badge-green">STREAM</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>PAIR</th>
            <th>PRICE</th>
            <th>CHANGE</th>
            <th>VOLUME</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="tracking-widest">{r.pair}</td>
              <td>{formatCurrency(r.price)}</td>
              <td className={String(r.change).startsWith('-')? 'price-down':'price-up'}>{r.change}</td>
              <td>{r.volume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


# frontend/src/components/trading/Trading.css
/* Order book columns */
.col-bids { background: rgba(0, 255, 65, 0.06); }
.col-asks { background: rgba(255, 107, 53, 0.06); }


# frontend/src/components/trading/OrderForm.jsx
import { useState } from 'react'
import api from '../../services/api.js'

export default function OrderForm({ pair = 'BTC/USD' }) {
  const [form, setForm] = useState({ pair, type: 'limit', side: 'buy', amount: '', price: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setStatus('')
    try {
      const { data } = await api.post('/api/trading/order', form)
      setStatus(`ORDER ACCEPTED #${data?.id || '—'}`)
      setForm({ ...form, amount: '', price: '' })
    } catch (e) {
      setStatus('ORDER REJECTED')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">ORDER_FORM ▷ {pair}</h3>
        <span className="badge-green">SIM</span>
      </div>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-green-300">type</label>
          <select className="ascii-input" value={form.type} onChange={e=>setField('type', e.target.value)}>
            <option value="limit">limit</option>
            <option value="market">market</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-green-300">side</label>
          <select className="ascii-input" value={form.side} onChange={e=>setField('side', e.target.value)}>
            <option value="buy">buy</option>
            <option value="sell">sell</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-green-300">pair</label>
          <input className="ascii-input" value={form.pair} onChange={e=>setField('pair', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-green-300">amount</label>
          <input className="ascii-input" value={form.amount} onChange={e=>setField('amount', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-xs text-green-300">price</label>
          <input className="ascii-input" value={form.price} onChange={e=>setField('price', e.target.value)} placeholder="0.00" />
        </div>
        <button className="ascii-btn col-span-2 py-2 glow" disabled={loading}>{loading?'SENDING…':'PLACE ORDER'}</button>
        {status && <div className="col-span-2 text-sm text-green-300/80">{status}</div>}
      </form>
    </div>
  )
}


# frontend/src/components/trading/OrderBook.jsx
import { useEffect, useState } from 'react'
import { generateOrderBook } from '../../utils/helpers.js'

export default function OrderBook({ compact=false }) {
  const [book, setBook] = useState(generateOrderBook())

  useEffect(() => {
    const id = setInterval(()=> setBook(generateOrderBook()), 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">ORDER_BOOK ▷ SIM</h3>
        <span className="badge-green">LIVE</span>
      </div>
      <div className={`grid ${compact? 'grid-cols-1':'grid-cols-2'} gap-4`}>
        <div className="col-bids p-3 rounded border border-green-500/20">
          <div className="text-green-300/80 mb-1">BIDS</div>
          <div className="space-y-1">
            {book.bids.map((b,i)=> (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-neon-matrix">{b.price.toFixed(2)}</span>
                <span className="text-green-300/80">{b.amount.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-asks p-3 rounded border border-accent-orange/20">
          <div className="text-accent-orange mb-1">ASKS</div>
          <div className="space-y-1">
            {book.asks.map((a,i)=> (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-accent-gold">{a.price.toFixed(2)}</span>
                <span className="text-green-300/80">{a.amount.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


# frontend/src/components/trading/PriceChart.jsx
export default function PriceChart() {
  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">CANDLE_CHART ▷ MODULE</h3>
        <span className="badge-green">PLACEHOLDER</span>
      </div>
      <div className="text-green-300/80 text-sm">
        High-quality candlestick charts will render here. Replace with your preferred chart module later.
      </div>
      <div className="mt-4 p-4 border border-green-500/20 rounded">
        <pre className="text-xs text-green-300/70">{`loading module: chart/candles@v1.0.0
source: github.com/your/repo
status: pending…`}</pre>
      </div>
    </div>
  )
}


# frontend/src/pages/Pages.css
/* Page-level minor tweaks */
.hero-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.25rem; }
@media (max-width: 1024px){ .hero-grid { grid-template-columns: 1fr; } }


# frontend/src/pages/LandingPage.jsx
import { Link } from 'react-router-dom'
import MarketTable from '../components/markets/MarketTable.jsx'

export default function LandingPage(){
  return (
    <div className="max-w-7xl mx-auto">
      <section className="hero-grid items-start">
        <div className="card ascii-border">
          <h1 className="ascii-title">CONNECTING TO NEON MATRIX TERMINAL<span className="cursor ml-3" /></h1>
          <p className="ascii-sub mt-2">Professional crypto exchange interface. Dark. Fast. Terminal-native.</p>
          <div className="ascii-hr" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="ascii-panel p-4">
              <div className="text-neon-matrix">/auth</div>
              <div className="text-green-300/70 text-sm">JWT with localStorage; secure routes; rapid session restore.</div>
            </div>
            <div className="ascii-panel p-4">
              <div className="text-neon-matrix">/markets</div>
              <div className="text-green-300/70 text-sm">Live ticker simulations synced with backend markets endpoint.</div>
            </div>
            <div className="ascii-panel p-4">
              <div className="text-neon-matrix">/trading</div>
              <div className="text-green-300/70 text-sm">Order book + mock matching flow; later candlestick charts.</div>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Link className="ascii-btn callout px-6 py-3" to="/register">INIT ACCESS</Link>
            <Link className="ascii-btn px-6 py-3" to="/login">CONNECT</Link>
          </div>
        </div>
        <div>
          <div className="card ascii-border">
            <div className="card-header"><h3 className="card-title">SYSTEM LOG</h3><span className="badge-green">OK</span></div>
            <pre className="text-xs text-green-300/80 whitespace-pre-wrap">{`> boot sequence…
> loading modules: auth, markets, trading, wallet
> connecting to http://localhost:3000 …
> status: online`}</pre>
          </div>
        </div>
      </section>
      <section className="mt-6">
        <MarketTable />
      </section>
    </div>
  )
}


# frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api.js'
import { formatCurrency } from '../utils/helpers.js'

export default function DashboardPage(){
  const [wallet, setWallet] = useState(null)
  const [trades, setTrades] = useState([])

  useEffect(()=>{
    const load = async () => {
      try {
        const [{data: w}, {data: t}] = await Promise.all([
          api.get('/api/user/wallet'),
          api.get('/api/user/trades')
        ])
        setWallet(w)
        setTrades(t)
      } catch {}
    }
    load()
  },[])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card ascii-border lg:col-span-2">
          <div className="card-header"><h3 className="card-title">PORTFOLIO</h3><span className="badge-green">LIVE</span></div>
          {!wallet ? 'Loading…' : (
            <div className="ascii-grid">
              {Object.entries(wallet.balances || {}).map(([k,v]) => (
                <div key={k} className="ascii-panel p-3">
                  <div className="text-sm text-green-300/70">{k}</div>
                  <div className="text-lg text-neon-matrix">{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card ascii-border">
          <div className="card-header"><h3 className="card-title">STATS</h3><span className="badge-green">SIM</span></div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Equity</span><span>{wallet? formatCurrency(wallet.equity) : '—'}</span></div>
            <div className="flex justify-between"><span>PnL 24h</span><span className={wallet && wallet.pnl24h>=0? 'price-up':'price-down'}>{wallet? wallet.pnl24h.toFixed(2)+'%':'—'}</span></div>
            <div className="flex justify-between"><span>Mkt Exposure</span><span>{wallet? wallet.exposure+'%':'—'}</span></div>
          </div>
        </div>
      </div>

      <div className="card ascii-border">
        <div className="card-header"><h3 className="card-title">RECENT TRADES</h3><span className="badge-green">HISTORY</span></div>
        {!trades?.length ? 'No trades' : (
          <table className="table">
            <thead><tr><th>TIME</th><th>PAIR</th><th>SIDE</th><th>PRICE</th><th>AMOUNT</th></tr></thead>
            <tbody>
              {trades.map((t,i)=> (
                <tr key={i}>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.pair}</td>
                  <td className={t.side==='buy'?'price-up':'price-down'}>{t.side.toUpperCase()}</td>
                  <td>{formatCurrency(t.price)}</td>
                  <td>{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


# frontend/src/pages/TradingPage.jsx
import OrderForm from '../components/trading/OrderForm.jsx'
import OrderBook from '../components/trading/OrderBook.jsx'
import PriceChart from '../components/trading/PriceChart.jsx'

export default function TradingPage(){
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <PriceChart />
          <OrderBook />
        </div>
        <div>
          <OrderForm />
        </div>
      </div>
    </div>
  )
}


# frontend/src/pages/WalletPage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api.js'

export default function WalletPage(){
  const [data, setData] = useState(null)
  useEffect(()=>{
    const load = async()=> {
      try { const {data} = await api.get('/api/user/wallet'); setData(data) } catch {}
    }
    load()
  },[])

  return (
    <div className="max-w-5xl mx-auto card ascii-border">
      <div className="card-header"><h3 className="card-title">WALLET</h3><span className="badge-green">/api/user/wallet</span></div>
      {!data ? 'Loading…' : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="ascii-panel p-4">
            <div className="text-green-300/80 mb-2">Balances</div>
            <div className="space-y-1 text-sm">
              {Object.entries(data.balances || {}).map(([k,v])=> (
                <div key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
          <div className="ascii-panel p-4">
            <div className="text-green-300/80 mb-2">Deposit / Withdraw (simulation)</div>
            <div className="text-sm text-green-300/70">Generate addresses and update balances in backend as needed.</div>
          </div>
        </div>
      )}
    </div>
  )
}


# frontend/src/pages/AccountPage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api.js'

export default function AccountPage(){
  const [user, setUser] = useState(null)
  useEffect(()=>{
    const load = async()=> {
      try { const {data} = await api.get('/api/user/profile'); setUser(data) } catch {}
    }
    load()
  },[])

  return (
    <div className="max-w-3xl mx-auto card ascii-border">
      <div className="card-header"><h3 className="card-title">ACCOUNT</h3><span className="badge-green">PROFILE</span></div>
      {!user ? 'Loading…' : (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-green-300/70">ID</div>
            <div>{user.id}</div>
          </div>
          <div>
            <div className="text-green-300/70">Email</div>
            <div>{user.email}</div>
          </div>
          <div>
            <div className="text-green-300/70">Name</div>
            <div>{user.firstName} {user.lastName}</div>
          </div>
          <div>
            <div className="text-green-300/70">Created</div>
            <div>{new Date(user.createdAt).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  )
}


# frontend/src/services/api.js
import axios from 'axios'
import { API_BASE_URL } from '../utils/constants.js'
import { authService } from './auth.js'

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api


# frontend/src/services/auth.js
import api from './api.js'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/api/auth/login', credentials)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  },
  register: async (userData) => {
    const { data } = await api.post('/api/auth/register', userData)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  },
  logout: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) },
  getCurrentUser: () => { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } },
  getToken: () => localStorage.getItem(TOKEN_KEY),
  isAuthenticated: () => Boolean(localStorage.getItem(TOKEN_KEY))
}


# frontend/src/services/websocket.js
// Mock realtime ticker stream using setInterval; initial tickers merged from backend /api/markets by subscriber
const defaultPairs = [
  'BTC/USD','ETH/USD','SOL/USD','BNB/USD','XRP/USD','ADA/USD','DOGE/USD','DOT/USD','AVAX/USD','ARB/USD','TON/USD'
]

let state = Object.fromEntries(defaultPairs.map(p => [p, { price: 100 + Math.random()*50000, change: '+0.00%' }]))
let subs = new Set()

function tick(){
  Object.keys(state).forEach(pair => {
    const p = state[pair].price
    const drift = (Math.random()-0.5) * (p*0.002)
    const np = Math.max(0.0001, p + drift)
    const ch = ((np - p) / p * 100)
    state[pair] = { price: np, change: `${ch>=0?'+':''}${ch.toFixed(2)}%` }
  })
  subs.forEach(cb => cb(state))
}

setInterval(tick, 1200)

export function primeTickersFromBackend(list){
  // list: [{pair, price, change}]
  list.forEach(({pair, price, change})=>{ state[pair] = { price, change } })
}

export function subscribeTickers(cb){
  subs.add(cb)
  cb(state)
  return () => subs.delete(cb)
}


# frontend/src/utils/constants.js
export const API_BASE_URL = '' // empty because Vite proxy forwards /api to http://localhost:3000
export const COLORS = {
  up: '#00ff41',
  down: '#ff4d4d',
  accentOrange: '#ff6b35',
  accentGold: '#f7931a'
}


# frontend/src/utils/helpers.js
import { subscribeTickers as _subscribe, primeTickersFromBackend } from '../services/websocket.js'

export function formatCurrency(n){
  if (n == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(n))
}

export function formatPct(s){
  if (typeof s === 'number') return `${s>=0?'+':''}${s.toFixed(2)}%`
  return s
}

export function subscribeTickers(cb){
  return _subscribe(cb)
}

export function generateOrderBook(center=45000){
  const rand = (min,max) => Math.random()*(max-min)+min
  const bids = Array.from({length: 16}, () => ({ price: center - rand(0, 150), amount: rand(0.01, 0.8) }))
  const asks = Array.from({length: 16}, () => ({ price: center + rand(0, 150), amount: rand(0.01, 0.8) }))
  bids.sort((a,b)=> b.price-a.price)
  asks.sort((a,b)=> a.price-b.price)
  return { bids, asks }
}

