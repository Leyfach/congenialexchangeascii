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