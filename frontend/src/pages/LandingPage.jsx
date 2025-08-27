// pages/LandingPage.jsx
import MarketTable from '../components/markets/MarketTable.jsx'
import { Link } from 'react-router-dom'

export default function LandingPage(){
  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* HERO */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* LEFT: headline + atmosphere */}
        <div className="card ascii-border flex flex-col justify-between">
          <div className="space-y-5">
            <h1 className="ascii-title">
              ENTER THE MATRIX TERMINAL<span className="cursor ml-2" />
            </h1>
            <p className="ascii-sub">
              Clean interface. Speed, that you can feel.
            </p>

            {/* ambient labels */}
            <div className="flex flex-wrap gap-2 pt-2">
  {['SPOT', 'MARGIN', 'ADVANCED'].map(tag => (
    <Link
      key={tag}
      to="/trading"
      className={[
        'relative px-3 py-1 rounded-sm',
        'text-green-300 border border-green-500/40',
        'transition-[box-shadow,transform,opacity] duration-300 ease-out',
        'hover:shadow-[0_0_18px_#22c55e] hover:text-neon-matrix'
      ].join(' ')}
    >
      <span className="absolute inset-0 bg-green-500/10 opacity-0 hover:opacity-20 transition-opacity duration-300" />
      <span className="relative tracking-widest">{tag}</span>
    </Link>
  ))}
</div>

            <div className="ascii-hr" />

            {/* terminal feed */}
            <pre className="text-xs text-green-300/80 whitespace-pre-wrap leading-6">
{`> boot sequence… OK
> entropy source: hardware rng
> link: secure tunnel established
> ui-mode: minimal
> status: ONLINE`}
            </pre>
          </div>
        </div>

        {/* RIGHT: logo + live status blocks */}
        <div className="card ascii-border">
          <div className="flex items-center justify-center mb-6">
            <h2 className="ascii-title text-5xl tracking-[0.35em] text-green-400">
              MATRIX<span className="text-green-600">EX</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="ascii-panel p-4 glow">
              <div className="text-neon-matrix text-sm tracking-widest">STATUS</div>
              <div className="mt-2 text-green-300/90">ONLINE</div>
            </div>
            <div className="ascii-panel p-4">
              <div className="text-neon-matrix text-sm tracking-widest">LATENCY</div>
              <div className="mt-2 text-green-300/90">~12 ms</div>
            </div>
            <div className="ascii-panel p-4">
              <div className="text-neon-matrix text-sm tracking-widest">UPTIME</div>
              <div className="mt-2 text-green-300/90">99.99%</div>
            </div>
          </div>

          <div className="ascii-hr" />

          {/* pulse banner */}
          <div
            className={[
              'relative overflow-hidden rounded-md border border-green-500/30',
              'px-4 py-3 text-green-200'
            ].join(' ')}
          >
            <span className="absolute inset-0 bg-green-500/10 opacity-0 animate-pulse" />
            <div className="relative tracking-widest">
              SESSION KEY VERIFIED • CHANNEL ENCRYPTED • READY
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { t: 'TERMINAL-FIRST', s: 'Machine AI, focus on action.' },
          { t: 'REAL-TIME FLOW', s: 'Updates with minimal noise and latency.' },
          { t: 'RISK CONTROLS', s: 'Clean limits, stops and deposit encryption.' }
        ].map(({ t, s }) => (
          <div key={t} className="ascii-panel p-4">
            <div className="text-neon-matrix tracking-widest">{t}</div>
            <div className="text-green-300/80 text-sm mt-1">{s}</div>
          </div>
        ))}
      </section>

      {/* MARKETS */}
      <section>
        <MarketTable />
      </section>
    </div>
  )
}
