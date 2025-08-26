import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import { generateOrderBook } from '../../utils/helpers.js'

export default function OrderBook({ compact=false, pair = 'BTC/USD' }) {
  const [book, setBook] = useState({ bids: [], asks: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderBook()
    const id = setInterval(fetchOrderBook, 2000) // Refresh every 2 seconds
    return () => clearInterval(id)
  }, [pair])

  const fetchOrderBook = async () => {
    try {
      // URL encode the pair to handle slashes properly
      const encodedPair = encodeURIComponent(pair)
      const { data } = await api.get(`/api/markets/${encodedPair}/orderbook`)
      setBook(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching order book:', error)
      // Fallback to generated data
      setBook(generateOrderBook())
      setLoading(false)
    }
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">ORDER_BOOK ▷ {pair}</h3>
        <span className="badge-green">{loading ? 'LOADING' : 'LIVE'}</span>
      </div>
      <div className={`grid ${compact? 'grid-cols-1':'grid-cols-2'} gap-4`}>
        <div className="col-bids p-3 rounded border border-green-500/20">
          <div className="text-green-300/80 mb-1">BIDS</div>
          <div className="space-y-1">
            {book.bids.map((b,i)=> (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-neon-matrix">{b.price?.toFixed(2) || '0.00'}</span>
                <span className="text-green-300/80">{(b.amount || b.quantity || 0).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-asks p-3 rounded border border-accent-orange/20">
          <div className="text-accent-orange mb-1">ASKS</div>
          <div className="space-y-1">
            {book.asks.map((a,i)=> (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-accent-gold">{a.price?.toFixed(2) || '0.00'}</span>
                <span className="text-green-300/80">{(a.amount || a.quantity || 0).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}