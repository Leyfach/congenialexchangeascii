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