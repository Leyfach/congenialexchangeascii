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