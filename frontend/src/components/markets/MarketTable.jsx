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