import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { authService } from '../../services/auth.js'

export default function OrderForm({ pair = 'BTC/USD', onPairChange }) {
  const [form, setForm] = useState({ pair, type: 'limit', side: 'buy', amount: '', price: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState({})
  const [markets, setMarkets] = useState([])
  const [currentPrice, setCurrentPrice] = useState(0)
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Fetch wallet balances and market data
  useEffect(() => {
    const initializeData = async () => {
      fetchMarkets()
      fetchOrderBook()
      if (authService.isAuthenticated()) {
        fetchWalletBalances()
      }
    }
    initializeData()
  }, [])

  // Update price when pair changes
  useEffect(() => {
    fetchOrderBook()
    const market = markets.find(m => m.pair === form.pair)
    if (market) {
      setCurrentPrice(market.price)
    }
  }, [form.pair, markets])

  // Refresh order book when side changes to update market price
  useEffect(() => {
    if (form.type === 'market') {
      fetchOrderBook()
    }
  }, [form.side])

  // Calculate market price based on order book and order side
  const getMarketPrice = () => {
    if (form.side === 'buy' && orderBook.asks && orderBook.asks.length > 0) {
      // For buy orders, use the lowest ask price
      return orderBook.asks[0].price
    } else if (form.side === 'sell' && orderBook.bids && orderBook.bids.length > 0) {
      // For sell orders, use the highest bid price
      return orderBook.bids[0].price
    }
    // Fallback to market price
    return currentPrice
  }

  const fetchWalletBalances = async () => {
    try {
      const { data } = await api.get('/api/user/wallet')
      setWallets(data.balances || {})
    } catch (error) {
      console.error('Error fetching wallet balances:', error)
    }
  }

  const fetchMarkets = async () => {
    try {
      const { data } = await api.get('/api/markets')
      setMarkets(data)
    } catch (error) {
      console.error('Error fetching markets:', error)
    }
  }

  const fetchOrderBook = async () => {
    try {
      const encodedPair = encodeURIComponent(form.pair)
      const { data } = await api.get(`/api/markets/${encodedPair}/orderbook`)
      setOrderBook(data)
    } catch (error) {
      console.error('Error fetching order book:', error)
      setOrderBook({ bids: [], asks: [] })
    }
  }

  const validateOrder = () => {
    const [base, quote] = form.pair.split('/')
    const amount = parseFloat(form.amount)
    const price = form.type === 'market' ? getMarketPrice() : parseFloat(form.price)
    
    if (!amount || amount <= 0) {
      setStatus('❌ Invalid amount')
      return false
    }
    
    // For limit orders, validate price
    if (form.type === 'limit' && (!form.price || parseFloat(form.price) <= 0)) {
      setStatus('❌ Invalid price for limit order')
      return false
    }

    // For market orders, use current market price
    if (form.type === 'market' && !price) {
      setStatus('❌ Market price not available')
      return false
    }

    // Check balance based on order side
    if (form.side === 'buy') {
      const requiredBalance = amount * price
      const quoteBalance = wallets[quote] || 0
      if (quoteBalance < requiredBalance) {
        setStatus(`❌ Insufficient ${quote} balance (need ${requiredBalance.toFixed(2)}, have ${quoteBalance.toFixed(2)})`)
        return false
      }
    } else {
      const baseBalance = wallets[base] || 0
      if (baseBalance < amount) {
        setStatus(`❌ Insufficient ${base} balance (need ${amount}, have ${baseBalance})`)
        return false
      }
    }

    return true
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setStatus('')
    
    // Validate order before submitting
    if (!validateOrder()) {
      setLoading(false)
      return
    }
    
    try {
      const orderData = {
        pair: form.pair,
        side: form.side,
        quantity: parseFloat(form.amount),
        type: form.type
      }

      // For limit orders, include price. For market orders, use order book price
      if (form.type === 'limit') {
        orderData.price = parseFloat(form.price)
      } else {
        orderData.price = getMarketPrice()
      }

      const { data } = await api.post('/api/orders', orderData)
      
      const tradesText = data.tradesExecuted > 0 ? ` (${data.tradesExecuted} trades executed)` : ''
      setStatus(`✅ ORDER ACCEPTED #${data.order?.id || data?.id || '—'}${tradesText}`)
      
      // Clear form
      if (form.type === 'limit') {
        setForm({ ...form, amount: '', price: '' })
      } else {
        setForm({ ...form, amount: '' }) // Don't clear price for limit orders
      }
      
      // Refresh wallet balances after successful order
      fetchWalletBalances() // Immediate refresh
      setTimeout(fetchWalletBalances, 500) // Additional refresh after 0.5s
      setTimeout(fetchWalletBalances, 1500) // Final refresh after 1.5s
    } catch (e) {
      setStatus(`❌ ORDER REJECTED: ${e.response?.data?.error || 'Unknown error'}`)
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
          <select className="ascii-input" value={form.pair} onChange={e=>{
            setField('pair', e.target.value)
            onPairChange?.(e.target.value)
          }}>
            {markets.map(market => (
              <option key={market.pair} value={market.pair}>
                {market.pair} (${market.price?.toFixed(2)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-green-300">amount</label>
          <input className="ascii-input" value={form.amount} onChange={e=>setField('amount', e.target.value)} placeholder="0.00" />
        </div>
        {form.type === 'limit' ? (
          <div>
            <label className="text-xs text-green-300">price</label>
            <input className="ascii-input" value={form.price} onChange={e=>setField('price', e.target.value)} placeholder="0.00" />
          </div>
        ) : (
          <div>
            <label className="text-xs text-green-300">market price ({form.side === 'buy' ? 'best ask' : 'best bid'})</label>
            <div className="ascii-input bg-gray-800/50 text-green-300/70">
              {getMarketPrice() ? `$${getMarketPrice().toFixed(2)}` : 'Loading...'}
            </div>
          </div>
        )}
        <button className="ascii-btn col-span-2 py-2 glow" disabled={loading}>{loading?'SENDING…':'PLACE ORDER'}</button>
        
        {/* Wallet Balance Display */}
        {Object.keys(wallets).length > 0 && (
          <div className="col-span-2 pt-2 border-t border-green-500/30 mt-2">
            <div className="text-xs text-green-300/70 mb-1">WALLET BALANCE</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(wallets).map(([currency, balance]) => (
                <div key={currency} className="text-xs">
                  <span className="text-green-300">{currency}:</span> 
                  <span className="text-neon-matrix ml-1">{parseFloat(balance).toFixed(6)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {status && <div className="col-span-2 text-sm text-green-300/80 mt-2">{status}</div>}
      </form>
    </div>
  )
}