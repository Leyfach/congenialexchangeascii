import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import { generateOrderBook } from '../../utils/helpers.js'
import { useMarket } from '../../contexts/MarketContext'
import tradingWebSocket from '../../services/websocket-trading.js'

export default function OrderBook({ compact=false, pair = 'BTC/USD' }) {
  const [book, setBook] = useState({ bids: [], asks: [] })
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const { getCurrentPrice } = useMarket()

  useEffect(() => {
    // Initial fetch
    fetchOrderBook()
    
    // Subscribe to WebSocket updates
    const unsubscribe = tradingWebSocket.on('orderbook', (message) => {
      if (message.pair === pair) {
        setBook(message.data)
        setIsLive(true)
        setLoading(false)
      }
    })
    
    // Subscribe to orderbook updates for this pair
    tradingWebSocket.subscribe('orderbook', pair)
    
    // Fallback polling if WebSocket fails
    const pollInterval = setInterval(() => {
      if (!isLive) {
        fetchOrderBook()
      }
    }, 3000)
    
    return () => {
      unsubscribe()
      tradingWebSocket.unsubscribe('orderbook', pair)
      clearInterval(pollInterval)
    }
  }, [pair, isLive])

  const fetchOrderBook = async () => {
    try {
      // Try new trading API first
      const encodedPair = encodeURIComponent(pair)
      const response = await api.get(`/api/trading/orderbook/${encodedPair}`)
      
      if (response.data && (response.data.bids.length > 0 || response.data.asks.length > 0)) {
        setBook(response.data)
        setLoading(false)
        return
      }
      
      // Fallback to old mock orderbook
      const fallbackResponse = await api.get(`/api/markets/${encodedPair}/orderbook`)
      setBook(fallbackResponse.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching order book:', error)
      // Final fallback to generated data with current market price
      setBook(generateOrderBook(getCurrentPrice(pair)))
      setLoading(false)
    }
  }

  return (
    <div className="card ascii-border">
      <div className="card-header">
        <h3 className="card-title">ORDER_BOOK ▷ {pair}</h3>
        <span className={`badge-${loading ? 'yellow' : isLive ? 'green' : 'blue'}`}>
          {loading ? 'LOADING' : isLive ? 'LIVE' : 'POLLING'}
        </span>
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